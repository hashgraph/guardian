# Policy Preview from IPFS

**`POST /policies/import/message/preview`**

Previews a policy from IPFS without importing it into the local database.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_CREATE`

---

## Request

### Request Body

```json
{
  "messageId": "1680000000.000000001"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messageId` | string | Yes | The Hedera message ID containing the IPFS CID of the policy |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "policy": {
    "name": "iREC Policy",
    "version": "1.0.0",
    "description": "iREC standard policy",
    "messageId": "1680000000.000000001"
  },
  "schemas": []
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Message ID is missing or invalid |
| `500 Internal Server Error` | Unexpected server failure |
