# Test PDF Fixtures

This directory contains PDF files used for integration testing of the document ingestion pipeline.

## Files

### simple_methodology.pdf
A 2-page document with structured content:
- Title and introduction
- Multiple sections with headings
- Bullet points and numbered lists
- Suitable for testing basic chunking and embedding

### with_tables.pdf
A document containing:
- Text content with headings
- Simple tables with data
- Suitable for testing table extraction

### multipage_report.pdf
A longer document (5+ pages) with:
- Multiple chapters/sections
- Various content types
- Suitable for testing chunking of larger documents

### minimal_content.pdf
A minimal document with very little text:
- Only a title and one short sentence
- Used for testing edge case where chunker produces 0 or 1 chunks

## Regenerating Test PDFs

If you need to regenerate these PDFs, run:

```bash
cd tests/fixtures/pdfs
python generate_test_pdfs.py
```

## Notes

- These PDFs are committed to the repository for reproducible tests
- They are designed to have proper document structure (headings, sections)
- The content is synthetic but structured like real methodology documents
