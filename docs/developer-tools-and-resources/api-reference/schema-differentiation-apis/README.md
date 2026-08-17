# Schema Differentiation APIs

Endpoints for comparing two schemas and exporting the comparison results. Useful for reviewing changes between schema versions.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/analytics/compare/schemas` | Compares two schemas and returns the differences | Yes |
| `GET` | `/api/v1/analytics/compare/schemas/export` | Exports schema comparison results as a file | Yes |

## Endpoints

- [Returns Result of Schema Comparison](returns-result-of-schema-comparison.md)
- [Exports Schema Differentiation Results](exports-schema-differentiation-results.md)
