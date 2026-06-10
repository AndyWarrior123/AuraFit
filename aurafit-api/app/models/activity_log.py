import enum
from datetime import date, datetime

from sqlalchemy import (
    Date, DateTime, Float, ForeignKey, Integer,
    String, Text, Enum as SAEnum, UniqueConstraint,
)

from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class ActivitySource(str, enum.Enum):
    VOICE="VOICE"
    HEALTH_CONNECT="HEALTH_CONNECT"
    MANUAL="MANUAL"

class ExerciseType(str, enum.Enum):
    RUN="RUN"
    WALK="WALK"
    CYCLE   = "CYCLE"
    SWIM    = "SWIM"
    HIKE    = "HIKE"
    LIFT    = "LIFT"
    YOGA    = "YOGA"
    PILATES = "PILATES"
    HIIT    = "HIIT"
    STRETCH = "STRETCH"
    SPORT   = "SPORT"
    OTHER   = "OTHER"

class HeartRateZone(str, enum.Enum):
    REST="REST"
    FAT_BURN="FAT_BURN"
    CARDIO="CARDIO"
    PEAK="PEAK"

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    # ── Primary Key ───────────────────────────────────────────────────────────
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # ── Foreign Key ───────────────────────────────────────────────────────────
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    log_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
        comment="The calendar day this activity belongs to (used for daily grouping)",
    )
    logged_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="When the entry was actually created in the system",
    )

    # ── Source ────────────────────────────────────────────────────────────────
    source: Mapped[ActivitySource] = mapped_column(
        SAEnum(ActivitySource),
        nullable=False,
    )

    # ── Exercise ──────────────────────────────────────────────────────────────
    exercise_type: Mapped[ExerciseType | None]  = mapped_column(SAEnum(ExerciseType))
    duration_minutes: Mapped[float | None]      = mapped_column(Float)
    distance_km: Mapped[float | None]           = mapped_column(Float)
    calories_burned: Mapped[int | None]         = mapped_column(Integer)
    reps_count: Mapped[int | None]              = mapped_column(Integer)
    sets_count: Mapped[int | None]              = mapped_column(Integer)
    weight_lifted_kg: Mapped[float | None]      = mapped_column(Float)

    # ── Biometrics ────────────────────────────────────────────────────────────
    heart_rate_bpm: Mapped[int | None]              = mapped_column(Integer)
    heart_rate_zone: Mapped[HeartRateZone | None]   = mapped_column(SAEnum(HeartRateZone))

    # ── Nutrition ─────────────────────────────────────────────────────────────
    water_ml: Mapped[int | None]            = mapped_column(Integer)
    calories_consumed: Mapped[int | None]   = mapped_column(Integer)
    meal_description: Mapped[str | None]    = mapped_column(String(300))

    # ── Sleep ─────────────────────────────────────────────────────────────────
    sleep_duration_minutes: Mapped[int | None]  = mapped_column(Integer)
    sleep_quality_score: Mapped[int | None]     = mapped_column(Integer)

    # ── Health Connect Bridge ─────────────────────────────────────────────────
    # Unique constraint prevents duplicate writes when Android syncs the same
    # Health Connect record that the server already pulled from Google Fitness.
    hc_record_id: Mapped[str | None]    = mapped_column(String(128), unique=True)
    steps_count: Mapped[int | None]     = mapped_column(Integer)

    # ── RPG ───────────────────────────────────────────────────────────────────
    xp_awarded: Mapped[int]         = mapped_column(Integer, default=0, nullable=False)
    raw_transcript: Mapped[str | None]  = mapped_column(Text)

    # ── Relationship ──────────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="activity_logs", lazy="noload")

    def __repr__(self) -> str:
        return f"<ActivityLog id={self.id} user={self.user_id} date={self.log_date} type={self.exercise_type}>"