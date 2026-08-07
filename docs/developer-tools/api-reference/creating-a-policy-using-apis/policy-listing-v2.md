# Policy Listing (Api-Version: 2)

**`GET /policies`** — requires `Api-Version: 2` header

Returns all policies. Version 2 adds support for filtering by `status` and includes extended `userGroups` and `userGroup` fields in each policy object.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permissions:** One of:
- `Permissions.POLICIES_POLICY_READ`
- `Permissions.POLICIES_POLICY_EXECUTE`
- `Permissions.POLICIES_POLICY_MANAGE`
- `Permissions.POLICIES_POLICY_AUDIT`

---

## Request

### Headers

| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| `Api-Version` | `2` | Yes | Enables V2 behaviour (status filter, extended user group fields) |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageIndex` | number | No | The number of pages to skip before starting to collect the result set |
| `pageSize` | number | No | The number of items to return |
| `type` | string | No | Policy type (e.g. `local`) |
| `status` | string | No | Filter by policy status. Multiple values can be passed as a comma-separated list (e.g. `PUBLISH,DISCONTINUED`). Allowed values: `DRAFT`, `DRY_RUN`, `DEMO`, `PUBLISH`, `DISCONTINUED`, `FAILED` |
| `name` | string | No | Filter by policy name (case-insensitive substring match, e.g. `iREC`) |
| `version` | string | No | Filter by exact policy version (e.g. `1.0.0`) |

---

## Response

### Success Response

**Status:** `200 OK`

Returns an array of policy objects. The total item count is provided in the `X-Total-Count` response header.

Each policy object may include:
- `userGroups` — all group rows for the current user on that policy, including inactive groups
- `userGroup` — the last active group in server order (useful for UI labels such as `groupLabel` or `uuid`)

**Behaviour by role:**
- **Standard Registry on dry-run policies:** `userRole` and `userGroup` reflect the last active role (often a virtual user). `userGroups` contains the group rows for that role. When the last active role is Administrator, `userGroups` is `[]`.
- **Regular users:** `userGroups` usually shows roles on published policies.

```json
[
  {
    "id": "f3b2a9c1e4d5678901234567",
    "name": "Policy name",
    "description": "Policy description",
    "status": "PUBLISH",
    "version": "1.0.0",
    "topicId": "0.0.5000001",
    "owner": "did:hedera:testnet:...",
    "userRoles": ["Applicant"],
    "userRole": "Applicant",
    "userGroup": {
      "uuid": "f3b2a9c1e4d5678901234567",
      "groupLabel": "Applicant",
      "active": true
    },
    "userGroups": [
      {
        "uuid": "f3b2a9c1e4d5678901234567",
        "groupLabel": "Applicant",
        "active": true
      }
    ]
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
