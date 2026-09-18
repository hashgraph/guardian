# Policy Differentiation APIs

Endpoints for comparing two Guardian policies and exporting the comparison results. Used for audit and review of policy version differences.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/analytics/compare/policies` | Compares two policies and returns the differences | Yes |
| `POST` | `/api/v1/analytics/search/policies` | Searches for similar policies | Yes |
| `GET` | `/api/v1/analytics/compare/policies/export` | Exports policy comparison results as a file | Yes |

## Endpoints

- [Returns Result of Policy Comparison](returns-result-of-policy-comparison.md)
- [Searching Policies](searching-policies.md)
- [Exports Comparison Results](exports-comparison-results.md)
