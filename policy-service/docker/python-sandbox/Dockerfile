# --- Builder stage: compile wheels with full toolchain ---
# build-essential + libgdal-dev are needed to compile fiona/rasterio from source on
# platforms (e.g. linux/arm64) where prebuilt wheels are unavailable.
FROM python:3.12.10-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gdal-bin libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /tmp/requirements.txt
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r /tmp/requirements.txt

# --- Runtime stage: minimal image, no compiler toolchain ---
# Keeping the runtime free of build-essential / libgdal-dev shrinks the image and
# removes a ready-made post-exploit toolchain from the sandbox.
FROM python:3.12.10-slim

WORKDIR /sandbox

# gdal-bin provides the shared libraries fiona/rasterio link against at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gdal-bin \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /wheels /wheels
COPY requirements.txt ./
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt \
    && rm -rf /wheels

COPY entrypoint.py ./

RUN adduser --disabled-password --uid 1001 sandbox && chown -R sandbox:sandbox /sandbox
USER sandbox

ENTRYPOINT ["python3", "entrypoint.py"]
