from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.dependencies import get_db, get_active_profile_user
from app.schemas.activity import ActivityLogCreate, ActivityLogRead, DailySummaryRead
from app.services.activity_service import (
    create_activity_log,
    get_today_summary,
    get_activity_history,
)
from app.models.activity_log import ActivityLog, ActivitySource
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=ActivityLogRead, status_code=status.HTTP_201_CREATED)
async def log_activity(
    body: ActivityLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_active_profile_user),
) -> ActivityLogRead:
    entry = await create_activity_log(db, current_user, body)
    return ActivityLogRead.model_validate(entry)


@router.get("/today", response_model=DailySummaryRead)
async def get_today(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_active_profile_user),
) -> DailySummaryRead:
    return await get_today_summary(db, current_user.id, date.today())


@router.get("/history", response_model=list[ActivityLogRead])
async def get_history(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_active_profile_user),
) -> list[ActivityLogRead]:
    return await get_activity_history(db, current_user.id, page, page_size)


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity(
    activity_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_active_profile_user),
) -> None:
    result = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.id == activity_id)
        .where(ActivityLog.user_id == current_user.id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    await db.delete(entry)