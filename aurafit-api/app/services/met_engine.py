from app.utils.met_table import MET_TABLE


def calories_from_met(
    exercise_type: str,
    duration_minutes: float,
    weight_kg: float,
    intensity: str = "MODERATE",
) -> int:
    """Calories = MET × weight_kg × duration_hours"""
    key = f"{exercise_type.upper()}_{intensity}"
    met = MET_TABLE.get(key) or MET_TABLE.get(exercise_type.upper(), 4.0)
    return round(met * weight_kg * (duration_minutes / 60))


def heart_rate_zone(hr_bpm: int, age: int) -> str:
    pct = hr_bpm / (220 - age)
    if pct < 0.60:
        return "REST"
    if pct < 0.70:
        return "FAT_BURN"
    if pct < 0.85:
        return "CARDIO"
    return "PEAK"