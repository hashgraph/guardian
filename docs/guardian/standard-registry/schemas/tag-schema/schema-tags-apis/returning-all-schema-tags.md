# Returning all Schema Tags

**`GET /tags/schemas`**

Returns all tag schemas. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_READ`

---

## Request

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageIndex` | Integer | No | The number of pages to skip before starting to collect the result set |
| `pageSize` | Integer | No | The number of items to return |

---

## Response

### Success Response

**Status:** `200 OK`

Returns an array of tag schema objects. The total item count is provided in the `X-Total-Count` response header.

```json
[
  {
    "id": "f3b2a9c1e4d5678901234567",
    "uuid": "f3b2a9c1e4d5678901234567",
    "name": "Tag Schema",
    "description": "Schema for carbon credit verification tags",
    "entity": "TAG",
    "iri": "#tag-schema",
    "status": "PUBLISHED",
    "topicId": "0.0.5000001",
    "version": "1.0.0",
    "owner": "did:hedera:testnet:...",
    "messageId": "1700000000.000000001",
    "category": "TAG",
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
