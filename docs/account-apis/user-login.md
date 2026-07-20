# User Login

**`POST /accounts/login`**

Logs a user into the system and returns a session with access and refresh tokens.

---

## Request

### Request Body

```json
{
  "username": "example_user",
  "password": "examplePassword123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | The account username |
| `password` | string | Yes | The account password |

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
| `401 Unauthorized` | Invalid username or password |
| `500 Internal Server Error` | Unexpected server failure |
