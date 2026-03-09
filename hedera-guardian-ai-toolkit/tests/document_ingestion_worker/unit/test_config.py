"""Unit tests for document ingestion configuration management."""

import logging
from pathlib import Path

import pytest

from document_ingestion_worker.config import DocumentIngestionSettings


class TestDocumentIngestionSettings:
    """Test DocumentIngestionSettings configuration class."""

    def test_default_values(self, monkeypatch):
        """Test that default values are set correctly."""
        import os

        for key in list(os.environ.keys()):
            if key.startswith("DOCUMENT_INGESTION_"):
                monkeypatch.delenv(key, raising=False)

        settings = DocumentIngestionSettings(_env_file=None)

        assert settings.qdrant_url == "http://localhost:6333"
        assert settings.qdrant_collection_name == "methodology_documents"
        assert settings.qdrant_api_key is None
        assert settings.embedding_model_name == "aapot/bge-m3-onnx"
        assert settings.embedding_batch_size == 5  # Balanced CPU profile (16GB)
        assert settings.vector_upsert_batch_size == 20  # Balanced 16GB default
        assert settings.data_dir == Path("data")
        assert settings.max_parallel_files == 1  # Sequential default for Balanced 16GB
        assert settings.log_level == "INFO"
        assert settings.mode == "override"
        assert settings.do_ocr is False  # Default is False for digital PDFs
        assert settings.start_from == "beginning"
        assert settings.pdf_backend == "dlparse_v2"  # Fast C++ parser default
        assert settings.ocr_batch_size == 2  # Balanced 16GB default
        assert settings.layout_batch_size == 2  # Balanced 16GB default

    def test_computed_directories(self, monkeypatch):
        """Test that computed directory properties work correctly."""
        import os

        for key in list(os.environ.keys()):
            if key.startswith("DOCUMENT_INGESTION_"):
                monkeypatch.delenv(key, raising=False)

        settings = DocumentIngestionSettings(data_dir=Path("/test/data"), _env_file=None)

        assert settings.input_documents_dir == Path("/test/data/input/documents")
        assert settings.staged_documents_dir == Path("/test/data/staged/documents")

    def test_custom_values(self):
        """Test that custom values can be set."""
        settings = DocumentIngestionSettings(
            qdrant_url="http://custom-qdrant:6333",
            qdrant_collection_name="custom_documents",
            qdrant_api_key="test-api-key",
            embedding_model_name="custom-model",
            embedding_batch_size=100,
            vector_upsert_batch_size=200,
            data_dir=Path("/custom/data"),
            max_parallel_files=10,
            log_level="DEBUG",
            mode="override",
            do_ocr=False,
            start_from="parsed",
        )

        assert settings.qdrant_url == "http://custom-qdrant:6333"
        assert settings.qdrant_collection_name == "custom_documents"
        assert settings.qdrant_api_key == "test-api-key"
        assert settings.embedding_model_name == "custom-model"
        assert settings.embedding_batch_size == 100
        assert settings.vector_upsert_batch_size == 200
        assert settings.data_dir == Path("/custom/data")
        assert settings.max_parallel_files == 10
        assert settings.log_level == "DEBUG"
        assert settings.mode == "override"
        assert settings.do_ocr is False
        assert settings.start_from == "parsed"

    def test_environment_variables(self, monkeypatch):
        """Test that environment variables are loaded correctly."""
        monkeypatch.setenv("DOCUMENT_INGESTION_QDRANT_URL", "http://env-qdrant:6333")
        monkeypatch.setenv("DOCUMENT_INGESTION_QDRANT_COLLECTION_NAME", "env_documents")
        monkeypatch.setenv("DOCUMENT_INGESTION_EMBEDDING_BATCH_SIZE", "75")
        monkeypatch.setenv("DOCUMENT_INGESTION_LOG_LEVEL", "WARNING")
        monkeypatch.setenv("DOCUMENT_INGESTION_DO_OCR", "false")
        monkeypatch.setenv("DOCUMENT_INGESTION_DATA_DIR", "/env/data")
        monkeypatch.setenv("DOCUMENT_INGESTION_START_FROM", "chunked")

        settings = DocumentIngestionSettings()

        assert settings.qdrant_url == "http://env-qdrant:6333"
        assert settings.qdrant_collection_name == "env_documents"
        assert settings.embedding_batch_size == 75
        assert settings.log_level == "WARNING"
        assert settings.do_ocr is False
        assert settings.data_dir == Path("/env/data")
        assert settings.start_from == "chunked"

    def test_batch_size_validation(self):
        """Test that batch size validation works."""
        # Valid batch sizes
        settings = DocumentIngestionSettings(embedding_batch_size=1)
        assert settings.embedding_batch_size == 1

        settings = DocumentIngestionSettings(embedding_batch_size=1000)
        assert settings.embedding_batch_size == 1000

        # Invalid batch sizes
        with pytest.raises(ValueError):
            DocumentIngestionSettings(embedding_batch_size=0)

        with pytest.raises(ValueError):
            DocumentIngestionSettings(embedding_batch_size=-1)

        with pytest.raises(ValueError):
            DocumentIngestionSettings(embedding_batch_size=1001)

    def test_upsert_batch_size_validation(self):
        """Test that upsert batch size validation works."""
        # Valid batch sizes
        settings = DocumentIngestionSettings(vector_upsert_batch_size=1)
        assert settings.vector_upsert_batch_size == 1

        settings = DocumentIngestionSettings(vector_upsert_batch_size=1000)
        assert settings.vector_upsert_batch_size == 1000

        # Invalid batch sizes
        with pytest.raises(ValueError):
            DocumentIngestionSettings(vector_upsert_batch_size=0)

        with pytest.raises(ValueError):
            DocumentIngestionSettings(vector_upsert_batch_size=1001)

    def test_max_parallel_files_validation(self):
        """Test that max parallel files validation works."""
        # Valid values
        settings = DocumentIngestionSettings(max_parallel_files=1)
        assert settings.max_parallel_files == 1

        settings = DocumentIngestionSettings(max_parallel_files=50)
        assert settings.max_parallel_files == 50

        # Invalid values
        with pytest.raises(ValueError):
            DocumentIngestionSettings(max_parallel_files=0)

        with pytest.raises(ValueError):
            DocumentIngestionSettings(max_parallel_files=51)

    def test_chunk_token_validation(self):
        """Test that chunk token settings validation works."""
        # Valid values
        settings = DocumentIngestionSettings(chunk_max_tokens=64)
        assert settings.chunk_max_tokens == 64

        settings = DocumentIngestionSettings(chunk_max_tokens=8192)
        assert settings.chunk_max_tokens == 8192

        settings = DocumentIngestionSettings(chunk_overlap_tokens=0)
        assert settings.chunk_overlap_tokens == 0

        settings = DocumentIngestionSettings(chunk_overlap_tokens=512)
        assert settings.chunk_overlap_tokens == 512

        # Invalid values
        with pytest.raises(ValueError):
            DocumentIngestionSettings(chunk_max_tokens=63)

        with pytest.raises(ValueError):
            DocumentIngestionSettings(chunk_max_tokens=8193)

        with pytest.raises(ValueError):
            DocumentIngestionSettings(chunk_overlap_tokens=-1)

        with pytest.raises(ValueError):
            DocumentIngestionSettings(chunk_overlap_tokens=513)

    def test_get_log_level(self):
        """Test that log level conversion works correctly."""
        settings = DocumentIngestionSettings(log_level="DEBUG")
        assert settings.get_log_level() == logging.DEBUG

        settings = DocumentIngestionSettings(log_level="INFO")
        assert settings.get_log_level() == logging.INFO

        settings = DocumentIngestionSettings(log_level="WARNING")
        assert settings.get_log_level() == logging.WARNING

        settings = DocumentIngestionSettings(log_level="ERROR")
        assert settings.get_log_level() == logging.ERROR

        settings = DocumentIngestionSettings(log_level="CRITICAL")
        assert settings.get_log_level() == logging.CRITICAL

    def test_get_log_level_lowercase(self):
        """Test that lowercase log levels are handled correctly."""
        settings = DocumentIngestionSettings(log_level="debug")
        assert settings.get_log_level() == logging.DEBUG

        settings = DocumentIngestionSettings(log_level="info")
        assert settings.get_log_level() == logging.INFO

    def test_get_log_level_invalid(self):
        """Test that invalid log levels default to INFO."""
        settings = DocumentIngestionSettings(log_level="INVALID")
        assert settings.get_log_level() == logging.INFO

    def test_mode_validation(self):
        """Test that mode validation works."""
        # Valid modes
        settings = DocumentIngestionSettings(mode="append")
        assert settings.mode == "append"

        settings = DocumentIngestionSettings(mode="override")
        assert settings.mode == "override"

        # Invalid mode
        with pytest.raises(ValueError):
            DocumentIngestionSettings(mode="invalid")

    def test_start_from_validation(self):
        """Test that start_from validation works."""
        # Valid start points
        settings = DocumentIngestionSettings(start_from="beginning")
        assert settings.start_from == "beginning"

        settings = DocumentIngestionSettings(start_from="parsed")
        assert settings.start_from == "parsed"

        settings = DocumentIngestionSettings(start_from="chunked")
        assert settings.start_from == "chunked"

        # Invalid start point
        with pytest.raises(ValueError):
            DocumentIngestionSettings(start_from="invalid")

    def test_table_structure_mode_validation(self):
        """Test that table structure mode validation works."""
        valid_modes = ["fast", "accurate"]

        for mode in valid_modes:
            settings = DocumentIngestionSettings(table_structure_mode=mode)
            assert settings.table_structure_mode == mode

        # Invalid mode
        with pytest.raises(ValueError):
            DocumentIngestionSettings(table_structure_mode="invalid_mode")

    def test_do_ocr_setting(self, monkeypatch):
        """Test that do_ocr setting works correctly."""
        import os

        for key in list(os.environ.keys()):
            if key.startswith("DOCUMENT_INGESTION_"):
                monkeypatch.delenv(key, raising=False)

        # Default is False (optimized for digital PDFs - text already embedded, tables/formulas use ML models)
        settings = DocumentIngestionSettings(_env_file=None)
        assert settings.do_ocr is False

        # Can be enabled for scanned PDFs
        settings = DocumentIngestionSettings(do_ocr=True, _env_file=None)
        assert settings.do_ocr is True

    def test_table_structure_mode_defaults(self, monkeypatch):
        """Test that table structure mode defaults to accurate."""
        import os

        for key in list(os.environ.keys()):
            if key.startswith("DOCUMENT_INGESTION_"):
                monkeypatch.delenv(key, raising=False)

        settings = DocumentIngestionSettings(_env_file=None)
        assert settings.table_structure_mode == "accurate"
        assert settings.do_table_structure is True
        assert settings.do_cell_matching is True
        assert settings.do_formula_enrichment is True

    def test_accelerator_device_defaults(self, monkeypatch):
        """Test accelerator device default is auto."""
        import os

        for key in list(os.environ.keys()):
            if key.startswith("DOCUMENT_INGESTION_"):
                monkeypatch.delenv(key, raising=False)

        settings = DocumentIngestionSettings(_env_file=None)
        assert settings.accelerator_device == "auto"
        assert settings.num_threads == 2

    def test_accelerator_device_values(self):
        """Test all accelerator device values are accepted."""
        for device in ["auto", "cuda", "mps", "cpu"]:
            settings = DocumentIngestionSettings(accelerator_device=device)
            assert settings.accelerator_device == device

    def test_accelerator_device_invalid(self):
        """Test that invalid accelerator device raises error."""
        with pytest.raises(ValueError):
            DocumentIngestionSettings(accelerator_device="invalid")

    def test_num_threads_validation(self):
        """Test num_threads validation."""
        # Valid values
        settings = DocumentIngestionSettings(num_threads=1)
        assert settings.num_threads == 1

        settings = DocumentIngestionSettings(num_threads=32)
        assert settings.num_threads == 32

        # Invalid values
        with pytest.raises(ValueError):
            DocumentIngestionSettings(num_threads=0)

        with pytest.raises(ValueError):
            DocumentIngestionSettings(num_threads=33)

    def test_batch_sizes_auto_detect_cpu(self, monkeypatch):
        """Test batch sizes auto-detect for CPU."""
        import os

        for key in list(os.environ.keys()):
            if key.startswith("DOCUMENT_INGESTION_"):
                monkeypatch.delenv(key, raising=False)

        settings = DocumentIngestionSettings(accelerator_device="cpu", _env_file=None)
        ocr, layout, table = settings.get_effective_batch_sizes()
        assert ocr == 2
        assert layout == 2
        assert table == 2

    def test_batch_sizes_auto_detect_gpu(self, monkeypatch):
        """Test batch sizes with GPU device (low memory defaults apply)."""
        import os

        for key in list(os.environ.keys()):
            if key.startswith("DOCUMENT_INGESTION_"):
                monkeypatch.delenv(key, raising=False)

        settings = DocumentIngestionSettings(accelerator_device="cuda", _env_file=None)
        ocr, layout, table = settings.get_effective_batch_sizes()
        # Low memory defaults (2) apply regardless of device
        assert ocr == 2
        assert layout == 2
        assert table == 2

    def test_batch_sizes_auto_detect_mps(self, monkeypatch):
        """Test batch sizes with Apple Silicon device (low memory defaults apply)."""
        import os

        for key in list(os.environ.keys()):
            if key.startswith("DOCUMENT_INGESTION_"):
                monkeypatch.delenv(key, raising=False)

        settings = DocumentIngestionSettings(accelerator_device="mps", _env_file=None)
        ocr, layout, table = settings.get_effective_batch_sizes()
        # Low memory defaults (2) apply regardless of device
        assert ocr == 2
        assert layout == 2
        assert table == 2

    def test_batch_sizes_auto_detect_auto(self, monkeypatch):
        """Test batch sizes with auto device (low memory defaults apply)."""
        import os

        for key in list(os.environ.keys()):
            if key.startswith("DOCUMENT_INGESTION_"):
                monkeypatch.delenv(key, raising=False)

        settings = DocumentIngestionSettings(accelerator_device="auto", _env_file=None)
        ocr, layout, table = settings.get_effective_batch_sizes()
        # Low memory defaults (2) apply regardless of device
        assert ocr == 2
        assert layout == 2
        assert table == 2

    def test_batch_sizes_override(self):
        """Test batch size user overrides."""
        settings = DocumentIngestionSettings(
            accelerator_device="cuda",
            ocr_batch_size=64,
            layout_batch_size=128,
            table_batch_size=8,
        )
        ocr, layout, table = settings.get_effective_batch_sizes()
        assert ocr == 64
        assert layout == 128
        assert table == 8

    def test_batch_sizes_partial_override(self, monkeypatch):
        """Test partial batch size override (only OCR)."""
        import os

        for key in list(os.environ.keys()):
            if key.startswith("DOCUMENT_INGESTION_"):
                monkeypatch.delenv(key, raising=False)

        settings = DocumentIngestionSettings(
            accelerator_device="cuda",
            ocr_batch_size=64,
            _env_file=None,
        )
        ocr, layout, table = settings.get_effective_batch_sizes()
        assert ocr == 64
        assert layout == 2  # Low memory default (not auto-detected)
        assert table == 2

    def test_ocr_batch_size_validation(self):
        """Test OCR batch size validation."""
        # Valid values
        settings = DocumentIngestionSettings(ocr_batch_size=1)
        assert settings.ocr_batch_size == 1

        settings = DocumentIngestionSettings(ocr_batch_size=256)
        assert settings.ocr_batch_size == 256

        # Invalid values
        with pytest.raises(ValueError):
            DocumentIngestionSettings(ocr_batch_size=0)

        with pytest.raises(ValueError):
            DocumentIngestionSettings(ocr_batch_size=257)

    def test_layout_batch_size_validation(self):
        """Test layout batch size validation."""
        # Valid values
        settings = DocumentIngestionSettings(layout_batch_size=1)
        assert settings.layout_batch_size == 1

        settings = DocumentIngestionSettings(layout_batch_size=256)
        assert settings.layout_batch_size == 256

        # Invalid values
        with pytest.raises(ValueError):
            DocumentIngestionSettings(layout_batch_size=0)

        with pytest.raises(ValueError):
            DocumentIngestionSettings(layout_batch_size=257)

    def test_table_batch_size_validation(self):
        """Test table batch size validation."""
        # Valid values
        settings = DocumentIngestionSettings(table_batch_size=1)
        assert settings.table_batch_size == 1

        settings = DocumentIngestionSettings(table_batch_size=64)
        assert settings.table_batch_size == 64

        # Invalid values
        with pytest.raises(ValueError):
            DocumentIngestionSettings(table_batch_size=0)

        with pytest.raises(ValueError):
            DocumentIngestionSettings(table_batch_size=65)

    def test_accelerator_environment_variables(self, monkeypatch):
        """Test that accelerator environment variables are loaded correctly."""
        monkeypatch.setenv("DOCUMENT_INGESTION_ACCELERATOR_DEVICE", "cuda")
        monkeypatch.setenv("DOCUMENT_INGESTION_NUM_THREADS", "8")
        monkeypatch.setenv("DOCUMENT_INGESTION_OCR_BATCH_SIZE", "64")
        monkeypatch.setenv("DOCUMENT_INGESTION_LAYOUT_BATCH_SIZE", "128")
        monkeypatch.setenv("DOCUMENT_INGESTION_TABLE_BATCH_SIZE", "8")

        settings = DocumentIngestionSettings()

        assert settings.accelerator_device == "cuda"
        assert settings.num_threads == 8
        assert settings.ocr_batch_size == 64
        assert settings.layout_batch_size == 128
        assert settings.table_batch_size == 8

    def test_pdf_backend_default(self, monkeypatch):
        """Test that pdf_backend defaults to dlparse_v2 (faster C++ parser)."""
        import os

        for key in list(os.environ.keys()):
            if key.startswith("DOCUMENT_INGESTION_"):
                monkeypatch.delenv(key, raising=False)

        settings = DocumentIngestionSettings(_env_file=None)
        assert settings.pdf_backend == "dlparse_v2"

    def test_pdf_backend_validation(self):
        """Test that pdf_backend only accepts valid values."""
        # Valid values
        settings = DocumentIngestionSettings(pdf_backend="dlparse_v1")
        assert settings.pdf_backend == "dlparse_v1"

        settings = DocumentIngestionSettings(pdf_backend="dlparse_v2")
        assert settings.pdf_backend == "dlparse_v2"

        # Invalid value
        with pytest.raises(ValueError):
            DocumentIngestionSettings(pdf_backend="invalid")

        # docling_parse is not valid until docling >= 2.74.0 is supported
        with pytest.raises(ValueError):
            DocumentIngestionSettings(pdf_backend="docling_parse")

    def test_pdf_backend_environment_variable(self, monkeypatch):
        """Test that PDF_BACKEND env var is loaded correctly."""
        monkeypatch.setenv("DOCUMENT_INGESTION_PDF_BACKEND", "dlparse_v2")
        settings = DocumentIngestionSettings()
        assert settings.pdf_backend == "dlparse_v2"

    # ==================
    # Layout Model Tests
    # ==================

    def test_layout_model_default(self, monkeypatch):
        """Test that layout_model defaults to heron-101 (best accuracy)."""
        import os

        for key in list(os.environ.keys()):
            if key.startswith("DOCUMENT_INGESTION_"):
                monkeypatch.delenv(key, raising=False)

        settings = DocumentIngestionSettings(_env_file=None)
        assert settings.layout_model == "heron-101"

    def test_layout_model_validation(self):
        """Test that layout_model only accepts valid values."""
        # Valid values
        valid_models = ["heron", "heron-101", "egret-m", "egret-l", "egret-x"]
        for model in valid_models:
            settings = DocumentIngestionSettings(layout_model=model)
            assert settings.layout_model == model

        # Invalid value
        with pytest.raises(ValueError):
            DocumentIngestionSettings(layout_model="invalid-model")

    def test_layout_model_environment_variable(self, monkeypatch):
        """Test that LAYOUT_MODEL env var is loaded correctly."""
        monkeypatch.setenv("DOCUMENT_INGESTION_LAYOUT_MODEL", "egret-l")
        settings = DocumentIngestionSettings()
        assert settings.layout_model == "egret-l"

    def test_get_layout_model_spec(self):
        """Test that get_layout_model_spec returns correct model specs."""
        # Skip if docling layout_model_specs is not available
        pytest.importorskip("docling.datamodel.layout_model_specs")

        from docling.datamodel.layout_model_specs import (
            DOCLING_LAYOUT_EGRET_LARGE,
            DOCLING_LAYOUT_EGRET_MEDIUM,
            DOCLING_LAYOUT_EGRET_XLARGE,
            DOCLING_LAYOUT_HERON,
            DOCLING_LAYOUT_HERON_101,
        )

        test_cases = [
            ("heron", DOCLING_LAYOUT_HERON),
            ("heron-101", DOCLING_LAYOUT_HERON_101),
            ("egret-x", DOCLING_LAYOUT_EGRET_XLARGE),
            ("egret-l", DOCLING_LAYOUT_EGRET_LARGE),
            ("egret-m", DOCLING_LAYOUT_EGRET_MEDIUM),
        ]

        for model_name, expected_spec in test_cases:
            settings = DocumentIngestionSettings(layout_model=model_name)
            assert settings.get_layout_model_spec() == expected_spec
