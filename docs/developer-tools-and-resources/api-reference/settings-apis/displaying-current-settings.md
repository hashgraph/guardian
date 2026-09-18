# Displaying Current Settings

**`GET /settings/`**

Returns the current system settings. For Standard Registry users only.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SETTINGS_SETTINGS_READ`

---

## Request

No request body or parameters required.

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "operatorAccountId": "0.0.4532001",
  "operatorPrivateKey": "302e020100300506032b657004220420..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `operatorAccountId` | string | Hedera operator account ID |
| `operatorPrivateKey` | string | Hedera operator private key |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
