# ==========================================
# Stage 1: Builder
# ==========================================
FROM python:3.11-slim AS builder

WORKDIR /app

# Install uv using pip to bypass ghcr.io network issues in WSL
RUN pip install uv

# Create a virtual environment
RUN uv venv /opt/venv

# Activate the virtual environment
ENV PATH="/opt/venv/bin:$PATH"

# Copy ONLY dependency file first to maximize Docker layer caching
COPY pyproject.toml ./

# Install dependencies into the virtual environment using uv
RUN uv pip install -r pyproject.toml

# ==========================================
# Stage 2: Final (Production Image)
# ==========================================
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Create the non-root 'appuser' as per COE security guidelines
RUN useradd -m -r -s /bin/bash appuser

# Copy the pre-built virtual environment from the builder stage
COPY --from=builder --chown=appuser:appuser /opt/venv /opt/venv

# Copy the application source code
COPY --chown=appuser:appuser src/ ./src/

# Switch to the non-root user before execution
USER appuser

# Expose the application port
EXPOSE 8000

# Run the FastAPI application
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]