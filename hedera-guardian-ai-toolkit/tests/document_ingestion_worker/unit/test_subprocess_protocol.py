"""Unit tests for subprocess IPC protocol TypedDicts and serialization.

Tests the JSON serialization and deserialization of SubprocessRequest and SubprocessResponse
TypedDicts used for inter-process communication between the orchestrator and subprocess workers.

Tests cover:
- SubprocessRequest creation and serialization
- SubprocessResponse success/failure/timeout scenarios
- DocumentIngestionSettings config serialization roundtrip
- Field validation and optional field handling
"""

import json
from pathlib import Path

from document_ingestion_worker.config import DocumentIngestionSettings
from document_ingestion_worker.models import SubprocessRequest, SubprocessResponse


class TestSubprocessRequestSerialization:
    """Test SubprocessRequest TypedDict serialization and validation."""

    def test_create_valid_request(self):
        """Test creating a valid SubprocessRequest with all required fields."""
        request: SubprocessRequest = {
            "document_id": "test_doc",
            "document_path": "/absolute/path/to/test.pdf",
            "staged_path": "/absolute/path/to/staged/test_doc",
            "source_format": "pdf",
            "start_from": "beginning",
            "config_json": '{"qdrant_url": "http://localhost:6333"}',
        }

        # Verify all required fields are present
        assert request["document_id"] == "test_doc"
        assert request["document_path"] == "/absolute/path/to/test.pdf"
        assert request["staged_path"] == "/absolute/path/to/staged/test_doc"
        assert request["source_format"] == "pdf"
        assert request["start_from"] == "beginning"
        assert request["config_json"] == '{"qdrant_url": "http://localhost:6333"}'

    def test_request_json_serialization_roundtrip(self):
        """Test SubprocessRequest can be serialized to JSON and back."""
        request: SubprocessRequest = {
            "document_id": "methodology_001",
            "document_path": "C:\\Projects\\data\\input\\documents\\methodology_001.pdf",
            "staged_path": "C:\\Projects\\data\\staged\\documents\\methodology_001",
            "source_format": "pdf",
            "start_from": "beginning",
            "config_json": '{"qdrant_url": "http://localhost:6333", "embedding_batch_size": 5}',
        }

        # Serialize to JSON
        json_str = json.dumps(request)

        # Deserialize back
        restored_request: SubprocessRequest = json.loads(json_str)

        # Verify all fields match
        assert restored_request["document_id"] == request["document_id"]
        assert restored_request["document_path"] == request["document_path"]
        assert restored_request["staged_path"] == request["staged_path"]
        assert restored_request["source_format"] == request["source_format"]
        assert restored_request["start_from"] == request["start_from"]
        assert restored_request["config_json"] == request["config_json"]

    def test_request_with_docx_format(self):
        """Test SubprocessRequest with DOCX source format."""
        request: SubprocessRequest = {
            "document_id": "test_docx",
            "document_path": "/path/to/test.docx",
            "staged_path": "/path/to/staged/test_docx",
            "source_format": "docx",
            "start_from": "beginning",
            "config_json": "{}",
        }

        assert request["source_format"] == "docx"

        # Verify JSON serialization works
        json_str = json.dumps(request)
        restored = json.loads(json_str)
        assert restored["source_format"] == "docx"

    def test_request_with_different_start_points(self):
        """Test SubprocessRequest with different pipeline start points."""
        start_points = ["beginning", "parsed", "chunked"]

        for start_point in start_points:
            request: SubprocessRequest = {
                "document_id": "test_doc",
                "document_path": "/path/to/test.pdf",
                "staged_path": "/path/to/staged/test_doc",
                "source_format": "pdf",
                "start_from": start_point,
                "config_json": "{}",
            }

            assert request["start_from"] == start_point

            # Verify serialization preserves start_from
            json_str = json.dumps(request)
            restored = json.loads(json_str)
            assert restored["start_from"] == start_point

    def test_request_with_complex_config_json(self):
        """Test SubprocessRequest with complex nested config_json."""
        complex_config = {
            "qdrant_url": "http://localhost:6333",
            "qdrant_collection_name": "methodology_documents",
            "embedding_batch_size": 10,
            "pdf_images_scale": 2.0,
            "do_table_structure": True,
            "ocr_lang": ["eng", "deu"],
        }

        request: SubprocessRequest = {
            "document_id": "test_doc",
            "document_path": "/path/to/test.pdf",
            "staged_path": "/path/to/staged/test_doc",
            "source_format": "pdf",
            "start_from": "beginning",
            "config_json": json.dumps(complex_config),
        }

        # Serialize and deserialize
        json_str = json.dumps(request)
        restored_request = json.loads(json_str)

        # Verify config_json can be parsed back
        restored_config = json.loads(restored_request["config_json"])
        assert restored_config == complex_config


class TestSubprocessResponseSerialization:
    """Test SubprocessResponse TypedDict serialization for different scenarios."""

    def test_create_success_response(self):
        """Test creating a successful SubprocessResponse."""
        response: SubprocessResponse = {
            "status": "success",
            "document_id": "test_doc",
            "chunks_generated": 42,
            "vectors_upserted": 42,
            "processing_time_seconds": 125.5,
            "error_message": None,
            "error_type": None,
        }

        assert response["status"] == "success"
        assert response["document_id"] == "test_doc"
        assert response["chunks_generated"] == 42
        assert response["vectors_upserted"] == 42
        assert response["processing_time_seconds"] == 125.5
        assert response["error_message"] is None
        assert response["error_type"] is None

    def test_success_response_json_serialization(self):
        """Test successful response can be serialized to JSON and back."""
        response: SubprocessResponse = {
            "status": "success",
            "document_id": "methodology_001",
            "chunks_generated": 100,
            "vectors_upserted": 100,
            "processing_time_seconds": 300.0,
            "error_message": None,
            "error_type": None,
        }

        # Serialize to JSON
        json_str = json.dumps(response)

        # Deserialize back
        restored_response: SubprocessResponse = json.loads(json_str)

        # Verify all fields match
        assert restored_response["status"] == "success"
        assert restored_response["document_id"] == "methodology_001"
        assert restored_response["chunks_generated"] == 100
        assert restored_response["vectors_upserted"] == 100
        assert restored_response["processing_time_seconds"] == 300.0
        assert restored_response["error_message"] is None
        assert restored_response["error_type"] is None

    def test_create_failed_response_with_exception(self):
        """Test creating a failed SubprocessResponse with exception error."""
        response: SubprocessResponse = {
            "status": "failed",
            "document_id": "test_doc",
            "chunks_generated": 0,
            "vectors_upserted": 0,
            "processing_time_seconds": 10.5,
            "error_message": "ValueError: Invalid document format",
            "error_type": "Exception",
        }

        assert response["status"] == "failed"
        assert response["error_message"] == "ValueError: Invalid document format"
        assert response["error_type"] == "Exception"
        assert response["chunks_generated"] == 0
        assert response["vectors_upserted"] == 0

    def test_failed_response_json_serialization(self):
        """Test failed response can be serialized to JSON and back."""
        response: SubprocessResponse = {
            "status": "failed",
            "document_id": "corrupt_doc",
            "chunks_generated": 25,
            "vectors_upserted": 0,
            "processing_time_seconds": 45.0,
            "error_message": "RuntimeError: Qdrant connection failed",
            "error_type": "Exception",
        }

        # Serialize to JSON
        json_str = json.dumps(response)

        # Deserialize back
        restored_response: SubprocessResponse = json.loads(json_str)

        assert restored_response["status"] == "failed"
        assert restored_response["error_message"] == "RuntimeError: Qdrant connection failed"
        assert restored_response["error_type"] == "Exception"
        assert restored_response["chunks_generated"] == 25
        assert restored_response["vectors_upserted"] == 0

    def test_create_oom_error_response(self):
        """Test creating a SubprocessResponse with OOM error type."""
        response: SubprocessResponse = {
            "status": "failed",
            "document_id": "huge_doc",
            "chunks_generated": 0,
            "vectors_upserted": 0,
            "processing_time_seconds": 180.0,
            "error_message": "MemoryError: Unable to allocate array",
            "error_type": "OOM",
        }

        assert response["status"] == "failed"
        assert response["error_type"] == "OOM"
        assert response["error_message"] == "MemoryError: Unable to allocate array"

    def test_oom_response_json_serialization(self):
        """Test OOM error response serialization roundtrip."""
        response: SubprocessResponse = {
            "status": "failed",
            "document_id": "large_pdf",
            "chunks_generated": 0,
            "vectors_upserted": 0,
            "processing_time_seconds": 240.0,
            "error_message": "MemoryError: Out of memory",
            "error_type": "OOM",
        }

        json_str = json.dumps(response)
        restored_response: SubprocessResponse = json.loads(json_str)

        assert restored_response["error_type"] == "OOM"

    def test_create_timeout_response(self):
        """Test creating a SubprocessResponse with timeout status."""
        response: SubprocessResponse = {
            "status": "timeout",
            "document_id": "slow_doc",
            "chunks_generated": 0,
            "vectors_upserted": 0,
            "processing_time_seconds": 1800.0,  # 30 minutes
            "error_message": "Processing exceeded 30 minute timeout",
            "error_type": "Timeout",
        }

        assert response["status"] == "timeout"
        assert response["error_type"] == "Timeout"
        assert response["processing_time_seconds"] == 1800.0

    def test_timeout_response_json_serialization(self):
        """Test timeout response serialization roundtrip."""
        response: SubprocessResponse = {
            "status": "timeout",
            "document_id": "timeout_doc",
            "chunks_generated": 15,
            "vectors_upserted": 0,
            "processing_time_seconds": 1800.0,
            "error_message": "Subprocess exceeded 30 minute timeout limit",
            "error_type": "Timeout",
        }

        json_str = json.dumps(response)
        restored_response: SubprocessResponse = json.loads(json_str)

        assert restored_response["status"] == "timeout"
        assert restored_response["error_type"] == "Timeout"
        assert restored_response["processing_time_seconds"] == 1800.0
        assert restored_response["chunks_generated"] == 15

    def test_create_crash_response(self):
        """Test creating a SubprocessResponse with crash error type."""
        response: SubprocessResponse = {
            "status": "failed",
            "document_id": "crash_doc",
            "chunks_generated": 0,
            "vectors_upserted": 0,
            "processing_time_seconds": 5.0,
            "error_message": "Subprocess terminated unexpectedly with exit code -9",
            "error_type": "Crash",
        }

        assert response["status"] == "failed"
        assert response["error_type"] == "Crash"

    def test_crash_response_json_serialization(self):
        """Test crash response serialization roundtrip."""
        response: SubprocessResponse = {
            "status": "failed",
            "document_id": "segfault_doc",
            "chunks_generated": 0,
            "vectors_upserted": 0,
            "processing_time_seconds": 2.0,
            "error_message": "Subprocess crashed with SIGSEGV",
            "error_type": "Crash",
        }

        json_str = json.dumps(response)
        restored_response: SubprocessResponse = json.loads(json_str)

        assert restored_response["error_type"] == "Crash"

    def test_response_with_optional_fields_omitted(self):
        """Test SubprocessResponse with optional fields omitted (total=False)."""
        # Create minimal response with only required fields
        response: SubprocessResponse = {
            "status": "success",
            "document_id": "minimal_doc",
            "chunks_generated": 0,
            "vectors_upserted": 0,
        }

        # Verify JSON serialization works with minimal fields
        json_str = json.dumps(response)
        restored_response: SubprocessResponse = json.loads(json_str)

        assert restored_response["status"] == "success"
        assert restored_response["document_id"] == "minimal_doc"
        assert restored_response["chunks_generated"] == 0
        assert restored_response["vectors_upserted"] == 0

    def test_response_with_partial_fields(self):
        """Test SubprocessResponse with some optional fields provided."""
        response: SubprocessResponse = {
            "status": "failed",
            "document_id": "partial_doc",
            "chunks_generated": 0,
            "vectors_upserted": 0,
            "error_message": "Something went wrong",
            "error_type": "Exception",
        }

        # Verify serialization with partial fields
        json_str = json.dumps(response)
        restored_response: SubprocessResponse = json.loads(json_str)

        assert restored_response["status"] == "failed"
        assert restored_response["chunks_generated"] == 0
        assert restored_response["vectors_upserted"] == 0
        assert restored_response["error_message"] == "Something went wrong"
        assert restored_response["error_type"] == "Exception"


class TestDocumentIngestionSettingsConfigSerialization:
    """Test DocumentIngestionSettings config serialization roundtrip."""

    def test_default_settings_serialization(self):
        """Test serializing default DocumentIngestionSettings to JSON."""
        settings = DocumentIngestionSettings()

        # Serialize to JSON
        config_json = settings.model_dump_json()

        # Verify it's valid JSON
        config_dict = json.loads(config_json)
        assert isinstance(config_dict, dict)
        assert "qdrant_url" in config_dict
        assert "embedding_model_name" in config_dict

    def test_default_settings_roundtrip(self):
        """Test DocumentIngestionSettings serialization and deserialization roundtrip."""
        settings = DocumentIngestionSettings()

        # Serialize to JSON
        config_json = settings.model_dump_json()

        # Deserialize back
        restored_settings = DocumentIngestionSettings.model_validate_json(config_json)

        # Verify key settings match
        assert restored_settings.qdrant_url == settings.qdrant_url
        assert restored_settings.qdrant_collection_name == settings.qdrant_collection_name
        assert restored_settings.embedding_model_name == settings.embedding_model_name
        assert restored_settings.embedding_batch_size == settings.embedding_batch_size
        assert restored_settings.mode == settings.mode
        assert restored_settings.max_parallel_files == settings.max_parallel_files

    def test_custom_settings_serialization(self):
        """Test serializing custom DocumentIngestionSettings."""
        settings = DocumentIngestionSettings(
            qdrant_url="http://custom-qdrant:6333",
            qdrant_collection_name="custom_collection",
            embedding_model_name="custom/model",
            embedding_batch_size=10,
            mode="override",
            max_parallel_files=4,
            subprocess_timeout_seconds=3600,
            pdf_backend="dlparse_v1",
            pdf_images_scale=4.0,
            do_ocr=True,
            ocr_lang=["eng", "fra"],
            do_table_structure=True,
            table_structure_mode="fast",
            chunk_max_tokens=2000,
            chunk_overlap_tokens=100,
            log_level="DEBUG",
        )

        # Serialize to JSON
        config_json = settings.model_dump_json()

        # Deserialize back
        restored_settings = DocumentIngestionSettings.model_validate_json(config_json)

        # Verify all custom settings match
        assert restored_settings.qdrant_url == "http://custom-qdrant:6333"
        assert restored_settings.qdrant_collection_name == "custom_collection"
        assert restored_settings.embedding_model_name == "custom/model"
        assert restored_settings.embedding_batch_size == 10
        assert restored_settings.mode == "override"
        assert restored_settings.max_parallel_files == 4
        assert restored_settings.subprocess_timeout_seconds == 3600
        assert restored_settings.pdf_backend == "dlparse_v1"
        assert restored_settings.pdf_images_scale == 4.0
        assert restored_settings.do_ocr is True
        assert restored_settings.ocr_lang == ["eng", "fra"]
        assert restored_settings.do_table_structure is True
        assert restored_settings.table_structure_mode == "fast"
        assert restored_settings.chunk_max_tokens == 2000
        assert restored_settings.chunk_overlap_tokens == 100
        assert restored_settings.log_level == "DEBUG"

    def test_subprocess_request_with_config_serialization(self):
        """Test full integration: SubprocessRequest with serialized DocumentIngestionSettings."""
        # Create custom settings
        settings = DocumentIngestionSettings(
            qdrant_url="http://localhost:6333",
            qdrant_collection_name="test_collection",
            embedding_batch_size=8,
            pdf_images_scale=2.0,
            chunk_max_tokens=5000,
        )

        # Serialize settings
        config_json = settings.model_dump_json()

        # Create SubprocessRequest with config_json
        request: SubprocessRequest = {
            "document_id": "test_doc",
            "document_path": "/path/to/test.pdf",
            "staged_path": "/path/to/staged/test_doc",
            "source_format": "pdf",
            "start_from": "beginning",
            "config_json": config_json,
        }

        # Serialize request to JSON (simulating stdin write)
        request_json = json.dumps(request)

        # Deserialize request (simulating subprocess stdin read)
        restored_request: SubprocessRequest = json.loads(request_json)

        # Verify config can be reconstructed in subprocess
        restored_settings = DocumentIngestionSettings.model_validate_json(
            restored_request["config_json"]
        )

        # Verify settings match original
        assert restored_settings.qdrant_url == settings.qdrant_url
        assert restored_settings.qdrant_collection_name == settings.qdrant_collection_name
        assert restored_settings.embedding_batch_size == settings.embedding_batch_size
        assert restored_settings.pdf_images_scale == settings.pdf_images_scale
        assert restored_settings.chunk_max_tokens == settings.chunk_max_tokens

    def test_path_serialization_in_config(self):
        """Test that Path objects in config are properly serialized."""
        settings = DocumentIngestionSettings(
            data_dir=Path("/custom/data/dir"),
        )

        # Serialize to JSON
        config_json = settings.model_dump_json()

        # Deserialize back
        restored_settings = DocumentIngestionSettings.model_validate_json(config_json)

        # Verify Path is restored correctly
        assert restored_settings.data_dir == Path("/custom/data/dir")
        assert isinstance(restored_settings.data_dir, Path)

    def test_computed_properties_not_in_serialization(self):
        """Test that computed properties like input_documents_dir are not serialized."""
        settings = DocumentIngestionSettings(data_dir=Path("/test/data"))

        # Get computed property value
        input_dir = settings.input_documents_dir
        assert input_dir == Path("/test/data/input/documents")

        # Serialize to JSON
        config_json = settings.model_dump_json()
        config_dict = json.loads(config_json)

        # Verify computed property is not in serialized dict
        assert "input_documents_dir" not in config_dict
        assert "staged_documents_dir" not in config_dict

        # But data_dir should be present
        assert "data_dir" in config_dict

        # Restore and verify computed property works
        restored_settings = DocumentIngestionSettings.model_validate_json(config_json)
        assert restored_settings.input_documents_dir == input_dir


class TestProtocolEdgeCases:
    """Test edge cases and error scenarios for the subprocess protocol."""

    def test_unicode_in_error_messages(self):
        """Test that error messages with unicode characters serialize correctly."""
        response: SubprocessResponse = {
            "status": "failed",
            "document_id": "unicode_doc",
            "chunks_generated": 0,
            "vectors_upserted": 0,
            "processing_time_seconds": 5.0,
            "error_message": "File not found: /path/to/méthodologie_français.pdf",
            "error_type": "Exception",
        }

        json_str = json.dumps(response, ensure_ascii=False)
        restored_response: SubprocessResponse = json.loads(json_str)

        assert "méthodologie_français" in restored_response["error_message"]

    def test_windows_paths_in_request(self):
        """Test that Windows-style paths serialize correctly."""
        request: SubprocessRequest = {
            "document_id": "windows_doc",
            "document_path": "C:\\Users\\Admin\\Documents\\test.pdf",
            "staged_path": "C:\\Projects\\data\\staged\\documents\\windows_doc",
            "source_format": "pdf",
            "start_from": "beginning",
            "config_json": "{}",
        }

        json_str = json.dumps(request)
        restored_request: SubprocessRequest = json.loads(json_str)

        # Verify backslashes are preserved
        assert restored_request["document_path"] == "C:\\Users\\Admin\\Documents\\test.pdf"
        assert (
            restored_request["staged_path"] == "C:\\Projects\\data\\staged\\documents\\windows_doc"
        )

    def test_very_long_document_path(self):
        """Test serialization with very long file paths."""
        long_path = "/".join(["very_long_directory_name"] * 20) + "/document.pdf"

        request: SubprocessRequest = {
            "document_id": "long_path_doc",
            "document_path": long_path,
            "staged_path": "/staged/" + long_path,
            "source_format": "pdf",
            "start_from": "beginning",
            "config_json": "{}",
        }

        json_str = json.dumps(request)
        restored_request: SubprocessRequest = json.loads(json_str)

        assert restored_request["document_path"] == long_path
        assert len(json_str) > 1000  # Verify it's actually long

    def test_response_with_multiline_error_message(self):
        """Test error messages with newlines and stack traces."""
        error_message = """Traceback (most recent call last):
  File "pipeline.py", line 42, in process_document
    result = parser.parse(document)
  File "parser.py", line 123, in parse
    raise ValueError("Invalid document format")
ValueError: Invalid document format"""

        response: SubprocessResponse = {
            "status": "failed",
            "document_id": "error_doc",
            "chunks_generated": 0,
            "vectors_upserted": 0,
            "processing_time_seconds": 2.5,
            "error_message": error_message,
            "error_type": "Exception",
        }

        json_str = json.dumps(response)
        restored_response: SubprocessResponse = json.loads(json_str)

        assert "Traceback" in restored_response["error_message"]
        assert "ValueError: Invalid document format" in restored_response["error_message"]

    def test_response_with_floating_point_precision(self):
        """Test that floating point values maintain precision in serialization."""
        response: SubprocessResponse = {
            "status": "success",
            "document_id": "float_doc",
            "chunks_generated": 50,
            "vectors_upserted": 50,
            "processing_time_seconds": 123.456789012345,
            "error_message": None,
            "error_type": None,
        }

        json_str = json.dumps(response)
        restored_response: SubprocessResponse = json.loads(json_str)

        # Verify floating point values are reasonably preserved
        assert abs(restored_response["processing_time_seconds"] - 123.456789012345) < 1e-10

    def test_empty_config_json(self):
        """Test SubprocessRequest with empty config_json."""
        request: SubprocessRequest = {
            "document_id": "empty_config",
            "document_path": "/path/to/test.pdf",
            "staged_path": "/path/to/staged/test",
            "source_format": "pdf",
            "start_from": "beginning",
            "config_json": "{}",
        }

        json_str = json.dumps(request)
        restored_request: SubprocessRequest = json.loads(json_str)

        assert restored_request["config_json"] == "{}"

        # Verify empty config can be parsed
        config_dict = json.loads(restored_request["config_json"])
        assert config_dict == {}
