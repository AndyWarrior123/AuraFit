import re
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings

settings = get_settings()


def _build_asyncpg_url(url: str) -> tuple[str, dict]:
    # Ensure the asyncpg driver is specified regardless of what's in .env
    url = re.sub(r"^postgresql(\+\w+)?://", "postgresql+asyncpg://", url)

    # asyncpg does not accept libpq URL query params (sslmode, channel_binding,
    # options, etc.) — strip them all and derive connect_args from them instead.
    parsed = urlparse(url)
    params = {k: v[0] for k, v in parse_qs(parsed.query).items()}

    sslmode = params.pop("sslmode", None)
    ssl_param = params.pop("ssl", None)
    params.pop("channel_binding", None)  # libpq-only, not supported by asyncpg
    params.pop("options", None)          # Neon endpoint routing param, not needed

    connect_args: dict = {}
    if sslmode in ("require", "verify-ca", "verify-full") or ssl_param == "require":
        connect_args["ssl"] = True

    clean_url = urlunparse(parsed._replace(query=urlencode(params)))
    return clean_url, connect_args


_db_url, _connect_args = _build_asyncpg_url(settings.DATABASE_URL)

engine = create_async_engine(
    _db_url,
    connect_args=_connect_args,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_recycle=settings.DATABASE_POOL_RECYCLE,
    echo=settings.DEBUG,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
