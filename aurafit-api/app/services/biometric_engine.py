import math
from dataclasses import dataclass
from app.models.user import Gender


@dataclass(frozen=True)
class BiometricProfile:
    height_cm: float
    weight_kg: float
    age_years: int
    gender: Gender


def calculate_bmr(profile: BiometricProfile) -> float:
    """Mifflin-St Jeor equation (kcal/day)."""
    base = (10 * profile.weight_kg) + (6.25 * profile.height_cm) - (5 * profile.age_years)
    return round(base + 5 if profile.gender == Gender.MALE else base - 161, 2)


def calculate_bmi(profile: BiometricProfile) -> float:
    height_m = profile.height_cm / 100
    return round(profile.weight_kg / (height_m ** 2), 1)


def calculate_tdee(bmr: float, activity_multiplier: float = 1.375) -> float:
    """Total Daily Energy Expenditure. Default = lightly active."""
    return round(bmr * activity_multiplier, 0)


def estimate_vo2max_proxy(age: int, resting_hr: int, max_hr: int | None = None) -> float:
    """Uth-Sorensen-Overgaard-Pedersen formula."""
    hr_max = max_hr or (220 - age)
    return round(15.3 * (hr_max / resting_hr), 1)


def body_fat_navy(
    gender: Gender,
    height_cm: float,
    waist_cm: float,
    neck_cm: float,
    hip_cm: float = 0.0,
) -> float:
    """US Navy circumference method."""
    if gender == Gender.MALE:
        return round(
            495 / (1.0324 - 0.19077 * math.log10(waist_cm - neck_cm)
                   + 0.15456 * math.log10(height_cm)) - 450, 1
        )
    return round(
        495 / (1.29579 - 0.35004 * math.log10(waist_cm + hip_cm - neck_cm)
               + 0.22100 * math.log10(height_cm)) - 450, 1
    )