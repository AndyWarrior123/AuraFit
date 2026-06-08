from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from fastapi import HTTPException, status
import httpx
from app.core.config import get_settings

settings = get_settings()

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_ACCESS_EXPIRE_MINUTES)
    payload["type"] = "access"
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
    payload["type"] = "refresh"
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise _CREDENTIALS_EXCEPTION


def decode_refresh_token(token: str) -> dict:
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise _CREDENTIALS_EXCEPTION
    return payload


async def verify_google_id_token(id_token: str) -> dict | None:
    """
    Calls Google's tokeninfo endpoint to validate the ID token.
    Returns the payload dict (contains sub, email, name, picture) or None.
    Works identically for web (Google One Tap) and Android (Google Sign-In SDK).
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            settings.GOOGLE_TOKEN_INFO_URL,
            params={"id_token": id_token},
            timeout=10,
        )
    if response.status_code != 200:
        return None
    payload = response.json()
    if payload.get("aud") != settings.GOOGLE_CLIENT_ID:
        return None
    if "sub" not in payload:
        return None
    return payload
