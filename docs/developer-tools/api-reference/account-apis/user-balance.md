# User Balance

**`GET /accounts/balance`**

Returns the authenticated user's current Hedera account balance.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.PROFILES_BALANCE_READ`

---

## Request

No request body or parameters required.

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "balance": 9.26,
  "unit": "Hbar",
  "user": {
    "username": "example_user",
    "did": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001"
  }
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
