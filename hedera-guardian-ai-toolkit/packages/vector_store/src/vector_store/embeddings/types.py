"""Embedding provider types and enums."""

from enum import StrEnum


class EmbeddingProviderType(StrEnum):
    """Supported embedding provider types."""

    FASTEMBED = "fastembed"  # Dense-only embeddings via FastEmbed
    BGE_M3_ONNX = "bge_m3_onnx"  # Multi-vector (dense + sparse) via ONNX Runtime
