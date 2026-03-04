# Integration Tests for PDF Processing

This directory contains integration tests for the PDF ingestion pipeline components.

## Overview

Integration tests verify the complete workflow using:
- Real HuggingFace models (SentenceTransformers, tokenizers)
- Real Docling PDF parsing
- Actual PDF documents
- OCR via Tesseract (optional)

## Test Data Setup

### Test PDF

Tests use the following resolution order for PDF files:

1. `TEST_PDF_PATH` environment variable (if set and exists)
2. Default fixtures in `tests/fixtures/pdfs/`

To use a custom PDF, set the environment variable:

**Linux/Mac:**
```bash
export TEST_PDF_PATH=/path/to/your/test.pdf
```

**Windows (CMD):**
```cmd
set TEST_PDF_PATH=C:\path\to\your\test.pdf
```

**Windows (PowerShell):**
```powershell
$env:TEST_PDF_PATH="C:\path\to\your\test.pdf"
```

Tests will skip if no PDF is available (neither environment variable nor default fixtures).

### Optional: Tesseract OCR

For tests that use OCR features, install Tesseract:

**Windows:**
1. Download from [Tesseract Windows builds](https://github.com/UB-Mannheim/tesseract/wiki)
2. Install to default location: `C:\Program Files\Tesseract-OCR`
3. The test fixtures will automatically configure environment variables

**Linux:**
```bash
sudo apt-get install tesseract-ocr
```

**Mac:**
```bash
brew install tesseract
```

## Running Integration Tests

### Run all integration tests
```bash
pytest tests/document_ingestion_worker/integration/document_parsing/ -v -m integration
```

### Run specific test file
```bash
pytest tests/document_ingestion_worker/integration/document_parsing/test_docling_chunker_integration.py -v
```

### Run excluding slow tests
```bash
pytest tests/document_ingestion_worker/integration/document_parsing/ -v -m "integration and not slow"
```

### Run with coverage
```bash
pytest tests/document_ingestion_worker/integration/document_parsing/ \
  --cov=document_ingestion_worker/src/document_ingestion_worker/document_parsing \
  --cov-report=html \
  -m integration
```

## Test Structure

### conftest.py
Shared fixtures for all integration tests:
- `real_pdf_path`: Provides test PDF from environment variable
- `ultra_fast_parser`: Fast parser with minimal processing
- `default_parser`: Full-featured parser with OCR and tables
- `sample_docling_document`: Pre-parsed document (session-scoped)
- `setup_tesseract_env`: Configures Tesseract environment

### test_pdf_to_docling_parser_integration.py
Tests for PDF parsing (PdfParser):
- Various parser configurations (ultra-fast, default, balanced)
- PDF to DoclingDocument conversion
- JSON export and round-trip serialization
- Error handling

### test_pdf_chunker_integration.py
Tests for document chunking (DoclingChunker):
- Real model initialization and tokenization
- Document chunking with various token limits
- Chunk overlap verification
- Metadata extraction (headings, page numbers)
- End-to-end workflow: PDF → Parse → Chunk → Vector-ready
- Consistency and determinism checks

## Performance Notes

- **Session-scoped fixtures**: Expensive operations (model loading, PDF parsing) run once per session
- **Fast configurations**: Use `ultra_fast_parser` for tests that don't need full features
- **Marking slow tests**: Tests marked with `@pytest.mark.slow` can be excluded for faster iteration

## CI/CD Considerations

For CI/CD pipelines:

1. **Skip tests if no PDF available**: Tests gracefully skip when `TEST_PDF_PATH` is not set
2. **Optional test data**: Consider storing test PDFs in a separate artifacts repository
3. **Model caching**: Cache HuggingFace models to avoid re-downloading:
   ```bash
   export TRANSFORMERS_CACHE=/path/to/cache
   ```

## Troubleshooting

### Tests skip with "PDF fixture not found"
Ensure test PDFs exist in `tests/fixtures/pdfs/` or set the environment variable:
```bash
export TEST_PDF_PATH=/path/to/test.pdf
pytest tests/document_ingestion_worker/integration/document_parsing/
```

### Tesseract not found errors
Ensure Tesseract is installed and in PATH:
```bash
tesseract --version
```

If not in PATH, set environment variables:
```bash
export TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata
```

### Model download errors
Integration tests download models on first run. Ensure internet connectivity or pre-cache models:
```bash
python -c "from transformers import AutoTokenizer; AutoTokenizer.from_pretrained('all-MiniLM-L6-v2')"
```

### Out of memory errors
Some tests are memory-intensive. Consider:
- Using smaller test PDFs
- Reducing batch sizes in parser configurations
- Running tests with `--forked` to isolate memory usage

## Best Practices

1. **Use appropriate test PDFs**: Keep test PDFs small (<10 pages) for faster tests
2. **Mark slow tests**: Use `@pytest.mark.slow` for tests that take >5 seconds
3. **Session fixtures**: Leverage session-scoped fixtures for expensive setup
4. **Graceful skipping**: Always allow tests to skip when resources unavailable
5. **Document requirements**: Clearly document environment variables and dependencies
