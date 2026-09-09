# Validate DID Document

**`POST /profiles/did-document/validate`**

Validates the format and structure of a DID document.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.PROFILES_USER_UPDATE`

---

## Request

### Request Body

A DID document object following the W3C DID specification.

```json
{
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
}
```

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
| `valid` | boolean | Whether the DID document is valid |
| `error` | string \| null | Error message if invalid |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Request body is empty |
| `500 Internal Server Error` | Unexpected server failure |
