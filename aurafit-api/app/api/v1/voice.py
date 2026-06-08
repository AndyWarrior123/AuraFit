from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db, get_active_profile_user
from app.schemas.activity import VoiceParseRequest, ActivityLogCreate, ActivityLogRead
from app.schemas.activity import ParsedActivityDto
from app.services.gemini_service import parse_activity_transcript
from app.services.activity_service import create_activity_log
from app.models.activity_log import ActivitySource, ExerciseType, HeartRateZone
from app.models.user import User

router = APIRouter()


@router.post("/parse", response_model=ActivityLogRead, status_code=status.HTTP_201_CREATED)
async def parse_and_log(
    body: VoiceParseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_active_profile_user),
) -> ActivityLogRead:
    parsed: ParsedActivityDto | None = await parse_activity_transcript(body.transcript)
    if not parsed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Gemini could not extract activity data from the transcript",
        )

    exercise_type = None
    if parsed.exercise_type:
        try:
            exercise_type = ExerciseType(parsed.exercise_type.upper())
        except ValueError:
            exercise_type = ExerciseType.OTHER

    log_create = ActivityLogCreate(
        log_date=body.log_date or date.today(),
        logged_at=datetime.now(timezone.utc),
        source=ActivitySource.VOICE,
        exercise_type=exercise_type,
        duration_minutes=parsed.duration_minutes,
        distance_km=parsed.distance_km,
        calories_burned=parsed.calories_burned,
        reps_count=parsed.reps_count,
        sets_count=parsed.sets_count,
        weight_lifted_kg=parsed.weight_lifted_kg,
        heart_rate_bpm=parsed.heart_rate_bpm,
        water_ml=parsed.water_ml,
        calories_consumed=parsed.calories_consumed,
        meal_description=parsed.meal_description,
        sleep_duration_minutes=(
            int(parsed.sleep_duration_minutes) if parsed.sleep_duration_minutes else None
        ),
        steps_count=parsed.steps_count,
        raw_transcript=body.transcript,
    )

    entry = await create_activity_log(db, current_user, log_create)
    return ActivityLogRead.model_validate(entry)