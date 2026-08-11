# Export to Zip File

**`GET /policies/{policyId}/export/file`**

Returns the policy and all associated artifacts (schemas, VCs) as a zip file.

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

Returns a binary zip file.

**Headers:**
- `Content-Disposition: attachment; filename=<policy-name>`
- `Content-Type: application/zip`

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Policy not found |
| `500 Internal Server Error` | Unexpected server failure |
