"""Abstract base class for async embedding providers."""

from abc import ABC, abstractmethod


class AsyncEmbeddingProvider(ABC):
    """Abstract base class for async embedding providers."""

    @abstractmethod
    async def embed_query(self, query: str) -> list[float]:
        """
        Embed a single query into a vector.

        Args:
            query: Text query to embed

        Returns:
            Embedding vector as list of floats
        """
        pass

    @abstractmethod
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """
        Embed multiple texts into vectors.

        Args:
            texts: List of text strings to embed

        Returns:
            List of embedding vectors
        """
        pass

    @abstractmethod
    def get_vector_size(self) -> int:
        """
        Get the dimensionality of the embedding vectors.

        Returns:
            Vector dimension size
        """
        pass

    def warm_up(self) -> None:  # noqa: B027
        """Pre-load model resources (download if needed, load into memory).

        Override in subclasses to eagerly initialize models at startup
        rather than on first use. Safe to call multiple times.
        """
        pass

    def cleanup(self) -> None:  # noqa: B027
        """Release model resources to free memory. Safe to call multiple times."""
        pass
