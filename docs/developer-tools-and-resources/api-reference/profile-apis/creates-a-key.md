# Creates a Key

**`POST /profiles/keys`**

Creates a new policy signing key for the authenticated user.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.PROFILES_USER_UPDATE`

---

## Request

### Request Body

```json
{
  "messageId": "1234567890.123456789",
  "key": "ed25519"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messageId` | string | Yes | Hedera message ID to associate with this key |
| `key` | string | No | Key type (e.g. `ed25519`) |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "messageId": "1234567890.123456789",
  "key": "ed25519",
  "policyId": "63e3e5e8a01b3c001234abce",
  "policyName": "Example Policy"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Body or `messageId` is empty |
| `500 Internal Server Error` | Unexpected server failure |
