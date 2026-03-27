# Schema Ingestion Worker - Multi-stage build with CPU/GPU variants
# Build CPU: docker compose build schema-ingestion-worker
# Build GPU: docker compose -f docker-compose.yml -f docker-compose.gpu.yml build schema-ingestion-worker

ARG VARIANT=cpu

# =============================================================================
# Stage 1: Builder base - Common setup
# =============================================================================
FROM python:3.12-slim-bookworm AS builder-base

# No Tesseract/OpenGL needed - schema worker only parses JSON files

RUN pip install --no-cache-dir --root-user-action=ignore poetry==2.2.1

ENV POETRY_VIRTUALENVS_CREATE=false \
    POETRY_NO_INTERACTION=1

WORKDIR /build

COPY packages/vector_store /build/vector_store
COPY packages/schema_ingestion_worker /build/schema_ingestion_worker

# =============================================================================
# Stage 2a: CPU builder
# =============================================================================
FROM builder-base AS builder-cpu

WORKDIR /build/schema_ingestion_worker
RUN poetry install --only main

# =============================================================================
# Stage 2b: GPU builder
# =============================================================================
FROM builder-base AS builder-gpu

WORKDIR /build/schema_ingestion_worker
RUN poetry install --only main

# Replace CPU onnxruntime with GPU variant + CUDA runtime libs.
# onnxruntime and onnxruntime-gpu are mutually exclusive packages.
# [cuda,cudnn] extras pull all required nvidia-* CUDA packages automatically.
RUN ORT_VERSION=$(pip show onnxruntime 2>/dev/null | grep '^Version:' | cut -d' ' -f2) && \
    [ -n "$ORT_VERSION" ] || { echo "ERROR: onnxruntime not installed; cannot determine version for GPU swap" >&2; exit 1; } && \
    pip uninstall -y onnxruntime && \
    pip install --no-cache-dir --root-user-action=ignore --timeout 600 --retries 10 \
        "onnxruntime-gpu[cuda,cudnn]==${ORT_VERSION}"

# =============================================================================
# Stage 3: Select variant
# =============================================================================
FROM builder-${VARIANT} AS builder

# =============================================================================
# Stage 4: Runtime
# =============================================================================
FROM python:3.12-slim-bookworm AS runtime

ENV PYTHONUNBUFFERED=1

# CUDA shared libs from pip-installed nvidia packages (harmless on CPU — dirs don't exist)
ENV LD_LIBRARY_PATH="/usr/local/lib/python3.12/site-packages/nvidia/cuda_runtime/lib:\
/usr/local/lib/python3.12/site-packages/nvidia/cudnn/lib:\
/usr/local/lib/python3.12/site-packages/nvidia/cublas/lib:\
/usr/local/lib/python3.12/site-packages/nvidia/curand/lib:\
/usr/local/lib/python3.12/site-packages/nvidia/cufft/lib:\
/usr/local/lib/python3.12/site-packages/nvidia/cuda_nvrtc/lib"

RUN groupadd --system --gid 999 nonroot \
    && useradd --system --gid 999 --uid 999 --create-home nonroot

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /build /build

RUN chown -R nonroot:nonroot /build && \
    mkdir -p /home/nonroot/.cache/huggingface && \
    chown -R nonroot:nonroot /home/nonroot/.cache

WORKDIR /build/schema_ingestion_worker
USER nonroot

CMD ["python", "-m", "schema_ingestion_worker"]
