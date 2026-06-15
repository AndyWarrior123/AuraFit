from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.passive_sync_log import DetectedActivity

# Packets implying movement faster than this are rejected as vehicle commutes
_MAX_SPEED_KMH = 45.0


class PassiveSyncPayload(BaseModel):
    timestamp: datetime
    steps_since_last_sync: int = Field(ge=0, le=100_000)
    distance_meters: float = Field(ge=0.0, le=50_000.0)
    detected_activity: DetectedActivity


class PassiveSyncRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    timestamp: datetime
    steps_since_last_sync: int
    distance_meters: float
    detected_activity: DetectedActivity
