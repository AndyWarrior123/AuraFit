from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator
from app.models.user import CharacterClass, Gender

class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    display_name: str
    avatar_url: str | None
    height_cm: float | None
    weight_kg: float | None
    age_years: int | None
    gender: Gender | None
    bmr: float | None
    bmi: float | None
    character_class: CharacterClass
    total_xp: int
    current_level: int
    profile_complete: bool

class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    avatar_url: str | None = Field(default=None, max_length=512)
    height_cm: float | None = Field(default=None, gt=50.0, lt=300.0)
    weight_kg: float | None = Field(default=None, gt=10.0, lt=500.0)
    age_years: int | None = Field(default=None, gt=4, lt=130)
    gender: Gender | None = None

class ProfileSetupRequest(BaseModel):
    """Used during onboarding — all physical fields are required."""
    display_name: str = Field(..., min_length=1, max_length=100)
    height_cm: float = Field(..., gt=50.0, lt=300.0)
    weight_kg: float = Field(..., gt=10.0, lt=500.0)
    age_years: int = Field(..., gt=4, lt=130)
    gender: Gender

    @model_validator(mode="after")
    def bmi_sanity_check(self) -> "ProfileSetupRequest":
        height_m = self.height_cm / 100
        bmi = self.weight_kg / (height_m ** 2)
        if bmi < 10 or bmi > 80:
            raise ValueError("Height and weight combination is not physiologically plausible")
        return self