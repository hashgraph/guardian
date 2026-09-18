# Returns the Count of Messages in the Target Discussion

**`GET /api/v1/policy-comments/{policyId}/{documentId}/comments/count`**

Returns the total count of messages across all discussions for the target document.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_EXECUTE` or `Permissions.POLICIES_POLICY_MANAGE`

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
{
  "count": 12
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Validation error — invalid field values |
| `500 Internal Server Error` | Unexpected server failure |
| `503 Service Unavailable` | Policy block unavailable |
