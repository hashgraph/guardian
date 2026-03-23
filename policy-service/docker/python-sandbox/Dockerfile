FROM python:3.12.10-slim

WORKDIR /sandbox

# Install system dependencies for geospatial libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    gdal-bin libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages (pinned to major.minor for reproducibility)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy entrypoint
COPY entrypoint.py ./

# Create non-root user and fix permissions
RUN adduser --disabled-password --uid 1001 sandbox && chown -R sandbox:sandbox /sandbox
USER sandbox

ENTRYPOINT ["python3", "entrypoint.py"]
