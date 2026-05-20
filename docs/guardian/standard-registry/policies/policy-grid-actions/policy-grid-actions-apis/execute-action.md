# Execute an Action on a Record

**`POST /policies/{policyId}/grids/{gridId}/records/{recordId}/actions/{actionId}`**

Executes the named workflow action on the specified record. The server resolves `gridId` and
`actionId` to the appropriate internal policy block and option value. No block UUID is ever
exposed or required.

---

## Authentication

Requires a valid Guardian JWT bearer token. The caller must hold at least one of:

- `POLICIES_POLICY_EXECUTE`
- `POLICIES_POLICY_MANAGE`

The action block's own `requiredRoles` are also enforced — the caller must hold a matching
policy role.

---

## Request

### Path Parameters

| Parameter    | Type   | Required | Description |
|--------------|--------|----------|-------------|
| `policyId`   | string | Yes | MongoDB ObjectId of the running policy |
| `gridId`     | string | Yes | Stable grid identifier from [List Grids](list-grids.md) |
| `recordId`   | string | Yes | The `_id` value from [Get Records](get-records.md) |
| `actionId`   | string | Yes | The `actionId` value from [List Actions](list-actions.md) |

### Request Body

For standard selector and button actions an empty object is sufficient. The server resolves the
document internally and applies the configured field mutation:

```json
{}
```

---

## Response

### Success Response

**Status:** `200 OK`  
**Body:** `{}`

The `200` status code is the success signal. The action triggers an internal Guardian event
chain. Re-fetch [Get Records](get-records.md) to observe the updated field value (e.g.
`option.status` changes from `"Submitted"` to `"Approved"`).

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | JWT token missing or invalid |
| `403 Forbidden` | Insufficient permissions, or caller's role does not satisfy the action's `requiredRoles` |
| `404 Not Found` | `gridId`, `actionId`, or `recordId` not found |
| `503 Service Unavailable` | Policy instance not running, or action not available to the caller's role |
| `500 Internal Server Error` | Unexpected server failure |

