FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install uv for fast dependency management
RUN pip install uv --no-cache-dir

# Copy dependency files first (for Docker layer caching)
COPY pyproject.toml .

# Install production dependencies
RUN uv sync --no-dev --frozen

# Copy source code
COPY src/ ./src/

# Create non-root user
RUN addgroup --system insightiq && adduser --system --ingroup insightiq insightiq
USER insightiq

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/health')"

# Run the application
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
