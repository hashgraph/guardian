# Send Data Using the External Data APIs

Endpoint for submitting data from an external source directly to a running Guardian policy block. Used to feed MRV or other external data into a policy workflow.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/external` | Sends data from an external source to the matching policy block by owner and block tag | No |

## Endpoints

- [Sends Data from an External Source](sends-data-from-an-external-source.md)
