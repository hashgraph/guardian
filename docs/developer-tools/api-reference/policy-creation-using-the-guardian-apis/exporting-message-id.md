# Exporting Message ID

**`GET /policies/{policyId}/export/message`**

Returns the Hedera message ID for the specified published policy.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `policyId` | string | Yes | The policy ID (MongoDB ObjectId, e.g. `63e3e5e8a01b3c001234abcd`) |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "iREC Policy",
  "description": "iREC standard policy",
  "version": "1.0.0",
  "messageId": "1680000000.000000001",
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Policy not found |
| `500 Internal Server Error` | Unexpected server failure |
