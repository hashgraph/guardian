# Updates Policy Configuration

**`PUT /policies/{policyId}`**

Updates the policy configuration for the specified policy ID.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_UPDATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `policyId` | string | Yes | The policy ID (MongoDB ObjectId, e.g. `63e3e5e8a01b3c001234abcd`) |

### Request Body

```json
{
  "name": "iREC Policy",
  "version": "1.0.0",
  "description": "Updated description",
  "config": {}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Policy name |
| `version` | string | No | Policy version string |
| `description` | string | No | Human-readable description |
| `config` | object | No | Policy block configuration tree |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "iREC Policy",
  "version": "1.0.0",
  "status": "DRAFT",
  "config": {}
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Policy not found |
| `500 Internal Server Error` | Unexpected server failure |
