# Publish a Policy

**`PUT /policies/{policyId}/publish`**

Publishes the policy with the specified ID onto IPFS and sends a message with its IPFS CID into the corresponding Hedera topic.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_REVIEW`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `policyId` | string | Yes | The policy ID (MongoDB ObjectId, e.g. `63e3e5e8a01b3c001234abcd`) |

### Request Body

```json
{
  "policyVersion": "1.0.0"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `policyVersion` | string | Yes | The version string to assign when publishing (e.g. `1.0.0`) |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "valid": true,
  "policies": []
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Policy not found |
| `500 Internal Server Error` | Unexpected server failure |
