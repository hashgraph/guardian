# Standard Registries Aggregated

**`GET /accounts/standard-registries/aggregated`**

Returns all Standard Registry accounts aggregated with their associated policies and VC documents.

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
    "did": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "username": "registry_user",
    "hederaAccountId": "0.0.4532001",
    "vcDocument": {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      "id": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
      "type": ["VerifiableCredential"]
    },
    "policies": [
      {
        "id": "63e3e5e8a01b3c001234abcd",
        "name": "Example Policy",
        "version": "1.0.0",
        "status": "PUBLISH"
      }
    ]
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
