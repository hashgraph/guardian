# Project Comparison APIs

Endpoints for comparing Guardian project documents, VP documents, and searching projects by property filters.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/analytics/compare/documents` | Compares two documents and returns the differences | Yes |
| `POST` | `/api/v1/projects/compare/documents` | Compares VP documents across projects | Yes |
| `GET` | `/api/v1/projects/properties` | Returns all project property definitions | Yes |
| `POST` | `/api/v1/projects/search` | Searches for projects matching specified filter parameters | Yes |

## Endpoints

- [Comparing Documents](comparing-documents.md)
- [Comparing VP Documents](comparing-vp-documents-v1.md)
- [Retrieves All Properties](retrieves-all-properties.md)
- [Search Projects by Filters](search-projects-by-filters.md)
