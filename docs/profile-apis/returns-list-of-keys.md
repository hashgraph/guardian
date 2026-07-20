# Returns List of Keys

**`GET /profiles/keys`**

Returns a paginated list of existing policy signing keys for the authenticated user.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.PROFILES_USER_UPDATE`

---

## Request

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pageIndex` | number | No | 0 | Zero-based page index |
| `pageSize` | number | No | 20 | Items per page |

---

## Response

### Success Response

**Status:** `200 OK`

The response includes an `X-Total-Count` header with the total number of keys.

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "messageId": "1234567890.123456789",
    "key": "ed25519",
    "policyId": "63e3e5e8a01b3c001234abce",
    "policyName": "Example Policy"
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Key identifier |
| `messageId` | string | Hedera message ID associated with this key |
| `key` | string | Key type |
| `policyId` | string | Associated policy ID |
| `policyName` | string | Associated policy name |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
