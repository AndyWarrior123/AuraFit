from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.dependencies import get_db, get_active_profile_user
from app.schemas.character import (
    CharacterStatsRead,
    CharacterSheetRead,
    AttributeBreakdown,
    AttributeDetail,
)
from app.services.activity_service import recalculate_character_stats
from app.services.character_engine import xp_to_next_level
from app.models.character_stats import CharacterStats
from app.models.user import User

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