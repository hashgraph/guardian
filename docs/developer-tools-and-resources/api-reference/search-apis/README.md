# Guided Search APIs

Endpoints for discovering and filtering Guardian policies and methodologies by category and properties.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/policies/categories` | Returns a list of all policy categories | Yes |
| `POST` | `/api/v1/policies/filtered-policies` | Returns policies best suited for specified filter parameters | Yes |

## Endpoints

- [Retrieves List of All Categories](retrieves-list-of-all-categories.md)
- [List of Policies Best Suited for Given Parameters](list-of-policies-that-are-best-suited-for-given-parameters.md)
