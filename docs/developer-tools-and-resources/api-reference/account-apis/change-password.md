# Change Password

**`POST /accounts/change-password`**

Changes the authenticated user's password.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

## Request

### Request Body

```json
{
  "username": "example_user",
  "oldPassword": "examplePassword123",
  "newPassword": "newSecurePassword456"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | The account username |
| `oldPassword` | string | Yes | The current password |
| `newPassword` | string | Yes | The new password to set |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "username": "example_user",
  "role": "STANDARD_REGISTRY",
  "did": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Invalid credentials or missing token |
| `500 Internal Server Error` | Unexpected server failure |
