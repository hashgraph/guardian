# Restoring User Profile

**`PUT /profiles/restore/{username}`**

Restores user data (policy, DID documents, VC documents) from Hedera topics asynchronously.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.PROFILES_RESTORE_ALL`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | string | Yes | The username of the user to restore |

### Request Body

```json
{
  "hederaAccountId": "0.0.4532001",
  "hederaAccountKey": "302e020100300506032b657004220420..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hederaAccountId` | string | Yes | The Hedera account ID |
| `hederaAccountKey` | string | Yes | The Hedera account private key |

---

## Response

### Success Response

**Status:** `202 Accepted`

```json
{
  "taskId": "63e3e5e8a01b3c001234abcd",
  "expectation": "Restore user profile"
}
```

Poll `GET /tasks/{taskId}` to retrieve the result.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
