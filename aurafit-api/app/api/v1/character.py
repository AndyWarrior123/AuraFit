from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from app.core.dependencies import get_db, get_active_profile_user
from app.schemas.character import (
    CharacterStatsRead,
    CharacterSheetRead,
    AttributeBreakdown,
    AttributeDetail,
    LifetimeStatsRead,
)
from app.services.activity_service import recalculate_character_stats
from app.services.character_engine import xp_to_next_level
from app.models.character_stats import CharacterStats
from app.models.activity_log import ActivityLog
from app.models.user import User, CharacterClass

router = APIRouter()


def _build_attribute_breakdown(stats: CharacterStats) -> AttributeBreakdown:
    return AttributeBreakdown(
        strength=AttributeDetail(score=stats.strength, label="Strength",
                                  driven_by="Resistance training volume"),
        endurance=AttributeDetail(score=stats.endurance, label="Endurance",
                                   driven_by="Cardio duration and distance"),
        vitality=AttributeDetail(score=stats.vitality, label="Vitality",
                                  driven_by="Sleep quality and duration"),
        agility=AttributeDetail(score=stats.agility, label="Agility",
                                 driven_by="Daily steps and active minutes"),
        recovery=AttributeDetail(score=stats.recovery, label="Recovery",
                                  driven_by="Resting HR and sleep stages"),
        discipline=AttributeDetail(score=stats.discipline, label="Discipline",
                                    driven_by="Consecutive day streak"),
    )


async def _get_latest_stats(db: AsyncSession, user_id: str) -> CharacterStats | None:
    result = await db.execute(
        select(CharacterStats)
        .where(CharacterStats.user_id == user_id)
        .order_by(CharacterStats.stat_date.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


@router.get("/stats", response_model=CharacterStatsRead)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_active_profile_user),
) -> CharacterStatsRead:
    stats = await _get_latest_stats(db, current_user.id)
    if not stats:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="No character stats yet — log an activity first")
    return CharacterStatsRead.model_validate(
        {**stats.__dict__,
         "xp_to_next_level": xp_to_next_level(stats.cumulative_xp),
         "character_class": current_user.character_class}
    )


@router.get("/sheet", response_model=CharacterSheetRead)
async def get_character_sheet(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_active_profile_user),
) -> CharacterSheetRead:
    stats = await _get_latest_stats(db, current_user.id)
    if not stats:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="No character stats yet — log an activity first")
    stats_read = CharacterStatsRead.model_validate(
        {**stats.__dict__,
         "xp_to_next_level": xp_to_next_level(stats.cumulative_xp),
         "character_class": current_user.character_class}
    )
    return CharacterSheetRead(
        stats=stats_read,
        attributes=_build_attribute_breakdown(stats),
    )


@router.post("/recalculate", response_model=CharacterStatsRead)
async def force_recalculate(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_active_profile_user),
) -> CharacterStatsRead:
    stats = await recalculate_character_stats(db, current_user, date.today())
    return CharacterStatsRead.model_validate(
        {**stats.__dict__,
         "xp_to_next_level": xp_to_next_level(stats.cumulative_xp),
         "character_class": current_user.character_class}
    )


@router.get("/lifetime", response_model=LifetimeStatsRead)
async def get_lifetime_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_active_profile_user),
) -> LifetimeStatsRead:
    result = await db.execute(
        select(
            func.coalesce(func.sum(CharacterStats.total_steps), 0).label("total_steps"),
            func.coalesce(func.sum(CharacterStats.total_active_minutes), 0).label("total_active_minutes"),
            func.coalesce(func.sum(CharacterStats.total_calories_burned), 0).label("total_calories_burned"),
            func.coalesce(func.sum(CharacterStats.total_water_ml), 0).label("total_water_ml"),
            func.coalesce(func.sum(CharacterStats.sleep_minutes), 0).label("sleep_minutes"),
            func.count(CharacterStats.id).label("days_logged"),
        ).where(CharacterStats.user_id == current_user.id)
    )
    row = result.one()
    return LifetimeStatsRead(
        total_steps=row.total_steps,
        total_active_minutes=row.total_active_minutes,
        total_calories_burned=row.total_calories_burned,
        total_water_ml=row.total_water_ml,
        sleep_hours=round(row.sleep_minutes / 60, 1),
        days_logged=row.days_logged,
    )


@router.post("/reset")
async def reset_character(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_active_profile_user),
) -> dict:
    await db.execute(delete(CharacterStats).where(CharacterStats.user_id == current_user.id))
    await db.execute(delete(ActivityLog).where(ActivityLog.user_id == current_user.id))
    current_user.total_xp = 0
    current_user.current_level = 1
    current_user.character_class = CharacterClass("NOVICE")
    db.add(current_user)
    await db.commit()
    return {"status": "reset"}