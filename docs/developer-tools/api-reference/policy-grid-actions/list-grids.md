# List Grids

**`GET /policies/{policyId}/grids`**

Returns every `interfaceDocumentsSourceBlock` that the caller's role can reach in the policy,
together with its filter and column schemas. Use this to discover available grids without reading
the internal policy block tree.

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

---

## Response

### Success Response

**Status:** `200 OK`

```json
[
  {
    "gridId": "installer_documents_grid",
    "title": "Installer Activity Reports",
    "description": "Documents submitted by installers",
    "filterSchema": [
      {
        "filterId": "date_filter",
        "title": "Date",
        "type": "datepicker",
        "field": "document.credentialSubject.0.reportingPeriod",
        "operators": ["eq"]
      }
    ],
    "columnSchema": [
      {
        "name": "status",
        "title": "Status",
        "type": "text",
        "bindActions": ["approve_action", "reject_action"]
      }
    ]
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `gridId` | string | Stable grid identifier — the block's `.tag`, or `sha256(uuid).slice(0,16)` fallback |
| `title` | string | Display title from the block's UI metadata |
| `description` | string | Optional description from the block's UI metadata |
| `filterSchema` | array | Filter addons configured on this grid |
| `filterSchema[].filterId` | string | Stable filter identifier |
| `filterSchema[].title` | string | Display label |
| `filterSchema[].type` | string | Input type: `dropdown`, `datepicker`, or `input` |
| `filterSchema[].field` | string | Document field the filter targets |
| `filterSchema[].operators` | array | Operator(s) configured for this filter (e.g. `["eq"]`) |
| `columnSchema` | array | Columns defined on the grid |
| `columnSchema[].name` | string | Field name |
| `columnSchema[].title` | string | Display label |
| `columnSchema[].type` | string | Column data type |
| `columnSchema[].bindActions` | array | Action tags bound to this column |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | JWT token missing or invalid |
| `403 Forbidden` | Insufficient permissions |
| `503 Service Unavailable` | Policy instance not running |
| `500 Internal Server Error` | Unexpected server failure |

