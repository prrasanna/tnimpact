"""Main entry point for Voice-Enabled Logistics Assistant backend."""

import logging

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import models
import schemas
from auth import get_current_user, router as auth_router
from database import Base, engine
from routes.admin import router as admin_router
from routes.delivery import router as delivery_router
from routes.warehouse import router as warehouse_router
from voice import listen_command, process_voice_command, speak_text

# Configure basic application logging.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Voice-Enabled Logistics Assistant API", version="1.0.0")

# CORS policy (adjust origins in production).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    """Create tables on startup if not present."""
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized")


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    """Handle HTTP errors consistently."""
    logger.warning("HTTPException: %s", exc.detail)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    """Handle request validation errors."""
    logger.warning("Validation error: %s", exc.errors())
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception):
    """Catch-all error handler for unexpected failures."""
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/")
def root():
    """Health/info endpoint."""
    return {"message": "Voice-Enabled Logistics Assistant backend is running"}


@app.post("/voice/listen")
def capture_voice_command():
    """Capture a live command from microphone."""
    command = listen_command()
    return {"command": command}


@app.post("/voice/process")
def handle_voice_command(
    payload: schemas.VoiceCommandRequest,
    current_user: models.User = Depends(get_current_user),
):
    """Process text command with role-aware voice workflow."""
    response = process_voice_command(
        command=payload.command,
        user_role=current_user.role,
        user_name=current_user.name,
    )
    return {"response": response}


@app.post("/voice/speak")
def speak(payload: schemas.VoiceCommandRequest):
    """Manually speak any provided text."""
    speak_text(payload.command, language="en")
    return {"status": "spoken"}


# Register API routers.
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(warehouse_router)
app.include_router(delivery_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
