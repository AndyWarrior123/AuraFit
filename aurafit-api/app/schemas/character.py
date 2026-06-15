from datetime import date
from pydantic import BaseModel, ConfigDict, Field
from app.models.user import CharacterClass


class AttributeDetail(BaseModel):
    """Single RPG attribute with score, label, and driving metric description."""
    score: float = Field(..., ge=0.0, le=100.0)
    label: str
    driven_by: str


class AttributeBreakdown(BaseModel):
    strength: AttributeDetail
    endurance: AttributeDetail
    vitality: AttributeDetail
    agility: AttributeDetail
    recovery: AttributeDetail
    discipline: AttributeDetail


class CharacterStatsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    stat_date: date

    strength: float
    endurance: float
    vitality: float
    agility: float
    recovery: float
    discipline: float

    daily_xp_earned: int
    cumulative_xp: int
    level_at_snapshot: int
    xp_to_next_level: int

    total_steps: int
    total_active_minutes: int
    total_calories_burned: int
    total_water_ml: int
    avg_heart_rate_bpm: int | None
    sleep_minutes: int

    current_streak_days: int
    longest_streak_days: int
    character_class: CharacterClass


class CharacterSheetRead(BaseModel):
    """Full character sheet response — stats + attribute breakdown."""
    stats: CharacterStatsRead
    attributes: AttributeBreakdown


class LifetimeStatsRead(BaseModel):
    """Aggregated lifetime totals across all CharacterStats rows."""
    total_steps: int
    total_active_minutes: int
    total_calories_burned: int
    total_water_ml: int
    sleep_hours: float
    days_logged: int