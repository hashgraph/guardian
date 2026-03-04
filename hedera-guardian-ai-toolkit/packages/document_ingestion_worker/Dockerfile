# Document Ingestion Worker - Multi-stage build with CPU/GPU variants
# Build CPU: docker compose build document-ingestion-worker
# Build GPU: docker compose -f docker-compose.yml -f docker-compose.gpu.yml build document-ingestion-worker

ARG VARIANT=cpu

# =============================================================================
# Stage 1: Base Builder - Common setup
# =============================================================================
FROM python:3.12-slim-bookworm AS builder-base

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --root-user-action=ignore poetry==2.2.1 poetry-plugin-export

ENV POETRY_VIRTUALENVS_CREATE=false \
    POETRY_NO_INTERACTION=1

WORKDIR /build

COPY packages/vector_store/pyproject.toml /build/vector_store/
COPY packages/vector_store/README.md /build/vector_store/
COPY packages/document_ingestion_worker/pyproject.toml /build/document_ingestion_worker/
COPY packages/document_ingestion_worker/README.md /build/document_ingestion_worker/

COPY packages/vector_store/src /build/vector_store/src
COPY packages/document_ingestion_worker/src /build/document_ingestion_worker/src

# =============================================================================
# Stage 2a: CPU Builder - CPU-only PyTorch via pip (smaller ~2.5GB)
# Uses pip instead of poetry install to avoid nvidia package bloat
# =============================================================================
FROM builder-base AS builder-cpu

WORKDIR /build/document_ingestion_worker

# Export requirements from poetry and filter out nvidia/triton packages
# These are CUDA dependencies that aren't needed for CPU-only builds
# Include --extras surya to enable formula enrichment on CPU builds
RUN poetry export -f requirements.txt --without-hashes --extras surya -o /tmp/requirements-full.txt && \
    grep -v -E '^(nvidia-|triton)' /tmp/requirements-full.txt > /tmp/requirements.txt

# Install using pip with CPU torch index taking priority
# - First index (CPU) is checked first for torch/torchvision
# - Falls back to PyPI for everything else
# - nvidia packages filtered out above, so no CUDA bloat
RUN pip install --no-cache-dir --root-user-action=ignore \
    -r /tmp/requirements.txt \
    --index-url https://download.pytorch.org/whl/cpu \
    --extra-index-url https://pypi.org/simple && \
    pip cache purge

# Install local packages
RUN pip install --no-cache-dir --root-user-action=ignore --no-deps \
    /build/vector_store \
    /build/document_ingestion_worker

# =============================================================================
# Stage 2b: GPU Builder - PyTorch with CUDA (~4GB)
# Uses pip instead of poetry install to avoid nvidia package timeout issues
# =============================================================================
FROM builder-base AS builder-gpu

WORKDIR /build/document_ingestion_worker

# Step 1: Export full dependency list from Poetry (resolves fresh, no lock file in image)
# --without-hashes: avoid hash mismatches between CUDA and PyPI torch variants
# --extras surya: include optional surya-ocr for GPU-accelerated formula enrichment
RUN poetry export -f requirements.txt --without-hashes --extras surya -o /tmp/requirements-full.txt && \
    grep -v -E '^(nvidia-|triton|torch)' /tmp/requirements-full.txt > /tmp/requirements.txt

# Step 2: Install CUDA PyTorch from the cu128 index ONLY (no --extra-index-url)
# Separate step prevents pip from pulling CPU torch from PyPI (pip#8606)
RUN pip install --no-cache-dir --root-user-action=ignore --timeout 600 --retries 10 \
    torch torchvision --index-url https://download.pytorch.org/whl/cu128

# Step 3: Install remaining dependencies from PyPI
# torch/nvidia/triton already installed above — filtered out to avoid version conflicts
RUN pip install --no-cache-dir --root-user-action=ignore --timeout 600 --retries 10 \
    -r /tmp/requirements.txt && \
    pip cache purge

# Step 4: Install local packages (deps already satisfied above)
RUN pip install --no-cache-dir --root-user-action=ignore --no-deps \
    /build/vector_store \
    /build/document_ingestion_worker

# Step 5: Replace CPU onnxruntime with GPU variant for GPU-accelerated embeddings.
# PyTorch CUDA install already provides nvidia-cuda-runtime/cudnn/cublas packages.
RUN ORT_VERSION=$(pip show onnxruntime 2>/dev/null | grep '^Version:' | cut -d' ' -f2) && \
    [ -n "$ORT_VERSION" ] || { echo "ERROR: onnxruntime not installed; cannot determine version for GPU swap" >&2; exit 1; } && \
    pip uninstall -y onnxruntime && \
    pip install --no-cache-dir --root-user-action=ignore --no-deps --timeout 600 --retries 10 "onnxruntime-gpu==${ORT_VERSION}"

# =============================================================================
# Stage 3: Select builder based on VARIANT
# =============================================================================
FROM builder-${VARIANT} AS builder

# =============================================================================
# Stage 4: Runtime
# =============================================================================
FROM python:3.12-slim-bookworm AS runtime

# Force unbuffered stdout/stderr for real-time logging in containers
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

RUN groupadd --system --gid 999 nonroot \
    && useradd --system --gid 999 --uid 999 --create-home nonroot

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /build /build

RUN chown -R nonroot:nonroot /build && \
    mkdir -p /home/nonroot/.cache/huggingface && \
    mkdir -p /home/nonroot/.cache/datalab && \
    chown -R nonroot:nonroot /home/nonroot/.cache

# CUDA shared libs from pip-installed nvidia packages (needed by onnxruntime-gpu;
# PyTorch handles its own CUDA loading internally but ORT does not)
ENV LD_LIBRARY_PATH="/usr/local/lib/python3.12/site-packages/nvidia/cuda_runtime/lib:\
/usr/local/lib/python3.12/site-packages/nvidia/cudnn/lib:\
/usr/local/lib/python3.12/site-packages/nvidia/cublas/lib:\
/usr/local/lib/python3.12/site-packages/nvidia/curand/lib:\
/usr/local/lib/python3.12/site-packages/nvidia/cufft/lib:\
/usr/local/lib/python3.12/site-packages/nvidia/cuda_nvrtc/lib"

WORKDIR /build/document_ingestion_worker
USER nonroot

CMD ["python", "-m", "document_ingestion_worker"]
