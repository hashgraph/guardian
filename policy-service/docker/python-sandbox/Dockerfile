FROM python:3.12.10-slim

WORKDIR /sandbox

# Install system dependencies for geospatial libraries.
# build-essential is required to compile fiona/rasterio from source on
# platforms (e.g. linux/arm64) where prebuilt wheels are unavailable.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
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
