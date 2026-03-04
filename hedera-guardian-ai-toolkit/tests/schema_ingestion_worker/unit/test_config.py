"""Unit tests for configuration management."""

import logging
from pathlib import Path

import pytest

from schema_ingestion_worker.config import Settings, load_settings


class TestSettings:
    """Test Settings configuration class."""

    def test_default_values(self, monkeypatch):
        """Test that default values are set correctly."""
        # Clear all SCHEMA_INGESTION_ env vars to test actual defaults
        import os

        for key in list(os.environ.keys()):
            if key.startswith("SCHEMA_INGESTION_"):
                monkeypatch.delenv(key, raising=False)

        settings = Settings(_env_file=None)

        assert settings.qdrant_url == "http://localhost:6333"
        assert settings.qdrant_collection_name == "schema_properties"
        assert settings.qdrant_api_key is None
        assert settings.embedding_model_name == "aapot/bge-m3-onnx"
        assert settings.embedding_batch_size == 256
        assert settings.vector_upsert_batch_size == 50
        # Paths are now resolved to absolute paths
        assert settings.input_schemas_dir.is_absolute()
        assert settings.input_schemas_dir.name == "schemas"
        assert settings.output_dir.is_absolute()
        assert settings.output_dir.name == "output"
        assert settings.onnx_inference_batch_size == 32
        assert settings.log_level == "INFO"

    def test_custom_values(self):
        """Test that custom values can be set."""
        settings = Settings(
            qdrant_url="http://custom-qdrant:6333",
            qdrant_collection_name="custom_collection",
            qdrant_api_key="test-api-key",
            embedding_model_name="custom-model",
            embedding_batch_size=100,
            vector_upsert_batch_size=200,
            input_schemas_dir=Path("/custom/input"),
            output_dir=Path("/custom/output"),
            onnx_inference_batch_size=32,
            log_level="DEBUG",
        )

        assert settings.qdrant_url == "http://custom-qdrant:6333"
        assert settings.qdrant_collection_name == "custom_collection"
        assert settings.qdrant_api_key == "test-api-key"
        assert settings.embedding_model_name == "custom-model"
        assert settings.embedding_batch_size == 100
        assert settings.vector_upsert_batch_size == 200
        # Paths are resolved to absolute, check they're absolute and contain expected parts
        assert settings.input_schemas_dir.is_absolute()
        assert "custom" in str(settings.input_schemas_dir)
        assert "input" in str(settings.input_schemas_dir)
        assert settings.output_dir.is_absolute()
        assert "custom" in str(settings.output_dir)
        assert "output" in str(settings.output_dir)
        assert settings.onnx_inference_batch_size == 32
        assert settings.log_level == "DEBUG"

    def test_environment_variables(self, monkeypatch):
        """Test that environment variables are loaded correctly."""
        monkeypatch.setenv("SCHEMA_INGESTION_QDRANT_URL", "http://env-qdrant:6333")
        monkeypatch.setenv("SCHEMA_INGESTION_QDRANT_COLLECTION_NAME", "env_collection")
        monkeypatch.setenv("SCHEMA_INGESTION_EMBEDDING_BATCH_SIZE", "75")
        monkeypatch.setenv("SCHEMA_INGESTION_LOG_LEVEL", "WARNING")

        settings = Settings()

        assert settings.qdrant_url == "http://env-qdrant:6333"
        assert settings.qdrant_collection_name == "env_collection"
        assert settings.embedding_batch_size == 75
        assert settings.log_level == "WARNING"

    def test_batch_size_validation(self):
        """Test that batch size validation works."""
        # Valid batch sizes
        settings = Settings(embedding_batch_size=1)
        assert settings.embedding_batch_size == 1

        settings = Settings(embedding_batch_size=1000)
        assert settings.embedding_batch_size == 1000

        # Invalid batch sizes
        with pytest.raises(ValueError):
            Settings(embedding_batch_size=0)

        with pytest.raises(ValueError):
            Settings(embedding_batch_size=-1)

        with pytest.raises(ValueError):
            Settings(embedding_batch_size=1001)

    def test_upsert_batch_size_validation(self):
        """Test that upsert batch size validation works."""
        # Valid batch sizes
        settings = Settings(vector_upsert_batch_size=1)
        assert settings.vector_upsert_batch_size == 1

        settings = Settings(vector_upsert_batch_size=1000)
        assert settings.vector_upsert_batch_size == 1000

        # Invalid batch sizes
        with pytest.raises(ValueError):
            Settings(vector_upsert_batch_size=0)

        with pytest.raises(ValueError):
            Settings(vector_upsert_batch_size=1001)

    def test_onnx_inference_batch_size_validation(self):
        """Test that ONNX inference batch size validation works."""
        # Valid values
        settings = Settings(onnx_inference_batch_size=1)
        assert settings.onnx_inference_batch_size == 1

        settings = Settings(onnx_inference_batch_size=500)
        assert settings.onnx_inference_batch_size == 500

        # Invalid values
        with pytest.raises(ValueError):
            Settings(onnx_inference_batch_size=0)

        with pytest.raises(ValueError):
            Settings(onnx_inference_batch_size=501)

    def test_get_log_level(self):
        """Test that log level conversion works correctly."""
        settings = Settings(log_level="DEBUG")
        assert settings.get_log_level() == logging.DEBUG

        settings = Settings(log_level="INFO")
        assert settings.get_log_level() == logging.INFO

        settings = Settings(log_level="WARNING")
        assert settings.get_log_level() == logging.WARNING

        settings = Settings(log_level="ERROR")
        assert settings.get_log_level() == logging.ERROR

        settings = Settings(log_level="CRITICAL")
        assert settings.get_log_level() == logging.CRITICAL

    def test_get_log_level_lowercase(self):
        """Test that lowercase log levels are handled correctly."""
        settings = Settings(log_level="debug")
        assert settings.get_log_level() == logging.DEBUG

        settings = Settings(log_level="info")
        assert settings.get_log_level() == logging.INFO

    def test_get_log_level_invalid(self):
        """Test that invalid log levels default to INFO."""
        settings = Settings(log_level="INVALID")
        assert settings.get_log_level() == logging.INFO


class TestLoadSettings:
    """Test load_settings function."""

    def test_load_settings_returns_settings_instance(self):
        """Test that load_settings returns a Settings instance."""
        settings = load_settings()
        assert isinstance(settings, Settings)

    def test_load_settings_with_environment_variables(self, monkeypatch):
        """Test that load_settings loads environment variables."""
        monkeypatch.setenv("SCHEMA_INGESTION_QDRANT_URL", "http://test:6333")
        monkeypatch.setenv("SCHEMA_INGESTION_LOG_LEVEL", "DEBUG")

        settings = load_settings()

        assert settings.qdrant_url == "http://test:6333"
        assert settings.log_level == "DEBUG"
