from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class OAuthToken(Base):
    __tablename__ = "oauth_tokens"

    # __ PRIMARY KEY _________________________________
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # __ FOREIGN KEY _________________________________
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Token Data ────────────────────────────────────────────────────────────
    provider: Mapped[str]       = mapped_column(String(32), nullable=False, default="google")
    access_token: Mapped[str]   = mapped_column(Text, nullable=False)
    refresh_token: Mapped[str]  = mapped_column(Text, nullable=False)
    token_type: Mapped[str]     = mapped_column(String(32), default="Bearer", nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="When the access_token expires — refresh before this time",
    )

    # ── Scopes granted by the user ────────────────────────────────────────────
    # Space-separated OAuth scope strings as returned by Google.
    # e.g. "openid email profile https://www.googleapis.com/auth/fitness.activity.read"
    scopes: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # ── Relationship ──────────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="oauth_tokens", lazy="noload")

    @property
    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) >= self.expires_at

    @property
    def scope_list(self) -> list[str]:
        return self.scopes.split() if self.scopes else []

    def __repr__(self) -> str:
        return f"<OAuthToken user={self.user_id} provider={self.provider} expired={self.is_expired}>"