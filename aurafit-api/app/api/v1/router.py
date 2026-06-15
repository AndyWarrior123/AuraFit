from fastapi import APIRouter
from app.api.v1 import auth, users, activities, voice, character, health, sync

api_router = APIRouter()

api_router.include_router(auth.router,       prefix="/auth",       tags=["auth"])
api_router.include_router(users.router,      prefix="/users",      tags=["users"])
api_router.include_router(activities.router, prefix="/activities", tags=["activities"])
api_router.include_router(voice.router,      prefix="/voice",      tags=["voice"])
api_router.include_router(character.router,  prefix="/character",  tags=["character"])
api_router.include_router(health.router,     prefix="/health",     tags=["health"])
api_router.include_router(sync.router,       prefix="/sync",       tags=["sync"])