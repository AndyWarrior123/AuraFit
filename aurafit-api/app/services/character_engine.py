import dataclasses
from dataclasses import dataclass
from functools import lru_cache

@dataclass
class DailyHealthTotals:
    steps: int = 0
    active_minutes: int = 0
    calories_burned: int = 0
    lift_volume_kg: float = 0.0
    cardio_minutes: int = 0
    cardio_km: float = 0.0
    sleep_minutes: int = 0
    sleep_quality_score: float = 0.0
    resting_hr: int | None = None
    water_ml: int = 0
    streak_days: int = 0

@dataclass
class AttributeScores:
    strength: float
    endurance: float
    vitality: float
    agility: float
    recovery: float
    discipline: float


def _scale(value: float, target: float) -> float:
    return min((value / target) * 100.0, 100.0) if target > 0 else 0.0

def calculate_attributes(totals: DailyHealthTotals) -> AttributeScores:
    strength = _scale(totals.lift_volume_kg, 2000.0)

    endurance = (
        _scale(totals.cardio_minutes, 30.0)*0.6
        + _scale(totals.cardio_km, 5.0)*0.4
    )
    vitality = (
        _scale(totals.sleep_minutes, 480.0)*0.6
        + _scale(totals.sleep_quality_score, 8.0)*0.4
    )

    agility = (
        _scale(totals.steps, 10_000)*0.7
        + _scale(totals.active_minutes, 60.0)*0.3
    )

    hr_score = _scale(max(0.0, 80 - (totals.resting_hr or 70)), 20.0)
    recovery = hr_score * 0.5 + _scale(totals.sleep_quality_score, 10.0) * 0.5

    discipline = _scale(totals.streak_days, 30.0)

    return AttributeScores(
        strength=round(strength, 1),
        endurance=round(endurance, 1),
        vitality=round(vitality, 1),
        agility=round(agility, 1),
        recovery=round(recovery, 1),
        discipline=round(discipline, 1),
    )

_XP_RATES: dict[str, float] = {
    "per_active_minute": 2.0,
    "per_km": 15.0,
    "per_100_lift_kg": 10.0,
    "per_1000_steps": 5.0,
    "hydration_bonus": 50.0,
    "sleep_bonus": 75.0,
    "streak_per_day": 5.0,
}

def calculate_daily_xp(totals: DailyHealthTotals) -> int:
    xp = 0.0
    xp += totals.active_minutes * _XP_RATES["per_active_minute"]
    xp += totals.cardio_km * _XP_RATES["per_km"]
    xp += (totals.lift_volume_kg / 100) * _XP_RATES["per_100_lift_kg"]
    xp += (totals.steps / 1000) * _XP_RATES["per_1000_steps"]
    if totals.water_ml >= 2000:
        xp += _XP_RATES["hydration_bonus"]
    if totals.sleep_minutes >= 420:
        xp += _XP_RATES["sleep_bonus"]
    xp += totals.streak_days * _XP_RATES["streak_per_day"]
    return int(xp)


@lru_cache(maxsize=None)
def _xp_limit_for_level(level: int) -> int:
    """XP needed within `level` to advance to the next level."""
    if level <= 1:
        return 100
    prev = _xp_limit_for_level(level - 1)
    return int(prev + (level * 5) * (prev / 100))


@lru_cache(maxsize=None)
def _xp_to_enter_level(level: int) -> int:
    """Cumulative XP required to enter `level` (0 for level 1)."""
    if level <= 1:
        return 0
    return _xp_to_enter_level(level - 1) + _xp_limit_for_level(level - 1)


def xp_required_for_level(level: int) -> int:
    """Cumulative XP at which you advance beyond `level`."""
    return _xp_to_enter_level(level + 1)


def current_level_from_xp(total_xp: int) -> int:
    level = 1
    while _xp_to_enter_level(level + 1) <= total_xp:
        level += 1
    return level


def xp_to_next_level(total_xp: int) -> int:
    level = current_level_from_xp(total_xp)
    return _xp_to_enter_level(level + 1) - total_xp


def assign_character_class(scores: AttributeScores, level: int) -> str:
    if level < 10:
        return "NOVICE"
    rankings = {
        "WARRIOR": scores.strength * 0.6 + scores.endurance * 0.4,
        "RANGER":  scores.agility * 0.6 + scores.endurance * 0.4,
        "MAGE":    scores.vitality * 0.5 + scores.recovery * 0.5,
    }
    return max(rankings, key=lambda k: rankings[k])