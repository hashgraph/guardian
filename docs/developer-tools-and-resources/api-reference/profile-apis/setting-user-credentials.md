# Setting User Credentials

**`PUT /api/v1/profiles/{username}`**

Sets Hedera credentials for the specified user. For users with the Standard Registry role it also creates an address book.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.PROFILES_USER_UPDATE`

---

## Request

### Path Parameters

| Parameter  | Type   | Required | Description                                       |
|------------|--------|----------|---------------------------------------------------|
| `username` | string | Yes      | The name of the user for whom to update the information |

### Request Body

```json
{
  "hederaAccountId": "0.0.4532001",
  "hederaAccountKey": "302e...",
  "useFireblocksSigning": false,
  "fireblocksConfig": {}
}
```

| Field                | Type    | Required | Description                                        |
|----------------------|---------|----------|----------------------------------------------------|
| `hederaAccountId`    | string  | Yes      | The Hedera account ID to associate with this user  |
| `hederaAccountKey`   | string  | Yes      | The private key for the Hedera account             |
| `useFireblocksSigning` | boolean | No     | Whether to use Fireblocks for transaction signing  |
| `fireblocksConfig`   | object  | No       | Fireblocks configuration details                   |

---

## Response

### Success Response

**Status:** `204 No Content`

### Error Responses

| Status | Description |
|--------|-------------|
| `400 Bad Request` | Malformed request body |
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
