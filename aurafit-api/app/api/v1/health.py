import base64
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.dependencies import get_db, get_current_user
from app.models.oauth_token import OAuthToken
from app.models.user import User
from app.services.health_api_service import (
    build_oauth_url,
    exchange_code_for_tokens,
    save_oauth_tokens,
    pull_fitness_data,
    FITNESS_SCOPES,
)

router = APIRouter()


@router.post("/sync/initiate")
async def initiate_sync(
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    state = base64.urlsafe_b64encode(current_user.id.encode()).decode()
    return {"oauth_url": build_oauth_url(state)}


@router.get("/sync/callback")
async def oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    try:
        user_id = base64.urlsafe_b64decode(state.encode()).decode()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid state")

    token_data = await exchange_code_for_tokens(code)
    if not token_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Failed to exchange code for tokens")

    await save_oauth_tokens(db, user_id, token_data, FITNESS_SCOPES)
    return {"status": "connected", "user_id": user_id}


@router.post("/sync/pull")
async def pull_data(
    days: int = Query(default=7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, int]:
    end = date.today()
    start = end - timedelta(days=days)
    created = await pull_fitness_data(db, current_user.id, start, end)
    return {"synced_records": len(created)}


@router.get("/sync/status")
async def sync_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(
        select(OAuthToken)
        .where(OAuthToken.user_id == current_user.id)
        .where(OAuthToken.provider == "google")
    )
    token = result.scalar_one_or_none()
    if not token:
        return {"connected": False}
    return {
        "connected": True,
        "token_expired": token.is_expired,
        "scopes": token.scope_list,
        "updated_at": token.updated_at.isoformat(),
    }