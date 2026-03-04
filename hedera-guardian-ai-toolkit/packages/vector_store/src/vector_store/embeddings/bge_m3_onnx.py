"""BGE-M3 ONNX embedding provider with dense + sparse output."""

import asyncio
import logging
import threading
import time
from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path

import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

from vector_store.embeddings.multi_vector_base import EmbeddingOutput, MultiVectorEmbeddingProvider

logger = logging.getLogger(__name__)


@contextmanager
def _progress_heartbeat(operation: str, interval_seconds: int = 10) -> Generator[None, None, None]:
    """Log periodic progress messages during long-running operations."""
    stop_event = threading.Event()
    start = time.monotonic()

    def heartbeat() -> None:
        while not stop_event.wait(interval_seconds):
            elapsed = int(time.monotonic() - start)
            logger.info(f"{operation}... ({elapsed}s elapsed)")

    thread = threading.Thread(target=heartbeat, daemon=True)
    thread.start()
    try:
        yield
    finally:
        stop_event.set()
        thread.join(timeout=1)


class BGEM3ONNXProvider(MultiVectorEmbeddingProvider):
    """
    BGE-M3 ONNX embedding provider outputting dense + sparse vectors.

    Uses aapot/bge-m3-onnx model which provides:
    - Dense embeddings (1024-dim, normalized)
    - Sparse embeddings (token weights for lexical matching)

    Args:
        model_name: Hugging Face model ID (default: "aapot/bge-m3-onnx")
        cache_dir: Optional cache directory for model files
        max_inference_batch_size: Maximum texts per ONNX session.run() call.
            Limits peak memory from attention matrices and ColBERT output.
            The caller can pass any batch size; this provider internally
            sub-batches to stay within ONNX memory bounds. Default: 64.
        execution_providers: ONNX Runtime execution providers. None (default)
            auto-detects CUDA if available, otherwise falls back to CPU.
    """

    def __init__(
        self,
        model_name: str = "aapot/bge-m3-onnx",
        cache_dir: str | None = None,
        max_inference_batch_size: int = 64,
        execution_providers: list[str] | None = None,
    ):
        self.model_name = model_name
        self.cache_dir = Path(cache_dir) if cache_dir else None
        self.max_inference_batch_size = max_inference_batch_size
        self._execution_providers = execution_providers
        self._ort_session: ort.InferenceSession | None = None
        self._tokenizer = None
        self._dense_vector_size = 1024  # BGE-M3 output dimension
        self._init_lock = threading.Lock()

    def _resolve_providers(self) -> list[str]:
        """Resolve ONNX Runtime execution providers.

        Priority: explicit > auto-detect > CPU fallback.
        """
        if self._execution_providers:
            return list(self._execution_providers)  # copy to prevent mutation
        available = ort.get_available_providers()
        if "CUDAExecutionProvider" in available:
            return ["CUDAExecutionProvider", "CPUExecutionProvider"]
        return ["CPUExecutionProvider"]

    def _build_provider_options(self, providers: list[str]) -> list[dict] | None:
        """Build provider-specific options.

        For CUDA: limits arena growth to prevent VRAM over-allocation.
        """
        if "CUDAExecutionProvider" not in providers:
            return None
        # One dict per provider, positional match to providers list
        options: list[dict] = []
        for p in providers:
            if p == "CUDAExecutionProvider":
                options.append({"arena_extend_strategy": "kSameAsRequested"})
            else:
                options.append({})
        return options

    def _get_session(self) -> ort.InferenceSession:
        """Lazy load ONNX Runtime session (thread-safe via double-checked locking)."""
        if self._ort_session is not None:
            return self._ort_session

        with self._init_lock:
            if self._ort_session is not None:
                return self._ort_session

            from huggingface_hub import hf_hub_download

            # Download model files to a local directory with correct filenames.
            # Using local_dir avoids symlinks in the HF blob cache, which
            # ONNX Runtime >=1.20 rejects due to path validation security hardening.
            model_dir = self._get_model_dir()

            logger.info(
                f"Preparing embedding model files ({self.model_name}). "
                "First run will download ~2.3 GB and may take several minutes..."
            )

            t0 = time.perf_counter()
            try:
                with _progress_heartbeat("Downloading embedding model"):
                    hf_hub_download(
                        repo_id=self.model_name,
                        filename="model.onnx",
                        local_dir=str(model_dir),
                    )
                    hf_hub_download(
                        repo_id=self.model_name,
                        filename="model.onnx.data",
                        local_dir=str(model_dir),
                    )
            except Exception:
                logger.error(
                    f"Failed to obtain embedding model files after {time.perf_counter() - t0:.1f}s"
                )
                raise
            download_elapsed = time.perf_counter() - t0

            if download_elapsed > 5.0:
                logger.info(f"Embedding model files ready (downloaded in {download_elapsed:.1f}s)")
            else:
                logger.info(
                    f"Embedding model files ready (cached, validated in {download_elapsed:.1f}s)"
                )

            providers = self._resolve_providers()
            provider_options = self._build_provider_options(providers)

            logger.info("Loading embedding model into memory...")
            t1 = time.perf_counter()
            with _progress_heartbeat("Loading ONNX session"):
                session = ort.InferenceSession(
                    str(model_dir / "model.onnx"),
                    providers=providers,
                    provider_options=provider_options,
                )
            session_elapsed = time.perf_counter() - t1

            # Log active providers and detect fallback
            active = session.get_providers()
            logger.info(f"ONNX Runtime active providers: {active}")
            if providers[0] not in active:
                logger.warning(
                    f"Requested provider {providers[0]} not active. "
                    f"Active: {active}. Falling back to CPU."
                )
            elif "CUDAExecutionProvider" in active:
                logger.info("GPU acceleration active — ONNX inference will use CUDA")

            logger.info(f"Embedding model loaded from {self.model_name} in {session_elapsed:.1f}s")

            # Publish only after fully initialized
            self._ort_session = session

        return self._ort_session

    def _get_model_dir(self) -> Path:
        """Get the local directory for ONNX model files."""
        if self.cache_dir:
            cache_base = self.cache_dir
        else:
            from huggingface_hub.constants import HF_HOME  # noqa: PLC0415

            cache_base = Path(HF_HOME)
        model_dir = cache_base / "onnx_models" / self.model_name.replace("/", "--")
        model_dir.mkdir(parents=True, exist_ok=True)
        return model_dir

    def _get_tokenizer(self):
        """Lazy load tokenizer (thread-safe via double-checked locking)."""
        if self._tokenizer is not None:
            return self._tokenizer

        with self._init_lock:
            if self._tokenizer is not None:
                return self._tokenizer

            logger.info("Loading tokenizer (BAAI/bge-m3)...")
            t0 = time.perf_counter()
            tokenizer = AutoTokenizer.from_pretrained(
                "BAAI/bge-m3", cache_dir=str(self.cache_dir) if self.cache_dir else None
            )
            logger.info(f"Tokenizer loaded in {time.perf_counter() - t0:.1f}s")

            self._tokenizer = tokenizer

        return self._tokenizer

    def _process_outputs(
        self,
        dense_output: np.ndarray,
        sparse_output: np.ndarray,
        attention_mask: np.ndarray,
        input_ids: np.ndarray,
    ) -> EmbeddingOutput:
        """
        Process ONNX model outputs into dense + sparse format.

        Sparse indices are vocabulary token IDs from ``input_ids`` (not
        sequence positions) so that Qdrant sparse vectors match across
        different texts sharing the same vocabulary terms.

        Args:
            dense_output: Dense embedding (batch_size, dim)
            sparse_output: Sparse logits (batch_size, seq_len)
            attention_mask: Attention mask (batch_size, seq_len)
            input_ids: Token IDs from tokenizer (batch_size, seq_len)

        Returns:
            EmbeddingOutput with dense and sparse vectors
        """
        # Dense: Already normalized by model, shape (batch_size, 1024)
        dense = dense_output[0].tolist()

        # Sparse: Extract token weights keyed by vocabulary token ID.
        # Squeeze to handle (seq_len, 1) -> (seq_len,) per official aapot/bge-m3-onnx docs
        sparse_logits = np.squeeze(sparse_output[0])  # (seq_len,)
        mask = attention_mask[0]  # (seq_len,)
        ids = input_ids[0]  # (seq_len,)

        # Filter out special tokens that carry no lexical meaning
        tokenizer = self._get_tokenizer()
        unused_tokens = {
            tokenizer.cls_token_id,
            tokenizer.eos_token_id,
            tokenizer.pad_token_id,
            tokenizer.unk_token_id,
        }

        # Use vocab token IDs as keys; max-aggregate duplicates
        sparse_weights: dict[int, float] = {}
        for vocab_id, logit, is_valid in zip(ids, sparse_logits, mask, strict=False):
            if not is_valid or logit <= 0:
                continue
            tid = int(vocab_id)
            if tid in unused_tokens:
                continue
            weight = float(logit)
            prev = sparse_weights.get(tid, 0.0)
            if weight > prev:
                sparse_weights[tid] = weight

        return EmbeddingOutput(dense=dense, sparse=sparse_weights)

    async def embed_query(self, query: str) -> EmbeddingOutput:
        """
        Embed a single query into dense + sparse vectors.

        Args:
            query: Text query to embed

        Returns:
            EmbeddingOutput with dense and sparse vectors
        """
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._embed_sync, query)

    def _embed_sync(self, text: str) -> EmbeddingOutput:
        """Synchronous embedding for single text."""
        session = self._get_session()
        tokenizer = self._get_tokenizer()

        # Tokenize
        inputs = tokenizer(
            text, padding="longest", truncation=True, max_length=512, return_tensors="np"
        )

        # Run ONNX inference
        onnx_inputs = {k: ort.OrtValue.ortvalue_from_numpy(v) for k, v in inputs.items()}
        outputs = session.run(None, onnx_inputs)

        # aapot/bge-m3-onnx outputs: [dense, sparse, colbert]
        # We only use dense (outputs[0]) and sparse (outputs[1])
        return self._process_outputs(
            dense_output=outputs[0],
            sparse_output=outputs[1],
            attention_mask=inputs["attention_mask"],
            input_ids=inputs["input_ids"],
        )

    async def embed_batch(self, texts: list[str]) -> list[EmbeddingOutput]:
        """
        Embed multiple texts into dense + sparse vectors.

        Args:
            texts: List of text strings to embed

        Returns:
            List of EmbeddingOutput dictionaries
        """
        if not texts:
            return []

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._embed_batch_sync, texts)

    def _embed_batch_sync(self, texts: list[str]) -> list[EmbeddingOutput]:
        """Synchronous embedding for batch with ONNX inference sub-batching.

        Splits texts into sub-batches of max_inference_batch_size to bound
        peak ONNX Runtime memory (attention matrices + ColBERT output).
        """
        results: list[EmbeddingOutput] = []

        for start in range(0, len(texts), self.max_inference_batch_size):
            sub_batch = texts[start : start + self.max_inference_batch_size]
            results.extend(self._run_onnx_inference(sub_batch))

        return results

    def _run_onnx_inference(self, texts: list[str]) -> list[EmbeddingOutput]:
        """Run ONNX inference on a single sub-batch of texts."""
        session = self._get_session()
        tokenizer = self._get_tokenizer()

        # Tokenize batch
        inputs = tokenizer(
            texts, padding="longest", truncation=True, max_length=512, return_tensors="np"
        )

        # Run ONNX inference
        onnx_inputs = {k: ort.OrtValue.ortvalue_from_numpy(v) for k, v in inputs.items()}
        outputs = session.run(None, onnx_inputs)

        # Process each item in batch
        results = []
        batch_size = outputs[0].shape[0]
        for i in range(batch_size):
            result = self._process_outputs(
                dense_output=outputs[0][i : i + 1],
                sparse_output=outputs[1][i : i + 1],
                attention_mask=inputs["attention_mask"][i : i + 1],
                input_ids=inputs["input_ids"][i : i + 1],
            )
            results.append(result)

        return results

    def get_dense_vector_size(self) -> int:
        """
        Get the dimensionality of dense embedding vectors.

        Returns:
            Dense vector dimension size (1024 for BGE-M3)
        """
        return self._dense_vector_size

    def warm_up(self) -> None:
        """Pre-load ONNX session and tokenizer."""
        self._get_session()
        self._get_tokenizer()

    def cleanup(self) -> None:
        """Release ONNX session and tokenizer to free memory. Safe to call multiple times.

        Acquires ``_init_lock`` to serialise with concurrent ``_get_session()`` /
        ``_get_tokenizer()`` calls, preventing cleanup from racing with initialisation.

        Note: ONNX Runtime may not fully release GPU VRAM when the session is deleted
        (ORT Issues #20548, #26831). VRAM is reclaimed when the process exits.
        """
        with self._init_lock:
            if self._ort_session is not None:
                logger.debug("Releasing ONNX Runtime session")
                self._ort_session = None
            if self._tokenizer is not None:
                logger.debug("Releasing tokenizer")
                self._tokenizer = None
