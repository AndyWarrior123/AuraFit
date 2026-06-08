from pydantic import BaseModel, Field

class GoogleTokenRequest(BaseModel):
    id_token: str = Field(..., description="Google ID toke from Sign-In SDK")
    client_type: str = Field(default="web", description="'web' or 'android'")

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str