# Trustchain APIs

Endpoints for building and retrieving the trust chain for a Guardian verifiable presentation (VP) document.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/trust-chains/{hash}` | Builds and returns the full trust chain for the specified VP hash | Yes |
| `GET` | `/api/v1/trust-chains` | Returns a paginated list of trust chains | Yes |

## Endpoints

- [Building and Returning Trustchain](building-and-returning.md)
- [Requesting Trustchain](requesting.md)
