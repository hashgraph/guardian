# Get Recording or Running Status

**`GET /api/v1/record/{policyId}/status`**

Returns the current recording or running status for a policy.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_RECORD_ALL`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `policyId` | string | Yes | The ID of the policy whose record status is being queried |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "type": "RECORDING",
  "policyId": "63e3e5e8a01b3c001234abcd",
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "STOPPED"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Current mode: `RECORDING` or `RUNNING` |
| `policyId` | string | The policy identifier |
| `uuid` | string | Unique identifier for the current recording or run session |
| `status` | string | Session status: `NONE`, `RECORDING`, `RUNNING`, or `STOPPED` |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
