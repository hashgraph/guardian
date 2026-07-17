# User Listing (Excluding Standard Registry and Auditor)

**`GET /accounts/`**

Returns a list of all user accounts, excluding those with Standard Registry and Auditor roles.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.ACCOUNTS_ACCOUNT_READ`

---

## Request

No request body or parameters required.

---

## Response

### Success Response

**Status:** `200 OK`

```json
[
  {
    "username": "example_user",
    "role": "USER",
    "did": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "hederaAccountId": "0.0.4532001",
    "confirmed": true,
    "failed": false
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
