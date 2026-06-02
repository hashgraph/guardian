"""Factory for creating embedding providers."""

from vector_store.embeddings.base import AsyncEmbeddingProvider
from vector_store.embeddings.multi_vector_base import MultiVectorEmbeddingProvider
from vector_store.embeddings.types import EmbeddingProviderType


def create_embedding_provider(
    provider_type: EmbeddingProviderType | str,
    model_name: str,
    cache_dir: str | None = None,
    **kwargs,
) -> AsyncEmbeddingProvider | MultiVectorEmbeddingProvider:
    """
    Create an embedding provider based on the specified type.

    Args:
        provider_type: The type of embedding provider to create
        model_name: The name of the model to use (e.g., "aapot/bge-m3-onnx")
        cache_dir: Optional cache directory for model files
        **kwargs: Additional keyword arguments forwarded to the provider constructor.
            For BGE_M3_ONNX:
            - max_inference_batch_size (int, default 64): ONNX sub-batch size.
            - execution_providers (list[str] | None, default None): ONNX Runtime
              execution providers. None = auto-detect (CUDA if available, else CPU).

    Returns:
        An instance of the specified embedding provider.
        - FastEmbed returns AsyncEmbeddingProvider (dense only)
        - BGE_M3_ONNX returns MultiVectorEmbeddingProvider (dense + sparse)

    Raises:
        ValueError: If the provider type is not supported

    Note:
        BGE-M3 dense-only is supported via FastEmbed.
        BGE-M3 dense+sparse is supported via BGE_M3_ONNX provider (aapot/bge-m3-onnx).
    """
    # Convert string to enum if necessary
    if isinstance(provider_type, str):
        try:
            provider_type = EmbeddingProviderType(provider_type)
        except ValueError as e:
            raise ValueError(f"Unsupported embedding provider: {provider_type}") from e

    if provider_type == EmbeddingProviderType.FASTEMBED:
        from vector_store.embeddings.fastembed import FastEmbedProvider

        return FastEmbedProvider(model_name=model_name, cache_dir=cache_dir)

    if provider_type == EmbeddingProviderType.BGE_M3_ONNX:
        from vector_store.embeddings.bge_m3_onnx import BGEM3ONNXProvider

        return BGEM3ONNXProvider(model_name=model_name, cache_dir=cache_dir, **kwargs)

    raise ValueError(f"Unsupported embedding provider: {provider_type}")
