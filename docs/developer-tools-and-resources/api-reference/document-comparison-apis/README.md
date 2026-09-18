# Document Comparison APIs

Endpoints for comparing Guardian VC documents and exporting the comparison results.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/analytics/compare/documents` | Compares two VC documents and returns the differences | Yes |
| `GET` | `/api/v1/analytics/compare/documents/export` | Exports document comparison results as a file | Yes |

## Endpoints

- [Compare Documents](compare-documents.md)
- [Export Comparison Results](export-comparison-results.md)
