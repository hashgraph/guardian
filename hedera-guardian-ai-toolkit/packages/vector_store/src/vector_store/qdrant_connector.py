"""Unified async Qdrant connector for vector operations."""

import asyncio
import logging
import math
from typing import Any
from uuid import uuid4

from qdrant_client import AsyncQdrantClient, models

from vector_store.embeddings.base import AsyncEmbeddingProvider
from vector_store.embeddings.multi_vector_base import EmbeddingOutput, MultiVectorEmbeddingProvider
from vector_store.models import (
    CollectionStats,
    DocumentPayload,
    SearchResult,
    create_payload_field_schema,
)

logger = logging.getLogger(__name__)


class QdrantConnector:
    """
    Unified async connector for Qdrant vector store operations.

    Provides a high-level interface for document storage and semantic search
    using Qdrant with async operations throughout.

    Args:
        url: Qdrant server URL
        collection_name: Name of the collection to operate on
        embedding_provider: Async embedding provider for generating vectors
        api_key: Optional API key for Qdrant authentication
        timeout: Timeout for Qdrant operations in seconds
        client: Optional pre-configured AsyncQdrantClient for dependency injection
    """

    def __init__(
        self,
        url: str,
        collection_name: str,
        embedding_provider: AsyncEmbeddingProvider | MultiVectorEmbeddingProvider | None = None,
        api_key: str | None = None,
        timeout: int = 60,
        client: AsyncQdrantClient | None = None,
    ):
        self.url = url
        self.collection_name = collection_name
        self.embedding_provider = embedding_provider
        self.api_key = api_key
        self.timeout = timeout

        # Use injected client or create a new one
        self._owns_client = client is None
        self._client = (
            client
            if client is not None
            else AsyncQdrantClient(
                url=url,
                api_key=api_key,
                timeout=timeout,
            )
        )

    def _is_hybrid_provider(self) -> bool:
        """Check if provider supports multi-vector output (dense + sparse)."""
        return isinstance(self.embedding_provider, MultiVectorEmbeddingProvider)

    def _is_valid_embedding_output(self, embedding: Any) -> bool:
        """
        Validate that data matches EmbeddingOutput TypedDict structure.

        Args:
            embedding: Data to validate

        Returns:
            True if valid EmbeddingOutput, False otherwise
        """
        if not isinstance(embedding, dict):
            return False

        # Check required keys
        if "dense" not in embedding or "sparse" not in embedding:
            return False

        # Validate dense is a list of numbers
        if not isinstance(embedding["dense"], list):
            return False
        if embedding["dense"] and not all(
            isinstance(x, int | float)
            for x in embedding["dense"][:10]  # Sample check
        ):
            return False

        # Validate sparse is a dict with int keys and numeric values
        return isinstance(embedding["sparse"], dict)

    def _create_sparse_vector(
        self, sparse_dict: dict[int, float], max_token_id: int = 250002
    ) -> models.SparseVector:
        """
        Validate and convert sparse dict to Qdrant SparseVector.

        Args:
            sparse_dict: Token ID to weight mapping
            max_token_id: Maximum valid token ID (BGE-M3 vocab size)

        Returns:
            Qdrant SparseVector object

        Raises:
            ValueError: If sparse dict contains invalid data
        """
        if not sparse_dict:
            # Return minimal sparse vector for empty case
            logger.debug("Empty sparse vector, using minimal fallback")
            return models.SparseVector(indices=[0], values=[0.01])

        indices = []
        values = []

        for token_id, weight in sparse_dict.items():
            # Validate token ID
            if not isinstance(token_id, int) or token_id < 0 or token_id >= max_token_id:
                raise ValueError(
                    f"Invalid sparse token ID: {token_id} (must be int in [0, {max_token_id}))"
                )

            # Validate weight
            if not isinstance(weight, int | float):
                raise ValueError(f"Invalid sparse weight for token {token_id}: {weight}")
            if not math.isfinite(weight):
                raise ValueError(f"Sparse weight must be finite for token {token_id}: {weight}")

            indices.append(token_id)
            values.append(float(weight))

        return models.SparseVector(indices=indices, values=values)

    async def ensure_collection_exists(
        self,
        vector_size: int | None = None,
        distance: models.Distance = models.Distance.COSINE,
    ) -> None:
        """
        Ensure the collection exists, creating it if necessary.

        For hybrid providers (MultiVectorEmbeddingProvider), creates a collection
        with named vectors (dense + sparse). For standard providers, creates a
        single vector collection.

        Args:
            vector_size: Size of embedding vectors (auto-detected if not provided)
            distance: Distance metric to use (default: COSINE)
        """
        # If hybrid provider, delegate to hybrid collection creation
        if self._is_hybrid_provider():
            await self.ensure_hybrid_collection_exists(
                dense_vector_size=vector_size, dense_distance=distance
            )
            return

        exists = await self._client.collection_exists(self.collection_name)
        if exists:
            logger.info(f"Collection '{self.collection_name}' already exists")
            return

        # Auto-detect vector size if not provided
        if vector_size is None:
            if self.embedding_provider is None:
                raise ValueError("vector_size is required when no embedding_provider is configured")
            vector_size = self.embedding_provider.get_vector_size()

        logger.info(f"Creating collection '{self.collection_name}' with vector size {vector_size}")

        await self._client.create_collection(
            collection_name=self.collection_name,
            vectors_config=models.VectorParams(
                size=vector_size,
                distance=distance,
            ),
        )

    async def ensure_hybrid_collection_exists(
        self,
        dense_vector_size: int | None = None,
        dense_distance: models.Distance = models.Distance.COSINE,
    ) -> None:
        """
        Create collection with named vectors: dense + sparse for hybrid search.

        Args:
            dense_vector_size: Size of dense vectors (auto-detected if not provided)
            dense_distance: Distance metric for dense vectors (default: COSINE)
        """
        exists = await self._client.collection_exists(self.collection_name)
        if exists:
            logger.info(f"Collection '{self.collection_name}' already exists")
            return

        # Auto-detect dense vector size
        if dense_vector_size is None:
            if self.embedding_provider is None:
                raise ValueError(
                    "dense_vector_size is required when no embedding_provider is configured"
                )
            if self._is_hybrid_provider():
                dense_vector_size = self.embedding_provider.get_dense_vector_size()
            else:
                dense_vector_size = self.embedding_provider.get_vector_size()

        logger.info(
            f"Creating hybrid collection '{self.collection_name}' with "
            f"dense ({dense_vector_size}-dim) + sparse vectors"
        )

        await self._client.create_collection(
            collection_name=self.collection_name,
            vectors_config={
                "dense": models.VectorParams(
                    size=dense_vector_size,
                    distance=dense_distance,
                ),
            },
            sparse_vectors_config={
                "sparse": models.SparseVectorParams(),
            },
        )

    async def create_text_index(
        self,
        field_name: str,
        tokenizer: models.TokenizerType = models.TokenizerType.WORD,
        min_token_len: int = 2,
        max_token_len: int = 50,
        lowercase: bool = True,
    ) -> None:
        """
        Create a text index on a payload field for MatchText filtering.

        Text indexes enable full-text search with tokenization on the field.
        Required for using MatchText filter conditions in queries.

        Args:
            field_name: Payload field path (e.g., "metadata.full_path")
            tokenizer: Tokenizer type (WORD splits on word boundaries)
            min_token_len: Minimum token length (default 2)
            max_token_len: Maximum token length (default 50)
            lowercase: Whether to lowercase tokens (default True)
        """
        logger.info(f"Creating text index on '{field_name}' in collection '{self.collection_name}'")

        await self._client.create_payload_index(
            collection_name=self.collection_name,
            field_name=field_name,
            field_schema=models.TextIndexParams(
                type="text",
                tokenizer=tokenizer,
                min_token_len=min_token_len,
                max_token_len=max_token_len,
                lowercase=lowercase,
            ),
        )

        logger.info(f"Text index on '{field_name}' created successfully")

    async def ensure_payload_indexes(
        self,
        indexes: list[tuple[str, models.PayloadSchemaType]],
    ) -> None:
        """
        Ensure payload indexes exist on the collection, creating missing ones.

        Checks existing indexes via ``get_collection().payload_schema`` and
        only creates indexes that are not already present.  Each creation uses
        ``wait=True`` so the index is ready before returning (important at
        startup).  Individual failures are logged as warnings but do **not**
        block other indexes from being created.

        Args:
            indexes: List of ``(field_name, field_schema)`` tuples, e.g.
                ``[("metadata.source_name", models.PayloadSchemaType.KEYWORD)]``
        """
        if not indexes:
            return

        exists = await self._client.collection_exists(self.collection_name)
        if not exists:
            logger.warning(
                f"Collection '{self.collection_name}' does not exist, "
                "skipping payload index creation"
            )
            return

        # Fetch existing payload indexes
        collection_info = await self._client.get_collection(self.collection_name)
        existing_indexes = (
            set(collection_info.payload_schema.keys()) if collection_info.payload_schema else set()
        )

        for field_name, field_schema in indexes:
            if field_name in existing_indexes:
                logger.debug(
                    f"Payload index on '{field_name}' already exists in "
                    f"'{self.collection_name}', skipping"
                )
                continue

            try:
                logger.info(
                    f"Creating payload index on '{field_name}' "
                    f"({field_schema}) in '{self.collection_name}'"
                )
                await self._client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name=field_name,
                    field_schema=field_schema,
                    wait=True,
                )
                logger.info(f"Payload index on '{field_name}' created successfully")
            except Exception:
                logger.exception(
                    "Failed to create payload index on '%s' in '%s'",
                    field_name,
                    self.collection_name,
                )

    async def add_pre_embedded_documents(
        self,
        documents: list[str],
        embeddings: list[list[float]] | list[EmbeddingOutput],
        metadata: list[dict[str, Any]] | None = None,
        ids: list[str] | None = None,
    ) -> list[str]:
        """
        Add documents with pre-computed embeddings to the collection.

        This method skips embedding generation and uses the provided embeddings directly,
        which is more efficient when embeddings are already computed in the pipeline.

        Supports both dense-only embeddings (list[float]) and hybrid embeddings
        (EmbeddingOutput with dense + sparse).

        Args:
            documents: List of document text chunks
            embeddings: Pre-computed embeddings (dense-only or hybrid EmbeddingOutput)
            metadata: Optional metadata dicts (one per document)
            ids: Optional IDs (auto-generated if not provided)

        Returns:
            List of point IDs for the added documents

        Raises:
            ValueError: If list lengths don't match
        """
        if not documents:
            return []

        # Validate input lengths
        if len(documents) != len(embeddings):
            raise ValueError("Documents and embeddings lists must have same length")

        if metadata is not None and len(metadata) != len(documents):
            raise ValueError("Metadata list must match documents list length")

        # Generate IDs if not provided
        if ids is None:
            ids = [str(uuid4()) for _ in documents]
        elif len(ids) != len(documents):
            raise ValueError("IDs list must match documents list length")

        # Detect and validate embedding format
        if embeddings and self._is_valid_embedding_output(embeddings[0]):
            is_hybrid_embedding = True
        elif embeddings and isinstance(embeddings[0], list):
            is_hybrid_embedding = False
        else:
            raise ValueError(
                "Invalid embedding format. Must be list[float] for dense-only "
                "or EmbeddingOutput dict with 'dense' and 'sparse' keys."
            )

        # Ensure collection exists (will create hybrid collection if hybrid provider)
        if is_hybrid_embedding and not self._is_hybrid_provider():
            # Force hybrid collection creation for hybrid embeddings.
            # Derive dense_vector_size from the first embedding when no provider is set.
            dense_size = len(embeddings[0]["dense"]) if self.embedding_provider is None else None
            await self.ensure_hybrid_collection_exists(dense_vector_size=dense_size)
        else:
            await self.ensure_collection_exists()

        # Handle hybrid embeddings
        if is_hybrid_embedding:
            return await self._add_pre_embedded_hybrid_internal(
                documents, embeddings, metadata, ids
            )

        # Create points for dense-only embeddings (NO embedding generation)
        points = []
        for i, (doc, embedding, point_id) in enumerate(
            zip(documents, embeddings, ids, strict=False)
        ):
            payload = DocumentPayload(
                document_chunk=doc,
                metadata=metadata[i] if metadata else None,
            )
            points.append(
                models.PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload=payload.model_dump(),
                )
            )

        # Upload to Qdrant
        logger.info(
            f"Uploading {len(points)} pre-embedded points to collection '{self.collection_name}'"
        )
        await self._client.upsert(
            collection_name=self.collection_name,
            points=points,
        )

        return ids

    async def _add_pre_embedded_hybrid_internal(
        self,
        documents: list[str],
        embeddings: list[EmbeddingOutput],
        metadata: list[dict[str, Any]] | None,
        ids: list[str],
    ) -> list[str]:
        """Internal method to add documents with pre-computed hybrid embeddings."""
        points = []
        for i, (doc, embedding, point_id) in enumerate(
            zip(documents, embeddings, ids, strict=False)
        ):
            payload = DocumentPayload(
                document_chunk=doc,
                metadata=metadata[i] if metadata else None,
            )

            # Convert sparse dict to validated SparseVector
            sparse_vector = self._create_sparse_vector(embedding["sparse"])

            points.append(
                models.PointStruct(
                    id=point_id,
                    vector={
                        "dense": embedding["dense"],
                        "sparse": sparse_vector,
                    },
                    payload=payload.model_dump(),
                )
            )

        # Upload to Qdrant
        logger.info(
            f"Uploading {len(points)} pre-embedded hybrid points to collection '{self.collection_name}'"
        )
        await self._client.upsert(
            collection_name=self.collection_name,
            points=points,
        )

        return ids

    async def search(
        self,
        query: str | None = None,
        limit: int = 5,
        offset: int | None = None,
        score_threshold: float | None = None,
        query_filter: models.Filter | dict | None = None,
    ) -> list[SearchResult]:
        """
        Search for similar documents using semantic search or filter-only search.

        For hybrid providers (MultiVectorEmbeddingProvider), automatically
        uses hybrid search with Reciprocal Rank Fusion (RRF).

        Args:
            query: Optional text query to search for. If None, performs filter-only search.
            limit: Maximum number of results to return
            offset: Number of results to skip (for pagination)
            score_threshold: Optional minimum similarity score (only used with query)
            query_filter: Optional Qdrant filter (models.Filter or dict) for the search

        Returns:
            List of search results with content, score, and metadata
        """
        # Normalize empty string to None
        if query is not None and query.strip() == "":
            query = None

        if query is not None and self.embedding_provider is None:
            raise ValueError(
                "embedding_provider is required for semantic search. "
                "Use query=None for filter-only search, or provide an embedding_provider."
            )

        # If hybrid provider, use hybrid search
        if self._is_hybrid_provider():
            return await self.hybrid_search(
                query=query,
                limit=limit,
                score_threshold=score_threshold,
                query_filter=query_filter,
                offset=offset,
            )

        # Check if collection exists
        exists = await self._client.collection_exists(self.collection_name)
        if not exists:
            logger.warning(f"Collection '{self.collection_name}' does not exist")
            return []

        # Build search params
        search_params = {
            "collection_name": self.collection_name,
            "limit": limit,
            "offset": offset,
        }

        # Only embed query and add query vector if query is provided
        if query is not None:
            logger.debug(f"Embedding query: {query[:100]}...")
            query_vector = await self.embedding_provider.embed_query(query)
            search_params["query"] = query_vector
            # Specify vector name for collections with named vectors (dense + sparse)
            search_params["using"] = "dense"

            if score_threshold is not None:
                search_params["score_threshold"] = score_threshold

        if query_filter is not None:
            search_params["query_filter"] = query_filter

            # ACORN improves filtered HNSW recall via 2-hop neighbor exploration (Qdrant v1.16+).
            if query is not None:
                search_params["search_params"] = models.SearchParams(
                    acorn=models.AcornSearchParams(enable=True)
                )

        # Search in Qdrant
        search_results = await self._client.query_points(**search_params)

        # Map results to SearchResult models
        results = []
        for result in search_results.points:
            payload = DocumentPayload(**result.payload)
            results.append(
                SearchResult(
                    content=payload.document_chunk,
                    score=result.score,
                    metadata=payload.metadata,
                )
            )

        search_type = "semantic" if query is not None else "filter-only"
        logger.info(f"Found {len(results)} results for {search_type} search")
        return results

    async def hybrid_search(
        self,
        query: str | None = None,
        limit: int = 10,
        prefetch_limit: int = 20,
        score_threshold: float | None = None,
        query_filter: models.Filter | None = None,
        offset: int | None = None,
    ) -> list[SearchResult]:
        """
        Hybrid search using Reciprocal Rank Fusion (RRF) of dense and sparse results.

        This method performs a two-stage search:
        1. Prefetch: Retrieve candidates using both dense and sparse vectors
        2. Fusion: Combine results using RRF for better ranking

        Args:
            query: Text query to search for
            limit: Maximum number of results to return after fusion
            prefetch_limit: Number of results to fetch per vector type before fusion
            score_threshold: Optional minimum similarity score (applied after fusion)
            query_filter: Optional Qdrant filter for the search

        Returns:
            List of search results with content, score, and metadata
        """
        # Normalize empty string to None
        if query is not None and query.strip() == "":
            query = None

        if query is not None and self.embedding_provider is None:
            raise ValueError(
                "embedding_provider is required for hybrid search with a query. "
                "Use query=None for filter-only search, or provide an embedding_provider."
            )

        # Check if collection exists
        exists = await self._client.collection_exists(self.collection_name)
        if not exists:
            logger.warning(f"Collection '{self.collection_name}' does not exist")
            return []

        # Build search params with RRF fusion
        search_params = {
            "collection_name": self.collection_name,
            "limit": limit,
            "offset": offset,
        }

        effective_prefetch = prefetch_limit

        if query is not None:
            # Generate query embeddings (dense + sparse)
            logger.debug(f"Generating hybrid query embeddings: {query[:100]}...")
            query_embedding = await self.embedding_provider.embed_query(query)

            # Convert sparse dict to validated SparseVector
            sparse_vector = self._create_sparse_vector(query_embedding["sparse"])

            # Increase prefetch candidates when filtering to ensure enough
            # results survive for RRF fusion after selective filters.
            effective_prefetch = max(prefetch_limit, limit * 4) if query_filter else prefetch_limit

            # Build prefetch queries for both vector types.
            # Filters are placed inside each Prefetch explicitly (best practice)
            # rather than relying on top-level propagation.
            # ACORN improves filtered HNSW recall via 2-hop neighbor exploration.
            acorn_params = (
                models.SearchParams(acorn=models.AcornSearchParams(enable=True))
                if query_filter
                else None
            )

            prefetch_queries = [
                models.Prefetch(
                    query=query_embedding["dense"],
                    using="dense",
                    limit=effective_prefetch,
                    filter=query_filter,
                    params=acorn_params,
                ),
                models.Prefetch(
                    query=sparse_vector,
                    using="sparse",
                    limit=effective_prefetch,
                    filter=query_filter,
                    params=None,  # ACORN only affects HNSW (dense), not inverted index
                ),
            ]

            search_params["prefetch"] = prefetch_queries
            search_params["query"] = models.FusionQuery(fusion=models.Fusion.RRF)
        elif query_filter is not None:
            # Filter-only path (no query, no Prefetch) - use top-level filter
            search_params["query_filter"] = query_filter

        if query is not None:
            logger.debug(
                f"Performing hybrid search with RRF (prefetch={effective_prefetch}, limit={limit})"
            )
        elif query_filter is not None:
            logger.debug(f"Performing filter-only search (limit={limit})")
        else:
            logger.debug(f"Performing unfiltered search (limit={limit})")
        search_results = await self._client.query_points(**search_params)

        # Map results to SearchResult models
        results = []
        for result in search_results.points:
            # Apply score threshold if specified (after fusion)
            if score_threshold is not None and result.score < score_threshold:
                continue

            payload = DocumentPayload(**result.payload)
            results.append(
                SearchResult(
                    content=payload.document_chunk,
                    score=result.score,
                    metadata=payload.metadata,
                )
            )

        search_type = (
            "hybrid" if query is not None else ("filter-only" if query_filter else "unfiltered")
        )
        logger.info(f"Found {len(results)} {search_type} search results")
        return results

    async def clear_collection(self) -> None:
        """
        Delete all points from the collection.

        Note: This keeps the collection but removes all data.

        Raises:
            TimeoutError: If operation exceeds 30 seconds
        """
        try:
            async with asyncio.timeout(30):  # 30-second timeout
                exists = await self._client.collection_exists(self.collection_name)
                if not exists:
                    logger.warning(f"Collection '{self.collection_name}' does not exist")
                    return

                logger.warning(f"Clearing all points from collection '{self.collection_name}'")
                # Delete all points using PointIdsList with empty list means delete all
                await self._client.delete(
                    collection_name=self.collection_name,
                    points_selector=models.FilterSelector(
                        filter=models.Filter()  # Empty filter matches all points
                    ),
                )
        except TimeoutError:
            raise TimeoutError(
                f"Timeout clearing collection '{self.collection_name}' after 30 seconds"
            )

    async def delete_collection(self) -> None:
        """
        Delete the entire collection.

        Warning: This permanently removes the collection and all its data.
        """
        exists = await self._client.collection_exists(self.collection_name)
        if not exists:
            logger.warning(f"Collection '{self.collection_name}' does not exist")
            return

        logger.warning(f"Deleting collection '{self.collection_name}'")
        await self._client.delete_collection(self.collection_name)

    async def get_stats(self) -> CollectionStats:
        """
        Get statistics about the collection.

        Returns:
            Collection statistics including point count and status.
            If the collection does not exist, returns a CollectionStats
            with zero counts and status ``"not_found"``.

        Raises:
            TimeoutError: If operation exceeds 10 seconds
        """
        try:
            async with asyncio.timeout(10):  # 10-second timeout for stats
                exists = await self._client.collection_exists(self.collection_name)
                if not exists:
                    logger.warning(f"Collection '{self.collection_name}' does not exist")
                    return CollectionStats(
                        name=self.collection_name,
                        vectors_count=0,
                        points_count=0,
                        indexed_vectors_count=0,
                        status="not_found",
                        config=None,
                    )

                info = await self._client.get_collection(self.collection_name)

                # Extract vector config - handle both VectorParams object and dict (named vectors)
                config_dict = None
                if info.config:
                    vectors = info.config.params.vectors
                    if isinstance(vectors, dict):
                        # Named vectors - get first vector config
                        first_key = next(iter(vectors), None)
                        if first_key:
                            vec_config = vectors[first_key]
                            config_dict = {
                                "vector_size": getattr(vec_config, "size", None),
                                "distance": getattr(vec_config.distance, "value", None)
                                if hasattr(vec_config, "distance")
                                else None,
                            }
                    else:
                        # Single anonymous vector - VectorParams object
                        config_dict = {
                            "vector_size": vectors.size,
                            "distance": vectors.distance.value,
                        }

                # Extract payload schema (indexed fields and their types)
                payload_schema_list = None
                if info.payload_schema:
                    payload_schema_list = [
                        create_payload_field_schema(
                            key=field_name,
                            data_type_value=field_info.data_type.value,
                        )
                        for field_name, field_info in info.payload_schema.items()
                    ]

                return CollectionStats(
                    name=self.collection_name,
                    vectors_count=info.points_count or 0,  # vectors_count = points_count in Qdrant
                    points_count=info.points_count or 0,
                    indexed_vectors_count=info.indexed_vectors_count or 0,
                    status=info.status.value if info.status else "unknown",
                    config=config_dict,
                    payload_schema=payload_schema_list,
                )
        except TimeoutError:
            raise TimeoutError(
                f"Timeout getting stats for collection '{self.collection_name}' after 10 seconds"
            )

    async def close(self) -> None:
        """Close the Qdrant client connection if this connector owns it."""
        if self._owns_client:
            await self._client.close()

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
