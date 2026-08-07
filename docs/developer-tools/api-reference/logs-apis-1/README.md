# Logs APIs

Endpoints for retrieving Guardian system logs and log attribute metadata for diagnostic and audit purposes.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** Standard Registry role required.

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/logs` | Returns filtered system logs | Yes |
| `GET` | `/api/v1/logs/attributes` | Returns all distinct log attribute keys | Yes |

## Endpoints

- [Returning Logs](returning-logs.md)
- [Returning Log Attributes](returning-log-attributes.md)
