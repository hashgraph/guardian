# Returns the List of Schemas Present in the Target Policy

**`GET /api/v1/policy-repository/{policyId}/schemas`**

Returns the list of schemas present in the target policy.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_AUDIT`

---

## Request

### Path Parameters

| Parameter  | Type   | Required | Description       |
|------------|--------|----------|-------------------|
| `policyId` | string | Yes      | Policy identifier |

---

## Response

### Success Response

**Status:** `200 OK`

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "name": "Facility Schema",
    "version": "1.0.0",
    "iri": "#facility-schema"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Invalid `policyId` value |
| `500 Internal Server Error` | Unexpected server failure |
