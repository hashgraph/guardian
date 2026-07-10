# Returns List of Tools

**`GET /api/v1/tools`**

Returns a paginated list of all tools owned by the current Standard Registry user.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOOLS_TOOL_READ`

---

## Request

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pageIndex` | number | No | 0 | The number of pages to skip before starting to collect the result set |
| `pageSize` | number | No | 25 | The number of items to return |

---

## Response

### Success Response

**Status:** `200 OK`

Returns an array of tool objects. The total item count is provided in the `X-Total-Count` response header.

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "name": "Example Tool",
    "description": "A sample tool",
    "status": "DRAFT",
    "creator": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
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
