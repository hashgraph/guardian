# Module Differentiation APIs

Endpoints for comparing two Guardian policy modules and exporting the comparison results.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/analytics/compare/modules` | Compares two modules and returns the differences | Yes |
| `GET` | `/api/v1/analytics/compare/modules/export` | Exports module comparison results as a file | Yes |

## Endpoints

- [Returns Result of Module Comparison](returns-result-of-module-comparison.md)
- [Exports Comparison Result](exports-comparison-result.md)
