# Returns all Modules (Api-Version: 2)

**`GET /modules`** — requires `Api-Version: 2` header

Returns all modules. Version 2 fetches only the required module fields (optimised payload) via `getModuleV2`. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.MODULES_MODULE_READ`

---

## Request

### Headers

| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| `Api-Version` | `2` | Yes | Enables V2 behaviour (optimised field set) |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageIndex` | Integer | No | The number of pages to skip before starting to collect the result set |
| `pageSize` | Integer | No | The number of items to return |

---

## Response

### Success Response

**Status:** `200 OK`

Returns an array of module objects containing only required fields. The total item count is provided in the `X-Total-Count` response header.

```json
[
  {
    "id": "f3b2a9c1e4d5678901234567",
    "uuid": "f3b2a9c1e4d5678901234567",
    "name": "Module name",
    "description": "Description",
    "status": "DRAFT",
    "creator": "did:hedera:testnet:...",
    "owner": "did:hedera:testnet:...",
    "topicId": "0.0.5000001",
    "messageId": "1700000000.000000001"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
