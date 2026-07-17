# Returns Tools Menu

**`GET /api/v1/tools/menu/all`**

Returns a list of all available tools for use in the policy editor menu.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_UPDATE`, `Permissions.MODULES_MODULE_UPDATE`, or `Permissions.TOOLS_TOOL_UPDATE`

---

## Request

No request parameters.

---

## Response

### Success Response

**Status:** `200 OK`

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "name": "Example Tool",
    "description": "A sample tool",
    "status": "PUBLISHED",
    "creator": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "topicId": "0.0.5000001",
    "messageId": "1700000000.000000001"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
