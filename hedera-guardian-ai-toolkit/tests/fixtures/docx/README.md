# DOCX Test Fixtures

Test fixtures for DOCX document extraction feature.

## Files

| File | Purpose | Content |
|------|---------|---------|
| `simple.docx` | Basic DOCX parsing validation | Simple text document with paragraphs |
| `with_tables.docx` | Table extraction testing | Document containing data tables |
| `with_headings.docx` | Structure extraction testing | Document with Heading 1/2/3 hierarchy |

## Usage

These fixtures are used by:
- `tests/document_ingestion_worker/unit/document_parsing/test_docx_to_docling_parser.py`
- `tests/document_ingestion_worker/integration/document_parsing/test_docx_to_docling_parser_integration.py`

## Creating Test Files

The DOCX files were created using the `python-docx` library. To regenerate:

```bash
cd tests/fixtures/docx
python create_fixtures.py
```

## Notes

- All DOCX files use Word's built-in heading styles for consistent structure extraction
- Table data represents typical methodology parameters for realistic testing
- Files are intentionally small (~1-2 pages) for fast test execution
