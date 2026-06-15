# Adding Settings

**`POST /settings/`**

Sets Hedera operator credentials and other system settings. For Standard Registry users only.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SETTINGS_SETTINGS_UPDATE`

---

## Request

### Request Body

```json
{
  "operatorAccountId": "0.0.4532001",
  "operatorPrivateKey": "302e020100300506032b657004220420..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `operatorAccountId` | string | Yes | Hedera operator account ID (e.g. `0.0.4532001`) |
| `operatorPrivateKey` | string | Yes | Hedera operator private key |

---

## Response

### Success Response

**Status:** `201 Created`

No response body.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
