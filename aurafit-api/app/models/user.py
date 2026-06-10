import uuid
import enum
from sqlalchemy import String, Float, Integer, Enum as SAEnum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Gender(str, enum.Enum):
    MALE="MALE"
    FEMALE="FEMALE"
    OTHER="OTHER"

class CharacterClass(str, enum.Enum):
    NOVICE  = "NOVICE"
    WARRIOR = "WARRIOR"
    RANGER  = "RANGER"
    MAGE    = "MAGE"

class User(Base):
    __tablename__ = "users"

    # _______ IDENTITY _________________
    id: Mapped[str] = mapped_column (
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    google_sub: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        index=True,
        nullable=False,
        comment="Google OAuth2 subject Id - universal key across web and Android",
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(512))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # _________ Physical Attributes _______________
    # needed for BMR, BMI, MET calorie calculations
    # null until user completes the onboarding profile setup screen

    height_cm: Mapped[float | None] = mapped_column(Float)
    weight_kg: Mapped[float | None] = mapped_column(Float)
    age_years: Mapped[int | None] = mapped_column(Integer)
    gender: Mapped[Gender | None] = mapped_column(SAEnum(Gender))

    # ________ CACHED HEALTH BASELINES ____________
    # recomputed & stored for each profile save
    # cached here so the dashboard never recalculates on each request
    bmr: Mapped[float | None] = mapped_column(Float, comment='Mifflin-St Jeor BMR (kcal/day)')
    bmi: Mapped[float | None] = mapped_column(Float, comment="Body Mass Index")

    # ________ RPG Identity _______________________
    character_class: Mapped[CharacterClass] = mapped_column(
        SAEnum(CharacterClass),
        default=CharacterClass.NOVICE,
        nullable=False,
    )
    total_xp: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # _______ RELATIONSHIPS _______________________
    activity_logs: Mapped[list["ActivityLog"]] = relationship(
        "ActivityLog",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    character_stats: Mapped[list["CharacterStats"]] = relationship(
        "CharacterStats",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    oauth_tokens: Mapped[list["OAuthToken"]] = relationship(
        "OAuthToken",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="noload",
    )

    # ── Helpers ───────────────────────────────────────────────────────────────
    @property
    def profile_complete(self) -> bool:
        """Returns False until onboarding is finished."""
        return all([
            self.height_cm is not None,
            self.weight_kg is not None,
            self.age_years is not None,
            self.gender is not None,
        ])

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} level={self.current_level}>"





