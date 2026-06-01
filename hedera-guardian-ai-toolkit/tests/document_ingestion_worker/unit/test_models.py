"""Unit tests for document_ingestion_worker.models."""

from document_ingestion_worker.models import (
    PipelineResults,
    SingleDocumentResult,
    SingleDocumentState,
    create_single_document_state,
)


class TestSingleDocumentState:
    """Test suite for SingleDocumentState TypedDict."""

    def test_single_document_state_structure(self, tmp_path):
        """Test creating a SingleDocumentState with all fields."""
        pdf_path = tmp_path / "test.pdf"
        staged_path = tmp_path / "staged" / "test"

        state: SingleDocumentState = {
            "document_id": "test",
            "pdf_path": pdf_path,
            "staged_path": staged_path,
            "parsed_document": None,
            "raw_chunks": [],
            "document_structure": None,
            "enhanced_chunks": [],
            "chunked_documents": [],
            "embedded_documents": [],
            "processed_count": 0,
            "error": None,
            "start_from": "beginning",
        }

        assert state["document_id"] == "test"
        assert state["pdf_path"] == pdf_path
        assert state["staged_path"] == staged_path
        assert state["parsed_document"] is None
        assert state["raw_chunks"] == []
        assert state["document_structure"] is None
        assert state["enhanced_chunks"] == []
        assert state["chunked_documents"] == []
        assert state["embedded_documents"] == []
        assert state["processed_count"] == 0
        assert state["error"] is None
        assert state["start_from"] == "beginning"

    def test_single_document_state_partial(self, tmp_path):
        """Test creating a partial SingleDocumentState (total=False allows this)."""
        pdf_path = tmp_path / "test.pdf"

        state: SingleDocumentState = {
            "document_id": "test",
            "pdf_path": pdf_path,
        }

        assert state["document_id"] == "test"
        assert state["pdf_path"] == pdf_path


class TestCreateSingleDocumentState:
    """Test suite for create_single_document_state function."""

    def test_create_single_document_state(self, tmp_path):
        """Test creating initial single document state."""
        pdf_path = tmp_path / "document.pdf"
        staged_path = tmp_path / "staged" / "document"

        state = create_single_document_state(pdf_path, staged_path)

        assert state["document_id"] == "document"
        assert state["pdf_path"] == pdf_path
        assert state["staged_path"] == staged_path
        assert state["parsed_document"] is None
        assert state["raw_chunks"] == []
        assert state["chunked_documents"] == []
        assert state["embedded_documents"] == []
        assert state["processed_count"] == 0
        assert state["error"] is None
        assert state["start_from"] == "beginning"

    def test_create_single_document_state_with_start_from(self, tmp_path):
        """Test creating state with custom start_from."""
        pdf_path = tmp_path / "doc.pdf"
        staged_path = tmp_path / "staged" / "doc"

        state = create_single_document_state(pdf_path, staged_path, start_from="parsed")

        assert state["start_from"] == "parsed"

        state = create_single_document_state(pdf_path, staged_path, start_from="chunked")

        assert state["start_from"] == "chunked"

    def test_document_id_derived_from_path(self, tmp_path):
        """Test that document_id is derived from pdf path stem."""
        pdf_path = tmp_path / "my_methodology.pdf"
        staged_path = tmp_path / "staged" / "my_methodology"

        state = create_single_document_state(pdf_path, staged_path)

        assert state["document_id"] == "my_methodology"


class TestSingleDocumentResult:
    """Test suite for SingleDocumentResult TypedDict."""

    def test_single_document_result_success(self, tmp_path):
        """Test creating a successful SingleDocumentResult."""
        pdf_path = tmp_path / "test.pdf"

        result: SingleDocumentResult = {
            "document_id": "test",
            "pdf_path": pdf_path,
            "chunks_generated": 50,
            "vectors_upserted": 50,
            "status": "success",
            "error": None,
            "processing_time_seconds": 12.5,
        }

        assert result["document_id"] == "test"
        assert result["pdf_path"] == pdf_path
        assert result["chunks_generated"] == 50
        assert result["vectors_upserted"] == 50
        assert result["status"] == "success"
        assert result["error"] is None
        assert result["processing_time_seconds"] == 12.5

    def test_single_document_result_failed(self, tmp_path):
        """Test creating a failed SingleDocumentResult."""
        pdf_path = tmp_path / "bad.pdf"

        result: SingleDocumentResult = {
            "document_id": "bad",
            "pdf_path": pdf_path,
            "chunks_generated": 0,
            "vectors_upserted": 0,
            "status": "failed",
            "error": "Parse error: Invalid PDF",
            "processing_time_seconds": 1.2,
        }

        assert result["status"] == "failed"
        assert result["error"] == "Parse error: Invalid PDF"
        assert result["chunks_generated"] == 0
        assert result["vectors_upserted"] == 0


class TestPipelineResults:
    """Test suite for PipelineResults TypedDict."""

    def test_pipeline_results_structure(self, tmp_path):
        """Test creating PipelineResults with all fields."""
        doc_result: SingleDocumentResult = {
            "document_id": "test",
            "pdf_path": tmp_path / "test.pdf",
            "chunks_generated": 25,
            "vectors_upserted": 25,
            "status": "success",
            "error": None,
            "processing_time_seconds": 5.0,
        }

        results: PipelineResults = {
            "batch_id": "batch-123",
            "total_documents": 2,
            "successful_documents": 1,
            "failed_documents": 1,
            "total_chunks_processed": 25,
            "total_vectors_upserted": 25,
            "document_results": [doc_result],
            "failed_files": [(tmp_path / "bad.pdf", "Parse error")],
            "total_processing_time_seconds": 15.0,
        }

        assert results["batch_id"] == "batch-123"
        assert results["total_documents"] == 2
        assert results["successful_documents"] == 1
        assert results["failed_documents"] == 1
        assert results["total_chunks_processed"] == 25
        assert results["total_vectors_upserted"] == 25
        assert len(results["document_results"]) == 1
        assert len(results["failed_files"]) == 1
        assert results["total_processing_time_seconds"] == 15.0

    def test_pipeline_results_empty(self):
        """Test creating empty PipelineResults."""
        results: PipelineResults = {
            "batch_id": "empty-batch",
            "total_documents": 0,
            "successful_documents": 0,
            "failed_documents": 0,
            "total_chunks_processed": 0,
            "total_vectors_upserted": 0,
            "document_results": [],
            "failed_files": [],
            "total_processing_time_seconds": 0.1,
        }

        assert results["total_documents"] == 0
        assert results["document_results"] == []
        assert results["failed_files"] == []
