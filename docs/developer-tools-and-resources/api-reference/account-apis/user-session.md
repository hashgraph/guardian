# User Session

**`GET /accounts/session`**

Returns the current session information for the authenticated user.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

## Request

No request body or parameters required.

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "username": "example_user",
  "role": "STANDARD_REGISTRY",
  "did": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "hederaAccountId": "0.0.4532001",
  "permissionsGroup": [],
  "permissions": []
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `500 Internal Server Error` | Unexpected server failure |
