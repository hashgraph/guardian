# Validate DID Keys

**`POST /profiles/did-keys/validate`**

Validates the keys within a DID document by checking that the provided private keys correspond to the public keys declared in the document.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.PROFILES_USER_UPDATE`

---

## Request

### Request Body

```json
{
  "document": {
    "@context": ["https://www.w3.org/ns/did/v1"],
    "id": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "verificationMethod": [
      {
        "id": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001#did-root-key",
        "type": "Ed25519VerificationKey2018",
        "controller": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
        "publicKeyBase58": "H3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV"
      }
    ]
  },
  "keys": [
    {
      "id": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001#did-root-key",
      "privateKeyBase58": "4mhhQT2UKa..."
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `document` | object | Yes | The DID document to validate |
| `keys` | array | Yes | Array of key objects with `id` and `privateKeyBase58` |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "valid": true,
  "error": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `valid` | boolean | Whether all keys are valid |
| `error` | string \| null | Error message if validation fails |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Body, document, or keys field is empty |
| `500 Internal Server Error` | Unexpected server failure |
