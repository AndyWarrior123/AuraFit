from datetime import date, datetime
from pydantic import BaseModel, Field, ConfigDict, model_validator
from app.models.activity_log import ActivitySource, ExerciseType, HeartRateZone

# Maximum realistic speeds per exercise type (km/h).
# Logs that exceed these are rejected before hitting the DB.
_MAX_SPEED_KMH: dict[str, float] = {
    "WALK": 10.0,
    "RUN": 30.0,
    "HIKE": 8.0,
    "CYCLE": 60.0,
    "SWIM": 5.0,
}

class ActivityLogCreate(BaseModel):
    log_date: date
    logged_at: datetime
    source: ActivitySource

    exercise_type: ExerciseType | None = None
    duration_minutes: float | None = Field(default=None, gt=0, lt=1440)
    distance_km: float | None = Field(default=None, gt=0)
    calories_burned: int | None = Field(default=None, gt=0)
    reps_count: int | None = Field(default=None, gt=0)
    sets_count: int | None = Field(default=None, gt=0)
    weight_lifted_kg: float | None = Field(default=None, gt=0)

    heart_rate_bpm: int | None = Field(default=None, gt=20, lt=300)
    heart_rate_zone: HeartRateZone | None = None

    water_ml: int | None = Field(default=None, gt=0, lt=10_000)
    calories_consumed: int | None = Field(default=None, gt=0)
    meal_description: str | None = Field(default=None, max_length=300)

    sleep_duration_minutes: int | None = Field(default=None, gt=0, lt=1440)
    sleep_quality_score: int | None = Field(default=None, ge=1, le=10)

    hc_record_id: str | None = None
    steps_count: int | None = Field(default=None, gt=0)
    raw_transcript: str | None = None

    @model_validator(mode="after")
    def validate_log(self) -> "ActivityLogCreate":
        tracked_fields = [
            self.exercise_type, self.water_ml, self.sleep_duration_minutes,
            self.steps_count, self.calories_consumed, self.heart_rate_bpm,
        ]
        if not any(f is not None for f in tracked_fields):
            raise ValueError("At least one health metric must be provided")

        # Velocity guardrail: reject physically impossible distance/duration combos.
        if (
            self.exercise_type is not None
            and self.distance_km is not None
            and self.duration_minutes is not None
        ):
            max_speed = _MAX_SPEED_KMH.get(self.exercise_type.value)
            if max_speed is not None:
                speed_kmh = self.distance_km / (self.duration_minutes / 60)
                if speed_kmh > max_speed:
                    raise ValueError(
                        f"Reported speed of {speed_kmh:.1f} km/h exceeds the maximum for "
                        f"{self.exercise_type.value} ({max_speed:.0f} km/h). "
                        "Check your distance or duration."
                    )

        return self
    
class ActivityLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    log_date: date
    logged_at: datetime
    source: ActivitySource
    exercise_type: ExerciseType | None
    duration_minutes: float | None
    distance_km: float | None
    calories_burned: int | None
    reps_count: int | None
    sets_count: int | None
    weight_lifted_kg: float | None
    heart_rate_bpm: int | None
    heart_rate_zone: HeartRateZone | None
    water_ml: int | None
    calories_consumed: int | None
    meal_description: str | None
    sleep_duration_minutes: int | None
    sleep_quality_score: int | None
    steps_count: int | None
    xp_awarded: int
    raw_transcript: str | None

class VoiceParseRequest(BaseModel):
    transcript: str = Field(..., min_length=3, max_length=1000)
    log_date: date | None = None

class ParsedActivityDto(BaseModel):
    """Internal DTO — mirrors the JSON Gemini returns. Never exposed in API responses."""
    exercise_type: str | None = None
    duration_minutes: float | None = None
    distance_km: float | None = None
    calories_burned: int | None = None
    reps_count: int | None = None
    sets_count: int | None = None
    weight_lifted_kg: float | None = None
    heart_rate_bpm: int | None = None
    water_ml: int | None = None
    calories_consumed: int | None = None
    meal_description: str | None = None
    sleep_duration_minutes: float | None = None
    steps_count: int | None = None
    notes: str | None = None

class DailySummaryRead(BaseModel):
    summary_date: date
    total_steps: int
    total_active_minutes: int
    total_calories_burned: int
    total_water_ml: int
    sleep_minutes: int
    xp_earned_today: int
    activity_count: int
    logs: list[ActivityLogRead]