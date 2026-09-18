# Returns All Standard Registries

**`GET /accounts/standard-registries`**

Returns all Standard Registry accounts available in the system.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.ACCOUNTS_STANDARD_REGISTRY_READ`

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
    "username": "registry_user",
    "role": "STANDARD_REGISTRY",
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
