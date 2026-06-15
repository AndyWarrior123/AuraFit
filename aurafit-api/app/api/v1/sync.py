from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.dependencies import get_db, get_active_profile_user
from app.models.user import User
from app.models.passive_sync_log import PassiveSyncLog, DetectedActivity
from app.schemas.passive_sync import PassiveSyncPayload, PassiveSyncRead, _MAX_SPEED_KMH
import structlog

router = APIRouter()
log = structlog.get_logger()

_DEFAULT_WINDOW_MINUTES = 30.0


@router.post("/passive", response_model=PassiveSyncRead, status_code=status.HTTP_201_CREATED)
async def ingest_passive_sync(
    payload: PassiveSyncPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_active_profile_user),
) -> PassiveSyncRead:
    # Determine elapsed time since last sync to calculate implied speed
    last_result = await db.execute(
        select(PassiveSyncLog.timestamp)
        .where(PassiveSyncLog.user_id == current_user.id)
        .order_by(PassiveSyncLog.timestamp.desc())
        .limit(1)
    )
    last_ts = last_result.scalar_one_or_none()
    elapsed_minutes = (
        (payload.timestamp - last_ts).total_seconds() / 60
        if last_ts else _DEFAULT_WINDOW_MINUTES
    )
    elapsed_hours = max(elapsed_minutes / 60, 1 / 3600)

    # Discard packets that imply vehicle-speed movement
    speed_kmh = (payload.distance_meters / 1000) / elapsed_hours
    if speed_kmh > _MAX_SPEED_KMH and payload.detected_activity != DetectedActivity.STILL:
        log.warning(
            "passive_sync.anomaly_discarded",
            user_id=current_user.id,
            speed_kmh=round(speed_kmh, 1),
            detected_activity=payload.detected_activity,
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Payload implies {speed_kmh:.1f} km/h — likely a vehicle commute. Discarded."
            ),
        )

    entry = PassiveSyncLog(
        user_id=current_user.id,
        timestamp=payload.timestamp,
        steps_since_last_sync=payload.steps_since_last_sync,
        distance_meters=payload.distance_meters,
        detected_activity=payload.detected_activity,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    log.info(
        "passive_sync.ingested",
        user_id=current_user.id,
        steps=payload.steps_since_last_sync,
        distance_m=payload.distance_meters,
    )
    return PassiveSyncRead.model_validate(entry)
