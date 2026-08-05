# Get Grid Records

**`GET /policies/{policyId}/grids/{gridId}/records`**

Returns the grid's filtered, paginated document set as seen by the caller's role. Every record
includes `_actions` — the `actionId` values the caller's role may invoke on this grid.

> **Note:** `_actions` lists the actions available to the caller's role on this grid, applied
> uniformly across all returned records. Whether a specific record's current workflow state
> supports a given action is validated at execution time (see [Execute Action](execute-action.md)).

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

### Query Parameters

| Parameter    | Type    | Required | Default | Max | Description |
|--------------|---------|----------|---------|-----|-------------|
| `page`       | integer | No | `1` | — | 1-based page number |
| `pageSize`   | integer | No | `20` | `200` | Results per page |

> **Note:** `page`/`pageSize` are enforced consistently for every grid, regardless of how its
> underlying data source is configured. The response always includes `page`, `pageSize`,
> `totalCount`, `hasNextPage`, and `hasPreviousPage`.

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "data": [
    {
      "_id": "6627f3b2e4b0c1a2b3c4d5e6",
      "owner": "did:hedera:testnet:z...",
      "tag": "save_installer_doc",
      "option": { "status": "Submitted" },
      "document": {
        "credentialSubject": [
          {
            "field0": "SITE-001",
            "field1": "2025-04-15",
            "field2": "Pass"
          }
        ]
      },
      "createDate": "2024-04-23T10:00:00.000Z",
      "updateDate": "2024-04-23T10:00:01.000Z",
      "_actions": ["approve_action", "reject_action"]
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 1,
  "hasNextPage": false,
  "hasPreviousPage": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | VC document records visible to the caller |
| `data[]._id` | string | Record identifier — use this as `recordId` in [Execute Action](execute-action.md) |
| `data[].owner` | string | DID of the document owner |
| `data[].tag` | string | Policy block tag that produced the document |
| `data[].option` | object | Workflow option bag (e.g. `{ "status": "Submitted" }`) |
| `data[].document` | object | Cached credential subject fields |
| `data[].createDate` | string | ISO 8601 creation timestamp |
| `data[].updateDate` | string | ISO 8601 last update timestamp |
| `data[]._actions` | array | `actionId` values the caller's role may invoke on this grid, applied uniformly across records (see note above) |
| `page` | number | Current page (1-based) |
| `pageSize` | number | Results per page |
| `totalCount` | number | Total matching records |
| `hasNextPage` | boolean | Whether a further page of records exists |
| `hasPreviousPage` | boolean | Whether a prior page of records exists |

> **Note:** Use `_id` (not `id`) as the `recordId` path parameter in the execute call.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | JWT token missing or invalid |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | `gridId` not found in this policy |
| `503 Service Unavailable` | Policy instance not running, or grid not available to the caller's role |
| `500 Internal Server Error` | Unexpected server failure |

