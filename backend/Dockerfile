# ==============================================================================
# FinSure Fraud Detection & Financial Forensics Backend
# Production Multi-Stage Container Image
# ==============================================================================

FROM python:3.11-slim as base

# Prevent Python from writing .pyc and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=production \
    PORT=8000

# Install system dependencies for cryptography, PDF processing, and Tesseract OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libpq-dev \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copy application modules and artifacts
COPY backend /app/backend
COPY ml /app/ml
COPY configs /app/configs
COPY data /app/data

# Ensure data directory exists with write permissions
RUN mkdir -p /app/data && chmod 777 /app/data

# Create non-root unprivileged runtime user
RUN useradd -u 1000 -m finsure && \
    chown -R finsure:finsure /app
USER finsure

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Production command
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--proxy-headers", "--forwarded-allow-ips", "*"]
