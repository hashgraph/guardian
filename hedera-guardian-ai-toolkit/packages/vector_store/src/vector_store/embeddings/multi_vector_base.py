"""Abstract base class for multi-vector embedding providers (dense + sparse)."""

from abc import ABC, abstractmethod
from typing import TypedDict


class EmbeddingOutput(TypedDict):
    """Multi-vector embedding output from BGE-M3 style models."""

    dense: list[float]  # Traditional dense embedding (e.g., 1024-dim)
    sparse: dict[int, float]  # Sparse token weights (token_id -> weight)


class MultiVectorEmbeddingProvider(ABC):
    """
    Abstract base class for embedding providers that output multiple vector types.

    Used for models like BGE-M3 that produce both dense and sparse representations.
    Supports hybrid search combining semantic (dense) and lexical (sparse) retrieval.
    """

    @abstractmethod
    async def embed_query(self, query: str) -> EmbeddingOutput:
        """
        Embed a single query into dense + sparse vectors.

        Args:
            query: Text query to embed

        Returns:
            EmbeddingOutput with dense and sparse vectors
        """
        pass

    @abstractmethod
    async def embed_batch(self, texts: list[str]) -> list[EmbeddingOutput]:
        """
        Embed multiple texts into dense + sparse vectors.

        Args:
            texts: List of text strings to embed

        Returns:
            List of EmbeddingOutput dictionaries
        """
        pass

    @abstractmethod
    def get_dense_vector_size(self) -> int:
        """
        Get the dimensionality of dense embedding vectors.

        Returns:
            Dense vector dimension size (e.g., 1024 for BGE-M3)
        """
        pass

    async def embed_dense_only(self, text: str) -> list[float]:
        """
        Convenience method to get only dense embedding.

        Args:
            text: Text to embed

        Returns:
            Dense embedding vector
        """
        result = await self.embed_query(text)
        return result["dense"]

    async def embed_batch_dense_only(self, texts: list[str]) -> list[list[float]]:
        """
        Convenience method to get only dense embeddings for batch.

        Args:
            texts: List of texts to embed

        Returns:
            List of dense embedding vectors
        """
        results = await self.embed_batch(texts)
        return [r["dense"] for r in results]

    def warm_up(self) -> None:  # noqa: B027
        """Pre-load model resources (download if needed, load into memory).

        Override in subclasses to eagerly initialize models at startup
        rather than on first use. Safe to call multiple times.
        """
        pass

    def cleanup(self) -> None:  # noqa: B027
        """Release model resources to free memory. Safe to call multiple times."""
        pass
