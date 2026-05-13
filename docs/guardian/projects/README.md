# Projects APIs

Endpoints for searching projects and comparing project documents.

**Base path:** `/projects`

---

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/projects/search` | Search projects by category or policy filters |
| `POST` | `/projects/compare/documents` | Compare two or more documents (V1) |
| `POST` | `/projects/compare/documents` + `Api-Version: 2` | Compare two or more documents (V2 — extended response) |
| `GET` | `/projects/properties` | Return all project properties |

## Endpoints

- [Search Projects](search-projects.md)
- [Compare Documents](compare-documents.md)
- [Compare Documents (Api-Version: 2)](compare-documents-v2.md)
- [Get Project Properties](get-project-properties.md)
