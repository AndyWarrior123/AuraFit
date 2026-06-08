from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db, get_current_user
from app.schemas.user import UserRead, UserUpdate, ProfileSetupRequest
from app.services.auth_service import update_user_biometrics
from app.models.user import User

router = APIRouter()


@router.get("/me/profile", response_model=UserRead)
async def get_profile(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)


@router.put("/me/profile", response_model=UserRead)
async def update_profile(
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserRead:
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    await update_user_biometrics(db, current_user)
    db.add(current_user)
    return UserRead.model_validate(current_user)


@router.post("/me/setup", response_model=UserRead, status_code=201)
async def setup_profile(
    body: ProfileSetupRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserRead:
    current_user.display_name = body.display_name
    current_user.height_cm = body.height_cm
    current_user.weight_kg = body.weight_kg
    current_user.age_years = body.age_years
    current_user.gender = body.gender
    await update_user_biometrics(db, current_user)
    db.add(current_user)
    return UserRead.model_validate(current_user)