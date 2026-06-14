import dataclasses
from datetime import date, datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.activity_log import ActivityLog, ExerciseType, ActivitySource
from app.models.character_stats import CharacterStats
from app.models.user import User, CharacterClass
from app.schemas.activity import ActivityLogCreate, ActivityLogRead, DailySummaryRead
from app.schemas.character import CharacterStatsRead
from app.services.character_engine import (
    DailyHealthTotals,
    calculate_attributes,
    calculate_daily_xp,
    current_level_from_xp,
    xp_to_next_level,
    assign_character_class,
)
from app.services.met_engine import calories_from_met
import structlog

log = structlog.get_logger()


class DuplicateActivityError(Exception):
    pass


_CARDIO_TYPES = {
    ExerciseType.RUN, ExerciseType.CYCLE, ExerciseType.SWIM,
    ExerciseType.HIKE, ExerciseType.HIIT, ExerciseType.WALK,
}

# Used to estimate duration when only distance is provided (minutes per km).
_PACE_MIN_PER_KM: dict[ExerciseType, float] = {
    ExerciseType.RUN: 6.0,
    ExerciseType.WALK: 12.0,
    ExerciseType.HIKE: 15.0,
    ExerciseType.CYCLE: 3.0,
    ExerciseType.SWIM: 4.0,
}

# Step length as a fraction of height (single foot contact).
# Walking/Hike: clinical gait analysis (Lindemann et al., J Biomechanics); ratio ≈ 0.413
# Running: biomechanical studies (Journal of Physiological Anthropology); ratio ≈ 0.52
_STEP_LENGTH_RATIO: dict[ExerciseType, float] = {
    ExerciseType.WALK: 0.413,
    ExerciseType.HIKE: 0.413,
    ExerciseType.RUN: 0.520,
}


def _entry_xp(data: ActivityLogCreate) -> int:
    """Quick per-entry XP for immediate feedback on the log card."""
    xp = 0
    if data.duration_minutes:
        xp += int(data.duration_minutes * 2)
    if data.distance_km:
        xp += int(data.distance_km * 15)
    if data.weight_lifted_kg and data.reps_count and data.sets_count:
        xp += int((data.weight_lifted_kg * data.reps_count * data.sets_count) / 100) * 10
    if data.steps_count:
        xp += int(data.steps_count / 1000) * 5
    if data.water_ml and data.water_ml >= 500:
        xp += 20
    if data.sleep_duration_minutes and data.sleep_duration_minutes >= 360:
        xp += 50
    return min(xp, 200)


def _aggregate_logs(logs: list[ActivityLog]) -> DailyHealthTotals:
    steps = sum(log.steps_count or 0 for log in logs)
    active_minutes = sum(
        log.duration_minutes or 0 for log in logs if log.exercise_type is not None
    )
    calories_burned = sum(log.calories_burned or 0 for log in logs)
    water_ml = sum(log.water_ml or 0 for log in logs)
    lift_volume = sum(
        (log.weight_lifted_kg or 0) * (log.reps_count or 1) * (log.sets_count or 1)
        for log in logs
        if log.exercise_type == ExerciseType.LIFT and log.weight_lifted_kg
    )
    cardio_minutes = sum(
        log.duration_minutes or 0 for log in logs if log.exercise_type in _CARDIO_TYPES
    )
    cardio_km = sum(
        log.distance_km or 0 for log in logs if log.exercise_type in _CARDIO_TYPES
    )
    sleep_minutes = sum(log.sleep_duration_minutes or 0 for log in logs)
    sleep_scores = [log.sleep_quality_score for log in logs if log.sleep_quality_score]
    sleep_quality = sum(sleep_scores) / len(sleep_scores) if sleep_scores else 0.0
    hr_readings = [log.heart_rate_bpm for log in logs if log.heart_rate_bpm]
    resting_hr = min(hr_readings) if hr_readings else None

    return DailyHealthTotals(
        steps=int(steps),
        active_minutes=int(active_minutes),
        calories_burned=int(calories_burned),
        lift_volume_kg=lift_volume,
        cardio_minutes=int(cardio_minutes),
        cardio_km=float(cardio_km),
        sleep_minutes=int(sleep_minutes),
        sleep_quality_score=sleep_quality,
        resting_hr=resting_hr,
        water_ml=int(water_ml),
        streak_days=0,
    )


async def create_activity_log(
    db: AsyncSession,
    user: User,
    data: ActivityLogCreate,
) -> ActivityLog:
    # Spam guard: reject manual logs that duplicate an identical entry within 5 minutes.
    if data.source == ActivitySource.MANUAL and data.exercise_type and data.duration_minutes:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)
        dupe_result = await db.execute(
            select(ActivityLog)
            .where(ActivityLog.user_id == user.id)
            .where(ActivityLog.exercise_type == data.exercise_type)
            .where(ActivityLog.source == ActivitySource.MANUAL)
            .where(ActivityLog.logged_at >= cutoff)
            .where(func.abs(ActivityLog.duration_minutes - data.duration_minutes) < 1)
        )
        if dupe_result.scalar_one_or_none():
            raise DuplicateActivityError(
                f"An identical {data.exercise_type.value} entry was already logged within the last 5 minutes."
            )

    # If distance is given but duration is missing, estimate from typical pace so
    # calorie calculation has something to work with.
    effective_duration = data.duration_minutes
    if effective_duration is None and data.distance_km and data.exercise_type in _PACE_MIN_PER_KM:
        effective_duration = round(data.distance_km * _PACE_MIN_PER_KM[data.exercise_type], 1)
        log.info(
            "activity.duration_estimated",
            exercise_type=data.exercise_type.value,
            distance_km=data.distance_km,
            estimated_minutes=effective_duration,
        )

    # Estimate step count from distance + user height when not explicitly provided.
    # Uses biomechanically validated step-length-to-height ratios (walking 0.413, running 0.52).
    effective_steps = data.steps_count
    if (
        effective_steps is None
        and data.distance_km
        and data.exercise_type in _STEP_LENGTH_RATIO
        and user.height_cm
    ):
        step_length_m = (user.height_cm / 100) * _STEP_LENGTH_RATIO[data.exercise_type]
        effective_steps = round((data.distance_km * 1000) / step_length_m)
        log.info(
            "activity.steps_estimated",
            exercise_type=data.exercise_type.value,
            distance_km=data.distance_km,
            height_cm=user.height_cm,
            estimated_steps=effective_steps,
        )

    xp = _entry_xp(data)

    # Auto-calculate calories using effective duration (original or estimated).
    calories = data.calories_burned
    if calories is None and data.exercise_type and effective_duration and user.weight_kg:
        calories = calories_from_met(data.exercise_type.value, effective_duration, user.weight_kg)

    log_entry = ActivityLog(
        user_id=user.id,
        log_date=data.log_date,
        logged_at=data.logged_at,
        source=data.source,
        exercise_type=data.exercise_type,
        duration_minutes=effective_duration,
        distance_km=data.distance_km,
        calories_burned=calories,
        reps_count=data.reps_count,
        sets_count=data.sets_count,
        weight_lifted_kg=data.weight_lifted_kg,
        heart_rate_bpm=data.heart_rate_bpm,
        heart_rate_zone=data.heart_rate_zone,
        water_ml=data.water_ml,
        calories_consumed=data.calories_consumed,
        meal_description=data.meal_description,
        sleep_duration_minutes=data.sleep_duration_minutes,
        sleep_quality_score=data.sleep_quality_score,
        hc_record_id=data.hc_record_id,
        steps_count=effective_steps,
        xp_awarded=xp,
        raw_transcript=data.raw_transcript,
    )
    db.add(log_entry)
    await db.flush()

    await recalculate_character_stats(db, user, data.log_date)
    log.info("activity.logged", user_id=user.id, source=data.source, xp=xp)
    return log_entry


async def get_today_summary(
    db: AsyncSession,
    user_id: str,
    today: date,
) -> DailySummaryRead:
    result = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.user_id == user_id)
        .where(ActivityLog.log_date == today)
        .order_by(ActivityLog.logged_at.desc())
    )
    logs = list(result.scalars().all())
    totals = _aggregate_logs(logs)

    return DailySummaryRead(
        summary_date=today,
        total_steps=totals.steps,
        total_active_minutes=totals.active_minutes,
        total_calories_burned=totals.calories_burned,
        total_water_ml=totals.water_ml,
        sleep_minutes=totals.sleep_minutes,
        xp_earned_today=sum(log.xp_awarded for log in logs),
        activity_count=len(logs),
        logs=[ActivityLogRead.model_validate(lg) for lg in logs],
    )


async def get_activity_history(
    db: AsyncSession,
    user_id: str,
    page: int,
    page_size: int,
) -> list[ActivityLogRead]:
    offset = (page - 1) * page_size
    result = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.user_id == user_id)
        .order_by(ActivityLog.logged_at.desc())
        .limit(page_size)
        .offset(offset)
    )
    return [ActivityLogRead.model_validate(lg) for lg in result.scalars().all()]


async def recalculate_character_stats(
    db: AsyncSession,
    user: User,
    for_date: date,
) -> CharacterStats:
    result = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.user_id == user.id)
        .where(ActivityLog.log_date == for_date)
    )
    logs = list(result.scalars().all())
    totals = _aggregate_logs(logs)

    # Streak
    yesterday = for_date - timedelta(days=1)
    prev_result = await db.execute(
        select(CharacterStats)
        .where(CharacterStats.user_id == user.id)
        .where(CharacterStats.stat_date == yesterday)
    )
    prev = prev_result.scalar_one_or_none()
    if prev is not None and (prev.total_steps > 0 or prev.total_active_minutes > 0):
        current_streak = prev.current_streak_days + 1
    else:
        current_streak = 1 if logs else 0
    longest_streak = max(current_streak, prev.longest_streak_days if prev else 0)
    totals = dataclasses.replace(totals, streak_days=current_streak)

    # Cumulative XP (sum of all days before today + today)
    xp_before_result = await db.execute(
        select(func.coalesce(func.sum(CharacterStats.daily_xp_earned), 0))
        .where(CharacterStats.user_id == user.id)
        .where(CharacterStats.stat_date < for_date)
    )
    xp_before: int = xp_before_result.scalar() or 0
    daily_xp = calculate_daily_xp(totals)
    cumulative_xp = xp_before + daily_xp
    level = current_level_from_xp(cumulative_xp)

    attribute_scores = calculate_attributes(totals)
    new_class = assign_character_class(attribute_scores, level)

    # Update user
    if for_date == date.today():
        user.total_xp = cumulative_xp
        user.current_level = level
        user.character_class = CharacterClass(new_class)
        db.add(user)

    # Upsert CharacterStats
    existing_result = await db.execute(
        select(CharacterStats)
        .where(CharacterStats.user_id == user.id)
        .where(CharacterStats.stat_date == for_date)
    )
    stats = existing_result.scalar_one_or_none()
    if stats is None:
        stats = CharacterStats(user_id=user.id, stat_date=for_date)
        db.add(stats)

    stats.strength = attribute_scores.strength
    stats.endurance = attribute_scores.endurance
    stats.vitality = attribute_scores.vitality
    stats.agility = attribute_scores.agility
    stats.recovery = attribute_scores.recovery
    stats.discipline = attribute_scores.discipline
    stats.daily_xp_earned = daily_xp
    stats.cumulative_xp = cumulative_xp
    stats.level_at_snapshot = level
    stats.total_steps = totals.steps
    stats.total_active_minutes = totals.active_minutes
    stats.total_calories_burned = totals.calories_burned
    stats.total_water_ml = totals.water_ml
    stats.avg_heart_rate_bpm = totals.resting_hr
    stats.sleep_minutes = totals.sleep_minutes
    stats.current_streak_days = current_streak
    stats.longest_streak_days = longest_streak

    await db.flush()
    return stats