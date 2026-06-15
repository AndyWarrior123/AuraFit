import enum
from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class DetectedActivity(str, enum.Enum):
    WALKING = "WALKING"
    RUNNING = "RUNNING"
    STILL   = "STILL"


class PassiveSyncLog(Base):
    __tablename__ = "passive_sync_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    steps_since_last_sync: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    distance_meters: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    detected_activity: Mapped[DetectedActivity] = mapped_column(
        SAEnum(DetectedActivity), nullable=False
    )

    def __repr__(self) -> str:
        return f"<PassiveSyncLog id={self.id} user={self.user_id} activity={self.detected_activity}>"
