"""FastEmbed implementation of async embedding provider."""

import asyncio
import logging

from fastembed import TextEmbedding

from vector_store.embeddings.base import AsyncEmbeddingProvider

logger = logging.getLogger(__name__)


class FastEmbedProvider(AsyncEmbeddingProvider):
    """
    FastEmbed implementation of the async embedding provider.

    Uses asyncio executors to wrap the synchronous FastEmbed API
    for async compatibility.

    Args:
        model_name: The name of the FastEmbed model to use
        cache_dir: Optional cache directory for model files
    """

    def __init__(self, model_name: str, cache_dir: str | None = None):
        self.model_name = model_name
        self.cache_dir = cache_dir
        self._embedding_model: TextEmbedding | None = None
        self._vector_size: int | None = None

    def _get_model(self) -> TextEmbedding:
        """Lazy load the embedding model."""
        if self._embedding_model is None:
            kwargs = {"model_name": self.model_name}
            if self.cache_dir:
                kwargs["cache_dir"] = self.cache_dir
            self._embedding_model = TextEmbedding(**kwargs)
        return self._embedding_model

    async def embed_query(self, query: str) -> list[float]:
        """
        Embed a single query into a vector.

        Args:
            query: Text query to embed

        Returns:
            Embedding vector as list of floats
        """
        loop = asyncio.get_running_loop()
        model = self._get_model()
        embeddings = await loop.run_in_executor(None, lambda: list(model.query_embed([query])))
        return embeddings[0].tolist()

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """
        Embed multiple texts into vectors.

        Args:
            texts: List of text strings to embed

        Returns:
            List of embedding vectors
        """
        if not texts:
            return []

        loop = asyncio.get_running_loop()
        model = self._get_model()

        # Use passage_embed for batch embedding
        embeddings = await loop.run_in_executor(None, lambda: list(model.passage_embed(texts)))

        return [emb.tolist() for emb in embeddings]

    def get_vector_size(self) -> int:
        """
        Get the dimensionality of the embedding vectors.

        Returns:
            Vector dimension size
        """
        if self._vector_size is None:
            model = self._get_model()
            # Get a sample embedding to determine size
            sample_embedding = list(model.query_embed(["sample"]))[0]
            self._vector_size = len(sample_embedding)
        return self._vector_size

    def cleanup(self) -> None:
        """Release the FastEmbed model to free memory. Safe to call multiple times."""
        if self._embedding_model is not None:
            logger.debug("Releasing FastEmbed model")
            self._embedding_model = None
