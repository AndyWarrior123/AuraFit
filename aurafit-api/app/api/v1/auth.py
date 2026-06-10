from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.dependencies import get_db, get_current_user
from app.core.security import (
    verify_google_id_token,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from app.schemas.auth import GoogleTokenRequest, TokenResponse, RefreshTokenRequest
from app.schemas.user import UserRead
from app.services.auth_service import upsert_user_from_google
from app.models.user import User

router = APIRouter()


@router.post("/google", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def google_sign_in(
    body: GoogleTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    google_payload = await verify_google_id_token(body.id_token)
    if not google_payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    user = await upsert_user_from_google(db, google_payload)
    return TokenResponse(
        access_token=create_access_token({"sub": user.id}),
        refresh_token=create_refresh_token({"sub": user.id}),
        user_id=user.id,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    body: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    payload = decode_refresh_token(body.refresh_token)
    user_id: str = payload.get("sub", "")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return TokenResponse(
        access_token=create_access_token({"sub": user.id}),
        refresh_token=create_refresh_token({"sub": user.id}),
        user_id=user.id,
    )


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)