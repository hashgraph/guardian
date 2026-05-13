# Returning list of published schemas

**`GET /tags/schemas/published`**

Returns a list of all published tag schemas.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** No specific permission required (authentication only)

---

## Request

No request parameters.

---

## Response

### Success Response

**Status:** `200 OK`

Returns an array of published tag schema objects.

```json
[
  {
    "id": "f3b2a9c1e4d5678901234567",
    "uuid": "f3b2a9c1e4d5678901234567",
    "name": "Tag Schema name",
    "entity": "TAG",
    "iri": "#tag-schema",
    "status": "PUBLISHED",
    "version": "1.0.0",
    "owner": "did:hedera:testnet:...",
    "messageId": "1700000000.000000001",
    "documentURL": "https://ipfs.io/ipfs/example",
    "contextURL": "https://ipfs.io/ipfs/example",
    "document": {},
    "context": {}
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
