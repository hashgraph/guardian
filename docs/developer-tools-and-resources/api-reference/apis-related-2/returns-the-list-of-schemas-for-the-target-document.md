# Returns the List of Schemas for the Target Document

**`GET /api/v1/policy-comments/{policyId}/{documentId}/schemas`**

Returns the list of schemas applicable to the target document within the policy.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_EXECUTE`, `Permissions.POLICIES_POLICY_MANAGE`, or `Permissions.POLICIES_POLICY_AUDIT`

---

## Request

### Path Parameters

| Parameter    | Type   | Required | Description         |
|--------------|--------|----------|---------------------|
| `policyId`   | string | Yes      | Policy identifier   |
| `documentId` | string | Yes      | Document identifier |

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
