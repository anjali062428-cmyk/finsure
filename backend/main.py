"""
FinSure Real-Time Fraud Detection Inference API
Production FastAPI Application.
Enforces:
- Model pre-loading at startup (Lifespan context)
- Zero internal stack traces in production responses
- Request ID / Correlation ID propagation
- Token-bucket rate limiting abstraction
- Payload size bounds
- Safe CORS configuration
"""

import time
import uuid
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from backend.services.model_service import ModelRegistry
from backend.core.config import config
from backend.api.routes import health, transactions, auth, incidents, alerts, cases, documents, users, policies

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
)
logger = logging.getLogger("finsure.api")

MAX_CONTENT_LENGTH = 1024 * 1024  # 1 MB maximum payload ceiling


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup & shutdown lifecycle manager.
    Pre-loads all models once before traffic is served.
    """
    logger.info("Initializing FinSure Application Lifespan...")
    try:
        # Validate security configuration before accepting traffic
        config.validate_security_environment()
        
        registry = ModelRegistry.get_instance()
        registry.load_all_artifacts()
        logger.info("All model artifacts primed and ready for inference.")
    except Exception as e:
        logger.critical(f"Failed to initialize application at startup: {e}")
        raise e
    yield
    logger.info("Shutting down FinSure Application Lifespan...")


app = FastAPI(
    title="FinSure Fraud Risk Inference API",
    description="Real-time multi-modal fraud detection, decisioning, and explainability service.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# -------------------------------------------------------------
# CORS Configuration
# -------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time-Ms", "X-Response-Time-Ms"]
)

# -------------------------------------------------------------
# In-Memory Rate Limiting Abstraction
# -------------------------------------------------------------
RATE_LIMIT_MAX_REQUESTS = 500  # requests per window
RATE_LIMIT_WINDOW_SECONDS = 1.0
_client_request_history: Dict[str, List[float]] = {}


@app.middleware("http")
async def security_and_telemetry_middleware(request: Request, call_next):
    """
    Handles request correlation ID, payload size guarding, rate-limiting, and timing.
    """
    t_start = time.perf_counter()
    req_id = request.headers.get("X-Request-ID", f"req_{uuid.uuid4().hex[:12]}")

    # 1. Payload size check (25MB for document uploads, 1MB for all other endpoints)
    content_length = request.headers.get("Content-Length")
    if content_length:
        cl_val = int(content_length)
        is_doc_upload = request.url.path.startswith("/api/v1/documents/upload") or request.url.path.startswith("/api/v1/documents/ledger/import")
        max_allowed = (25 * 1024 * 1024) if is_doc_upload else MAX_CONTENT_LENGTH
        if cl_val > max_allowed:
            return JSONResponse(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                content={
                    "error": "PayloadTooLarge",
                    "message": f"Request body exceeds maximum permissible size ({max_allowed} bytes).",
                    "request_id": req_id
                },
                headers={"X-Request-ID": req_id}
            )

    # 2. Simple Rate Limiting check
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()
    if client_ip not in _client_request_history:
        _client_request_history[client_ip] = []
    
    # Filter timestamps within window
    _client_request_history[client_ip] = [
        t for t in _client_request_history[client_ip] if (now - t) < RATE_LIMIT_WINDOW_SECONDS
    ]

    if len(_client_request_history[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "RateLimitExceeded",
                "message": "Too many requests. Please throttle your traffic.",
                "request_id": req_id
            },
            headers={"X-Request-ID": req_id, "Retry-After": "1"}
        )

    _client_request_history[client_ip].append(now)

    # 3. Process Request
    response = await call_next(request)

    # 4. Attach telemetry and security headers
    elapsed_ms = round((time.perf_counter() - t_start) * 1000.0, 3)
    response.headers["X-Request-ID"] = req_id
    response.headers["X-Process-Time-Ms"] = str(elapsed_ms)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    return response


# -------------------------------------------------------------
# Exception Handlers (Zero Stack Trace Leakage)
# -------------------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    req_id = request.headers.get("X-Request-ID", "unknown")
    logger.warning(f"Validation error on {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "ValidationError",
            "message": "The supplied transaction request failed schema validation.",
            "details": exc.errors(),
            "request_id": req_id
        },
        headers={"X-Request-ID": req_id}
    )


@app.exception_handler(FileNotFoundError)
async def artifact_missing_exception_handler(request: Request, exc: FileNotFoundError):
    req_id = request.headers.get("X-Request-ID", "unknown")
    logger.critical(f"Missing artifact error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "error": "ModelServiceUnavailable",
            "message": "Inference engine is temporarily unavailable due to missing core model artifacts.",
            "request_id": req_id
        },
        headers={"X-Request-ID": req_id}
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    req_id = request.headers.get("X-Request-ID", "unknown")
    logger.error(f"Unhandled error on request {req_id}: {exc}", exc_info=False)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred while processing the transaction.",
            "request_id": req_id
        },
        headers={"X-Request-ID": req_id}
    )


# -------------------------------------------------------------
# Include API Routers
# -------------------------------------------------------------
app.include_router(health.router)
app.include_router(transactions.router)
app.include_router(auth.router)
app.include_router(incidents.router)
app.include_router(alerts.router)
app.include_router(cases.router)
app.include_router(documents.router)
app.include_router(users.router)
app.include_router(policies.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)
