from datetime import date
from sqlalchemy import (
    Date, Float, ForeignKey, Integer,
    String, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class CharacterStats(Base):
    __tablename__ = "character_stats"

    __table_args__ = (
        UniqueConstraint("user_id", "stat_date", name="uq_character_stats_user_date"),
    )

    # _______ PRIMARY KEY ________________________
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # _______ FOREIGN KEY ________________________
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    stat_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
        comment="The calender day this snapshot represents",
    )

    # ── RPG Attributes (0.0 – 100.0) ─────────────────────────────────────────
    strength:   Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    endurance:  Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    vitality:   Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    agility:    Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    recovery:   Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    discipline: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # ── XP & Leveling ─────────────────────────────────────────────────────────
    daily_xp_earned:    Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cumulative_xp:      Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    level_at_snapshot:  Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # __ HEALTH TOTALS (denormalised for fast dashboard reads) _________________
    total_steps: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_active_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_calories_burned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_water_ml: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_heart_rate_bpm: Mapped[int | None] = mapped_column(Integer)
    sleep_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # __ STREAKS _______________________________________________________________
    current_streak_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_streak_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # __ RELATIONSHIP __________________________________________________________
    user: Mapped["User"] = relationship("User", back_populates="character_stats", lazy="noload")

    def __repr__(self) -> str:
        return (
            f"<CharacterStats user={self.user_id} date={self.stat_date} "
            f"lvl={self.level_at_snapshot} xp={self.cumulative_xp}>"
        )

















