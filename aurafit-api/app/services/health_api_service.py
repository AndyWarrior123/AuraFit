from datetime import date, datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
from app.models.oauth_token import OAuthToken
from app.models.activity_log import ActivityLog, ActivitySource, ExerciseType
from app.core.config import get_settings
import structlog

log = structlog.get_logger()
settings = get_settings()

_FITNESS_BASE = "https://fitness.googleapis.com/fitness/v1/users/me"
_TOKEN_URL = "https://oauth2.googleapis.com/token"

FITNESS_SCOPES = (
    "https://www.googleapis.com/auth/fitness.activity.read "
    "https://www.googleapis.com/auth/fitness.heart_rate.read "
    "https://www.googleapis.com/auth/fitness.sleep.read "
    "https://www.googleapis.com/auth/fitness.body.read"
)


def build_oauth_url(state: str) -> str:
    from urllib.parse import urlencode
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": str(settings.GOOGLE_REDIRECT_URI),
        "response_type": "code",
        "scope": FITNESS_SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"


async def exchange_code_for_tokens(code: str) -> dict | None:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            _TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": str(settings.GOOGLE_REDIRECT_URI),
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
            },
        )
        if response.status_code == 200:
            return response.json()
        log.warning("health.token_exchange_failed", status=response.status_code)
        return None


async def save_oauth_tokens(
    db: AsyncSession,
    user_id: str,
    token_data: dict,
    scopes: str,
) -> None:
    result = await db.execute(
        select(OAuthToken)
        .where(OAuthToken.user_id == user_id)
        .where(OAuthToken.provider == "google")
    )
    token = result.scalar_one_or_none()
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=token_data.get("expires_in", 3600))

    if token is None:
        token = OAuthToken(user_id=user_id, provider="google")
        db.add(token)

    token.access_token = token_data["access_token"]
    token.refresh_token = token_data.get("refresh_token", token.refresh_token if token.id else "")
    token.expires_at = expires_at
    token.scopes = scopes
    await db.flush()


async def _get_valid_access_token(db: AsyncSession, user_id: str) -> str | None:
    result = await db.execute(
        select(OAuthToken)
        .where(OAuthToken.user_id == user_id)
        .where(OAuthToken.provider == "google")
    )
    token = result.scalar_one_or_none()
    if not token:
        return None

    if not token.is_expired:
        return token.access_token

    async with httpx.AsyncClient() as client:
        response = await client.post(
            _TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": token.refresh_token,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
            },
        )
    if response.status_code != 200:
        log.warning("health.token_refresh_failed", user_id=user_id)
        return None

    new_data = response.json()
    token.access_token = new_data["access_token"]
    token.expires_at = datetime.now(timezone.utc) + timedelta(seconds=new_data.get("expires_in", 3600))
    db.add(token)
    await db.flush()
    return token.access_token


async def pull_fitness_data(
    db: AsyncSession,
    user_id: str,
    start_date: date,
    end_date: date,
) -> list[ActivityLog]:
    access_token = await _get_valid_access_token(db, user_id)
    if not access_token:
        return []

    start_ms = int(datetime.combine(start_date, datetime.min.time()).timestamp() * 1000)
    end_ms = int(datetime.combine(end_date, datetime.max.time()).timestamp() * 1000)

    body = {
        "aggregateBy": [
            {"dataTypeName": "com.google.step_count.delta"},
            {"dataTypeName": "com.google.heart_rate.bpm"},
            {"dataTypeName": "com.google.calories.expended"},
        ],
        "bucketByTime": {"durationMillis": 86_400_000},
        "startTimeMillis": str(start_ms),
        "endTimeMillis": str(end_ms),
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{_FITNESS_BASE}/dataset:aggregate",
            headers={"Authorization": f"Bearer {access_token}"},
            json=body,
            timeout=30,
        )

    if response.status_code != 200:
        log.warning("health.fetch_failed", status=response.status_code, user_id=user_id)
        return []

    created: list[ActivityLog] = []
    for bucket in response.json().get("bucket", []):
        bucket_start_ms = int(bucket.get("startTimeMillis", 0))
        bucket_date = date.fromtimestamp(bucket_start_ms / 1000)
        steps = heart_rate = calories = 0.0

        for dataset in bucket.get("dataset", []):
            for point in dataset.get("point", []):
                values = point.get("value", [{}])
                dtype = dataset.get("dataSourceId", "")
                if "step_count" in dtype:
                    steps += values[0].get("intVal", 0)
                elif "heart_rate" in dtype:
                    heart_rate = values[0].get("fpVal", 0)
                elif "calories" in dtype:
                    calories += values[0].get("fpVal", 0)

        if steps == 0 and heart_rate == 0 and calories == 0:
            continue

        entry = ActivityLog(
            user_id=user_id,
            log_date=bucket_date,
            logged_at=datetime.now(timezone.utc),
            source=ActivitySource.HEALTH_CONNECT,
            steps_count=int(steps) or None,
            heart_rate_bpm=int(heart_rate) or None,
            calories_burned=int(calories) or None,
        )
        db.add(entry)
        created.append(entry)

    await db.flush()
    log.info("health.synced", user_id=user_id, records=len(created))
    return created