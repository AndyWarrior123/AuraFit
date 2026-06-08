from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User, Gender, CharacterClass
from app.services.biometric_engine import BiometricProfile, calculate_bmr, calculate_bmi
import structlog

log = structlog.get_logger()


async def upsert_user_from_google(
    db: AsyncSession,
    google_payload: dict,
) -> User:
    """
    Creates a new user or updates display name / avatar if they already exist.
    Keyed on google_sub — the permanent Google identity anchor.
    """
    sub = google_payload["sub"]
    result = await db.execute(select(User).where(User.google_sub == sub))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            google_sub=sub,
            email=google_payload.get("email", ""),
            display_name=google_payload.get("name", "Player"),
            avatar_url=google_payload.get("picture"),
            character_class=CharacterClass.NOVICE,
        )
        db.add(user)
        log.info("user.created", google_sub=sub, email=user.email)
    else:
        user.display_name = google_payload.get("name", user.display_name)
        user.avatar_url = google_payload.get("picture", user.avatar_url)
        log.info("user.login", user_id=user.id)

    await db.flush()
    return user


async def update_user_biometrics(db: AsyncSession, user: User) -> None:
    """Recalculates and caches BMR + BMI after any profile change."""
    if user.height_cm and user.weight_kg and user.age_years and user.gender:
        profile = BiometricProfile(
            height_cm=user.height_cm,
            weight_kg=user.weight_kg,
            age_years=user.age_years,
            gender=user.gender,
        )
        user.bmr = calculate_bmr(profile)
        user.bmi = calculate_bmi(profile)
        db.add(user)
        await db.flush()