import pytest


@pytest.fixture
def sample_data_dir(tmp_path):
    """Create a temporary data directory for testing."""
    data_dir = tmp_path / "documents"
    data_dir.mkdir()
    return data_dir


@pytest.fixture
def sample_document(sample_data_dir):
    """Create a sample test document."""
    doc_path = sample_data_dir / "test_document.txt"
    doc_path.write_text("Sample document content for testing")
    return doc_path
