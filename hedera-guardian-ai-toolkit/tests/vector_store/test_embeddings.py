"""Tests for embedding providers."""

import concurrent.futures
import threading
import time
from unittest.mock import Mock, patch

import numpy as np
import pytest

from vector_store import (
    EmbeddingProviderType,
    create_embedding_provider,
)
from vector_store.embeddings.bge_m3_onnx import BGEM3ONNXProvider, _progress_heartbeat
from vector_store.embeddings.fastembed import FastEmbedProvider


class TestEmbeddingFactory:
    """Tests for embedding provider factory."""

    def test_create_fastembed_provider(self):
        """Test creating FastEmbed provider."""
        provider = create_embedding_provider(
            provider_type=EmbeddingProviderType.FASTEMBED,
            model_name="test-model",
        )

        assert isinstance(provider, FastEmbedProvider)
        assert provider.model_name == "test-model"

    def test_create_provider_from_string(self):
        """Test creating provider from string enum value."""
        provider = create_embedding_provider(provider_type="fastembed", model_name="test-model")

        assert isinstance(provider, FastEmbedProvider)

    def test_create_bge_m3_onnx_provider(self):
        """Test creating BGE-M3 ONNX provider."""
        provider = create_embedding_provider(
            provider_type=EmbeddingProviderType.BGE_M3_ONNX,
            model_name="aapot/bge-m3-onnx",
        )

        assert isinstance(provider, BGEM3ONNXProvider)
        assert provider.model_name == "aapot/bge-m3-onnx"

    def test_create_bge_m3_onnx_from_string(self):
        """Test creating BGE-M3 ONNX provider from string."""
        provider = create_embedding_provider(
            provider_type="bge_m3_onnx", model_name="aapot/bge-m3-onnx"
        )

        assert isinstance(provider, BGEM3ONNXProvider)
        assert provider.model_name == "aapot/bge-m3-onnx"

    def test_create_bge_m3_onnx_with_execution_providers(self):
        """Test that execution_providers passes through factory to provider."""
        provider = create_embedding_provider(
            provider_type=EmbeddingProviderType.BGE_M3_ONNX,
            model_name="aapot/bge-m3-onnx",
            execution_providers=["CPUExecutionProvider"],
        )
        assert isinstance(provider, BGEM3ONNXProvider)
        assert provider._execution_providers == ["CPUExecutionProvider"]

    def test_unsupported_provider_type(self):
        """Test error on unsupported provider type."""
        with pytest.raises(ValueError, match="Unsupported embedding provider"):
            create_embedding_provider(provider_type="unsupported", model_name="test-model")


class TestFastEmbedProvider:
    """Tests for FastEmbed provider implementation."""

    @pytest.mark.asyncio
    async def test_embed_query(self):
        """Test embedding a single query."""
        with patch("vector_store.embeddings.fastembed.TextEmbedding") as mock_embedding:
            # Setup mock
            mock_model = Mock()
            mock_embedding.return_value = mock_model

            # Mock embedding output
            mock_result = Mock()
            mock_result.tolist.return_value = [0.1, 0.2, 0.3]
            mock_model.query_embed.return_value = [mock_result]

            # Test
            provider = FastEmbedProvider("test-model")
            result = await provider.embed_query("test query")

            assert result == [0.1, 0.2, 0.3]
            mock_model.query_embed.assert_called_once_with(["test query"])

    @pytest.mark.asyncio
    async def test_embed_batch(self):
        """Test embedding multiple texts."""
        with patch("vector_store.embeddings.fastembed.TextEmbedding") as mock_embedding:
            # Setup mock
            mock_model = Mock()
            mock_embedding.return_value = mock_model

            # Mock batch embedding output
            mock_results = [
                Mock(tolist=lambda: [0.1, 0.2, 0.3]),
                Mock(tolist=lambda: [0.4, 0.5, 0.6]),
            ]
            mock_model.passage_embed.return_value = mock_results

            # Test
            provider = FastEmbedProvider("test-model")
            results = await provider.embed_batch(["text1", "text2"])

            assert len(results) == 2
            assert results[0] == [0.1, 0.2, 0.3]
            assert results[1] == [0.4, 0.5, 0.6]
            mock_model.passage_embed.assert_called_once_with(["text1", "text2"])

    @pytest.mark.asyncio
    async def test_embed_batch_empty(self):
        """Test embedding empty batch."""
        provider = FastEmbedProvider("test-model")
        results = await provider.embed_batch([])

        assert results == []

    def test_get_vector_size(self):
        """Test getting vector dimension."""
        with patch("vector_store.embeddings.fastembed.TextEmbedding") as mock_embedding:
            # Setup mock
            mock_model = Mock()
            mock_embedding.return_value = mock_model

            # Mock embedding for size detection
            mock_result = Mock()
            mock_result.__len__ = Mock(return_value=1024)
            mock_model.query_embed.return_value = [mock_result]

            # Test
            provider = FastEmbedProvider("test-model")
            size = provider.get_vector_size()

            assert size == 1024
            # Should be cached
            size2 = provider.get_vector_size()
            assert size2 == 1024
            # query_embed should only be called once (cached)
            assert mock_model.query_embed.call_count == 1

    def test_lazy_model_loading(self):
        """Test that model is loaded lazily."""
        with patch("vector_store.embeddings.fastembed.TextEmbedding") as mock_embedding:
            # Create provider
            provider = FastEmbedProvider("test-model")

            # Model should not be loaded yet
            mock_embedding.assert_not_called()

            # Access internal method to trigger loading
            provider._get_model()

            # Now it should be loaded
            mock_embedding.assert_called_once()

    def test_cache_dir_parameter(self):
        """Test passing cache directory."""
        with patch("vector_store.embeddings.fastembed.TextEmbedding") as mock_embedding:
            provider = FastEmbedProvider("test-model", cache_dir="/tmp/cache")

            # Trigger model loading
            provider._get_model()

            # Verify cache_dir was passed
            mock_embedding.assert_called_once_with(model_name="test-model", cache_dir="/tmp/cache")


class TestBGEM3ONNXProvider:
    """Tests for BGE-M3 ONNX provider implementation."""

    def test_get_dense_vector_size(self):
        """Test getting dense vector dimension."""
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx")
        size = provider.get_dense_vector_size()

        # BGE-M3 uses 1024 dimensions
        assert size == 1024

    @pytest.mark.asyncio
    async def test_embed_batch_empty(self):
        """Test embedding empty batch returns empty list."""
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx")
        results = await provider.embed_batch([])

        assert results == []

    def test_lazy_model_loading(self):
        """Test that model is loaded lazily."""
        # Create provider
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx")

        # Model should not be loaded yet
        assert provider._ort_session is None
        assert provider._tokenizer is None

    def test_warm_up_loads_session_and_tokenizer(self):
        """Test that warm_up() eagerly loads the ONNX session and tokenizer."""
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx")

        # Confirm lazy state before warm_up
        assert provider._ort_session is None
        assert provider._tokenizer is None

        with (
            patch.object(provider, "_get_session") as mock_session,
            patch.object(provider, "_get_tokenizer") as mock_tokenizer,
        ):
            provider.warm_up()
            mock_session.assert_called_once()
            mock_tokenizer.assert_called_once()

    def test_cache_dir_parameter(self):
        """Test passing cache directory."""
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx", cache_dir="/tmp/cache")

        # Verify cache_dir was stored (platform-independent check)
        assert provider.cache_dir is not None
        assert provider.cache_dir.name == "cache"

    def test_model_name_stored(self):
        """Test that model_name is stored correctly."""
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx")
        assert provider.model_name == "aapot/bge-m3-onnx"

    def test_process_outputs_handles_3d_sparse(self):
        """Test _process_outputs handles (seq_len, 1) sparse shape from ONNX model.

        The aapot/bge-m3-onnx model outputs sparse with shape (batch, seq_len, 1),
        requiring squeeze to convert to (seq_len,) for iteration.
        Sparse indices must be vocabulary token IDs (from input_ids), not positions.
        """
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx")

        # Mock tokenizer with special token IDs
        mock_tokenizer = Mock()
        mock_tokenizer.cls_token_id = 0
        mock_tokenizer.eos_token_id = 2
        mock_tokenizer.pad_token_id = 1
        mock_tokenizer.unk_token_id = 3

        # Simulate ONNX output shapes:
        # - dense: (1, 1024)
        # - sparse: (1, seq_len, 1) - the documented shape requiring squeeze
        # - attention_mask: (1, seq_len)
        # - input_ids: (1, seq_len) - vocabulary token IDs
        dense_output = np.random.rand(1, 1024)
        sparse_output = np.array([[[0.5], [0.8], [-0.2], [0.3], [0.0]]])  # (1, 5, 1)
        attention_mask = np.array([[1, 1, 1, 0, 0]])  # 3 valid tokens
        # Token IDs: CLS(0), vocab 1500, vocab 2300, PAD(1), PAD(1)
        input_ids = np.array([[0, 1500, 2300, 1, 1]])

        with patch.object(provider, "_get_tokenizer", return_value=mock_tokenizer):
            result = provider._process_outputs(
                dense_output, sparse_output, attention_mask, input_ids
            )

        # Should return EmbeddingOutput without error
        assert "dense" in result
        assert "sparse" in result
        assert len(result["dense"]) == 1024
        assert isinstance(result["sparse"], dict)
        # CLS token (id=0) has positive logit but is filtered as special token
        assert 0 not in result["sparse"]
        # Vocab token 1500: logit 0.8 > 0, valid, not special
        assert 1500 in result["sparse"]
        assert result["sparse"][1500] == pytest.approx(0.8)
        # Vocab token 2300: logit -0.2 < 0, filtered by ReLU
        assert 2300 not in result["sparse"]
        # PAD tokens (id=1): valid=0 (padding), filtered
        assert 1 not in result["sparse"]

    def test_process_outputs_handles_2d_sparse(self):
        """Test _process_outputs handles (seq_len,) sparse shape (backward compat)."""
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx")

        # Mock tokenizer with special token IDs
        mock_tokenizer = Mock()
        mock_tokenizer.cls_token_id = 0
        mock_tokenizer.eos_token_id = 2
        mock_tokenizer.pad_token_id = 1
        mock_tokenizer.unk_token_id = 3

        # Simulate already-flat sparse shape (if model ever changes)
        dense_output = np.random.rand(1, 1024)
        sparse_output = np.array([[0.5, 0.8, -0.2, 0.3, 0.0]])  # (1, 5) - already 2D
        attention_mask = np.array([[1, 1, 1, 0, 0]])
        input_ids = np.array([[0, 1500, 2300, 1, 1]])

        with patch.object(provider, "_get_tokenizer", return_value=mock_tokenizer):
            result = provider._process_outputs(
                dense_output, sparse_output, attention_mask, input_ids
            )

        assert "dense" in result
        assert "sparse" in result
        assert len(result["dense"]) == 1024
        assert isinstance(result["sparse"], dict)


class TestProgressHeartbeat:
    """Tests for the _progress_heartbeat context manager."""

    def test_logs_at_interval(self):
        """Heartbeat logs periodic messages during a long operation."""
        with (
            patch("vector_store.embeddings.bge_m3_onnx.logger") as mock_logger,
            _progress_heartbeat("Test op", interval_seconds=0.1),
        ):
            time.sleep(0.35)
        # Should have logged 2-3 heartbeats
        info_calls = [c for c in mock_logger.info.call_args_list if "Test op" in str(c)]
        assert len(info_calls) >= 2

    def test_stops_on_exception(self):
        """Heartbeat thread is cleaned up when wrapped block raises."""
        with (
            patch("vector_store.embeddings.bge_m3_onnx.logger"),
            pytest.raises(ValueError, match="test error"),
            _progress_heartbeat("Failing op", interval_seconds=0.05),
        ):
            time.sleep(0.1)
            raise ValueError("test error")
        # If we reach here, thread was cleaned up (no hanging)

    def test_no_log_for_fast_operation(self):
        """No heartbeat message if operation completes before first interval."""
        with (
            patch("vector_store.embeddings.bge_m3_onnx.logger") as mock_logger,
            _progress_heartbeat("Fast op", interval_seconds=10),
        ):
            pass  # completes instantly
        info_calls = [c for c in mock_logger.info.call_args_list if "Fast op" in str(c)]
        assert len(info_calls) == 0


class TestBGEM3ONNXProviderSelection:
    """Tests for ONNX Runtime execution provider selection and GPU support."""

    def test_resolve_providers_defaults_to_cpu_when_no_gpu(self):
        """_resolve_providers() returns CPU when get_available_providers() has no CUDA."""
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx")
        with patch("onnxruntime.get_available_providers", return_value=["CPUExecutionProvider"]):
            result = provider._resolve_providers()
        assert result == ["CPUExecutionProvider"]

    def test_resolve_providers_detects_cuda(self):
        """_resolve_providers() returns CUDA + CPU when CUDA is available."""
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx")
        with patch(
            "onnxruntime.get_available_providers",
            return_value=["CUDAExecutionProvider", "CPUExecutionProvider"],
        ):
            result = provider._resolve_providers()
        assert result == ["CUDAExecutionProvider", "CPUExecutionProvider"]

    def test_resolve_providers_explicit_passthrough(self):
        """Explicit providers bypass auto-detection."""
        provider = BGEM3ONNXProvider(
            "aapot/bge-m3-onnx", execution_providers=["TensorrtExecutionProvider"]
        )
        # Should not call get_available_providers at all
        with patch("onnxruntime.get_available_providers") as mock_get:
            result = provider._resolve_providers()
        mock_get.assert_not_called()
        assert result == ["TensorrtExecutionProvider"]

    def test_explicit_providers_not_mutated(self):
        """_resolve_providers() returns a copy, doesn't mutate input list."""
        original = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx", execution_providers=original)
        result = provider._resolve_providers()
        assert result == original
        assert result is not original  # must be a copy

    def test_build_provider_options_cpu_only(self):
        """Returns None for CPU-only providers."""
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx")
        result = provider._build_provider_options(["CPUExecutionProvider"])
        assert result is None

    def test_build_provider_options_cuda(self):
        """CUDA gets arena_extend_strategy option, CPU gets empty dict."""
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx")
        result = provider._build_provider_options(["CUDAExecutionProvider", "CPUExecutionProvider"])
        assert result == [{"arena_extend_strategy": "kSameAsRequested"}, {}]

    def test_session_creation_passes_providers(self):
        """_get_session passes providers/options to InferenceSession constructor."""
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx")

        mock_session = Mock()
        mock_session.get_providers.return_value = ["CPUExecutionProvider"]

        with (
            patch(
                "onnxruntime.get_available_providers",
                return_value=["CPUExecutionProvider"],
            ),
            patch("onnxruntime.InferenceSession", return_value=mock_session) as mock_ort,
            patch("huggingface_hub.hf_hub_download"),
            patch.object(
                provider,
                "_get_model_dir",
                return_value=Mock(__truediv__=Mock(return_value="model.onnx")),
            ),
        ):
            provider._get_session()

        # Verify InferenceSession was called with providers and provider_options
        call_kwargs = mock_ort.call_args
        assert call_kwargs[1]["providers"] == ["CPUExecutionProvider"]
        assert call_kwargs[1]["provider_options"] is None  # CPU-only returns None

    def test_session_logs_warning_on_fallback(self):
        """Warning logged when requested provider not in active list."""
        provider = BGEM3ONNXProvider(
            "aapot/bge-m3-onnx",
            execution_providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
        )

        mock_session = Mock()
        # Simulate CUDA requested but only CPU active (fallback)
        mock_session.get_providers.return_value = ["CPUExecutionProvider"]

        with (
            patch("onnxruntime.InferenceSession", return_value=mock_session),
            patch("huggingface_hub.hf_hub_download"),
            patch.object(
                provider,
                "_get_model_dir",
                return_value=Mock(__truediv__=Mock(return_value="model.onnx")),
            ),
            patch("vector_store.embeddings.bge_m3_onnx.logger") as mock_logger,
        ):
            provider._get_session()

        # Should have logged a warning about fallback
        warning_calls = [c for c in mock_logger.warning.call_args_list if "not active" in str(c)]
        assert len(warning_calls) == 1

    def test_session_no_warning_when_provider_active(self):
        """No warning when requested provider is in active list."""
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx")
        mock_session = Mock()
        mock_session.get_providers.return_value = ["CPUExecutionProvider"]
        with (
            patch("onnxruntime.get_available_providers", return_value=["CPUExecutionProvider"]),
            patch("onnxruntime.InferenceSession", return_value=mock_session),
            patch("huggingface_hub.hf_hub_download"),
            patch.object(
                provider,
                "_get_model_dir",
                return_value=Mock(__truediv__=Mock(return_value="model.onnx")),
            ),
            patch("vector_store.embeddings.bge_m3_onnx.logger") as mock_logger,
        ):
            provider._get_session()
        mock_logger.warning.assert_not_called()

    def test_execution_providers_stored_on_init(self):
        """Constructor stores execution_providers argument."""
        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx", execution_providers=providers)
        assert provider._execution_providers == providers

    def test_execution_providers_default_none(self):
        """Default execution_providers is None (auto-detect mode)."""
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx")
        assert provider._execution_providers is None


class TestBGEM3ONNXThreadSafety:
    """Tests for thread-safe lazy initialization of ONNX session and tokenizer."""

    def test_init_lock_exists(self):
        """Constructor creates _init_lock as a threading.Lock."""
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx")
        assert hasattr(provider, "_init_lock")
        assert isinstance(provider._init_lock, type(threading.Lock()))

    def test_get_session_called_once_under_concurrent_access(self):
        """8 threads race on _get_session() — InferenceSession constructed exactly once."""
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx")

        mock_session = Mock()
        mock_session.get_providers.return_value = ["CPUExecutionProvider"]

        def slow_inference_session(*args, **kwargs):
            time.sleep(0.05)  # Widen race window
            return mock_session

        with (
            patch(
                "onnxruntime.get_available_providers",
                return_value=["CPUExecutionProvider"],
            ),
            patch(
                "onnxruntime.InferenceSession",
                side_effect=slow_inference_session,
            ) as mock_ort,
            patch("huggingface_hub.hf_hub_download"),
            patch.object(
                provider,
                "_get_model_dir",
                return_value=Mock(__truediv__=Mock(return_value="model.onnx")),
            ),
            concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor,
        ):
            futures = [executor.submit(provider._get_session) for _ in range(8)]
            results = [f.result() for f in futures]

        # All threads must get the same session instance
        assert all(r is mock_session for r in results)
        # InferenceSession must be constructed exactly once
        assert mock_ort.call_count == 1

    def test_get_tokenizer_called_once_under_concurrent_access(self):
        """8 threads race on _get_tokenizer() — from_pretrained called exactly once."""
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx")

        mock_tokenizer = Mock()

        def slow_from_pretrained(*args, **kwargs):
            time.sleep(0.05)  # Widen race window
            return mock_tokenizer

        with (
            patch(
                "vector_store.embeddings.bge_m3_onnx.AutoTokenizer.from_pretrained",
                side_effect=slow_from_pretrained,
            ) as mock_from_pretrained,
            concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor,
        ):
            futures = [executor.submit(provider._get_tokenizer) for _ in range(8)]
            results = [f.result() for f in futures]

        # All threads must get the same tokenizer instance
        assert all(r is mock_tokenizer for r in results)
        # from_pretrained must be called exactly once
        assert mock_from_pretrained.call_count == 1

    def test_session_init_exception_allows_retry(self):
        """Failed download releases lock; subsequent call retries and succeeds."""
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx")

        mock_session = Mock()
        mock_session.get_providers.return_value = ["CPUExecutionProvider"]

        call_count = 0

        def flaky_download(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count <= 1:  # First call fails (first hf_hub_download in first attempt)
                raise ConnectionError("network error")

        with (
            patch(
                "onnxruntime.get_available_providers",
                return_value=["CPUExecutionProvider"],
            ),
            patch("onnxruntime.InferenceSession", return_value=mock_session),
            patch(
                "huggingface_hub.hf_hub_download",
                side_effect=flaky_download,
            ),
            patch.object(
                provider,
                "_get_model_dir",
                return_value=Mock(__truediv__=Mock(return_value="model.onnx")),
            ),
        ):
            # First call should fail
            with pytest.raises(ConnectionError, match="network error"):
                provider._get_session()

            # Session should NOT be set after failure
            assert provider._ort_session is None

            # Second call should succeed (flaky_download threshold passed)
            result = provider._get_session()
            assert result is mock_session

    def test_cleanup_resets_session_and_tokenizer(self):
        """cleanup() nulls both _ort_session and _tokenizer under the lock."""
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx")
        provider._ort_session = Mock()
        provider._tokenizer = Mock()

        provider.cleanup()

        assert provider._ort_session is None
        assert provider._tokenizer is None

    def test_cleanup_concurrent_with_init(self):
        """One thread initialises while another calls cleanup — no crash, lock serialises."""
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx")

        mock_session = Mock()
        mock_session.get_providers.return_value = ["CPUExecutionProvider"]

        init_started = threading.Event()
        allow_finish = threading.Event()

        def slow_inference_session(*_args, **_kwargs):
            init_started.set()
            allow_finish.wait(timeout=5)
            return mock_session

        with (
            patch(
                "onnxruntime.get_available_providers",
                return_value=["CPUExecutionProvider"],
            ),
            patch(
                "onnxruntime.InferenceSession",
                side_effect=slow_inference_session,
            ),
            patch("huggingface_hub.hf_hub_download"),
            patch.object(
                provider,
                "_get_model_dir",
                return_value=Mock(__truediv__=Mock(return_value="model.onnx")),
            ),
            concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor,
        ):
            # Thread A: start init (will block inside InferenceSession)
            init_future = executor.submit(provider._get_session)
            init_started.wait(timeout=5)

            # Thread B: cleanup tries to acquire the same lock — will block until init finishes
            cleanup_future = executor.submit(provider.cleanup)

            # Let init complete
            allow_finish.set()

            # Both must finish without error
            session = init_future.result(timeout=5)
            cleanup_future.result(timeout=5)

        # After cleanup runs, session is None (cleanup ran after init published)
        assert session is mock_session
        assert provider._ort_session is None

    def test_reinit_after_cleanup(self):
        """After cleanup, next _get_session() re-initialises successfully."""
        provider = BGEM3ONNXProvider("aapot/bge-m3-onnx")

        session_a = Mock()
        session_a.get_providers.return_value = ["CPUExecutionProvider"]
        session_b = Mock()
        session_b.get_providers.return_value = ["CPUExecutionProvider"]
        sessions = iter([session_a, session_b])

        with (
            patch(
                "onnxruntime.get_available_providers",
                return_value=["CPUExecutionProvider"],
            ),
            patch(
                "onnxruntime.InferenceSession",
                side_effect=lambda *_a, **_kw: next(sessions),
            ) as mock_ort,
            patch("huggingface_hub.hf_hub_download"),
            patch.object(
                provider,
                "_get_model_dir",
                return_value=Mock(__truediv__=Mock(return_value="model.onnx")),
            ),
        ):
            # First init
            result_a = provider._get_session()
            assert result_a is session_a

            # Cleanup
            provider.cleanup()
            assert provider._ort_session is None

            # Re-init should create a new session
            result_b = provider._get_session()
            assert result_b is session_b

        assert mock_ort.call_count == 2
