# List Actions on a Grid

**`GET /policies/{policyId}/grids/{gridId}/actions`**

Returns all row-level actions the caller's role may execute on the specified grid. Actions whose
`requiredRoles` the caller does not hold are automatically omitted, inaccessible actions are
never leaked.

---

## Authentication

Requires a valid Guardian JWT bearer token. The caller must hold at least one of:

- `POLICIES_POLICY_EXECUTE`
- `POLICIES_POLICY_MANAGE`

---

## Request

### Path Parameters

| Parameter  | Type   | Required | Description |
|------------|--------|----------|-------------|
| `policyId` | string | Yes | MongoDB ObjectId of the running policy |
| `gridId`   | string | Yes | Stable grid identifier returned by [List Grids](list-grids.md) |

---

## Response

### Success Response

**Status:** `200 OK`

```json
[
  {
    "actionId": "approve_action",
    "label": "Approved",
    "requiredRoles": ["Standard Registry"],
    "appliesTo": "row",
    "inputSchema": { "type": "object", "properties": {} }
  },
  {
    "actionId": "reject_action",
    "label": "Rejected",
    "requiredRoles": ["Standard Registry"],
    "appliesTo": "row",
    "inputSchema": { "type": "object", "properties": {} }
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `actionId` | string | Stable action identifier — use this in the [Execute Action](execute-action.md) call |
| `label` | string | Human-readable action label |
| `requiredRoles` | array | Policy roles that may execute this action |
| `appliesTo` | string | Always `"row"` — actions target individual records |
| `inputSchema` | object | JSON Schema for the action's request body (currently always `{}`) |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | JWT token missing or invalid |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | `gridId` not found in this policy |
| `503 Service Unavailable` | Policy instance not running, or grid not available to the caller's role |
| `500 Internal Server Error` | Unexpected server failure |

