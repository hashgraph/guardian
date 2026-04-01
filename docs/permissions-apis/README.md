# Permissions & Roles APIs

Base URL: `/api/v1/permissions`
Authentication: All endpoints require a valid Bearer JWT token. Most endpoints require Standard Registry role.

Guardian uses a role-based access control (RBAC) system. Standard Registry users create custom roles with specific permission sets, then assign those roles to users under their organization.

---

## GET /permissions

Returns the full list of available system-level permissions.

**Authentication:** Required — `PERMISSIONS_ROLE_READ` or `DELEGATION_ROLE_MANAGE`

### Response 200 OK

Array of permission descriptor objects.

| Field | Type | Description |
|---|---|---|
| name | string | Permission identifier (e.g., `POLICIES_POLICY_READ`) |
| category | string | Permission category (e.g., `POLICIES`, `TOKENS`) |
| entity | string | Target entity (e.g., `POLICY`, `TOKEN`) |
| action | string | Allowed action (e.g., `READ`, `CREATE`, `MANAGE`) |
| disabled | boolean | Whether the permission is currently disabled |

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 500 | Internal server error |

### Example

**Request:**
```http
GET /api/v1/permissions
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Response 200:**
```json
[
  { "name": "POLICIES_POLICY_READ", "category": "POLICIES", "entity": "POLICY", "action": "READ", "disabled": false },
  { "name": "TOKENS_TOKEN_CREATE", "category": "TOKENS", "entity": "TOKEN", "action": "CREATE", "disabled": false }
]
```

---

## GET /permissions/roles

Returns a paginated list of roles for the authenticated Standard Registry.

**Authentication:** Required — `PERMISSIONS_ROLE_READ` or `DELEGATION_ROLE_MANAGE`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| name | string | No | Filter roles by name |
| pageIndex | number | No | Zero-based page number (default: 0) |
| pageSize | number | No | Items per page (default: 20) |

### Response 200 OK

Array of role objects. Total count in `X-Total-Count` header.

| Field | Type | Description |
|---|---|---|
| id | string | Role identifier |
| name | string | Human-readable role name |
| description | string | Role description |
| permissions | string[] | List of permission names assigned to this role |
| owner | string | DID of the Standard Registry that owns this role |
| default | boolean | Whether this is the default role assigned to new users |

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 500 | Internal server error |

### Example

**Request:**
```http
GET /api/v1/permissions/roles?pageIndex=0&pageSize=10
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Response 200:**
```
X-Total-Count: 3
```
```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "name": "MRV Submitter",
    "description": "Can submit MRV data and view policies",
    "permissions": ["POLICIES_POLICY_READ", "POLICIES_POLICY_EXECUTE"],
    "owner": "did:hedera:testnet:zHcDLGFN...",
    "default": false
  }
]
```

---

## POST /permissions/roles

Creates a new custom role.

**Authentication:** Required — `PERMISSIONS_ROLE_CREATE`

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| name | string | Yes | Unique role name within the organization |
| description | string | No | Human-readable description of the role |
| permissions | string[] | Yes | Array of permission names to assign to this role |

### Response 201 Created

Returns the created role object.

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 422 | Validation error — missing required fields |
| 500 | Internal server error |

### Example

**Request:**
```http
POST /api/v1/permissions/roles
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "name": "MRV Submitter",
  "description": "Can submit MRV data and view approved policies",
  "permissions": ["POLICIES_POLICY_READ", "POLICIES_POLICY_EXECUTE"]
}
```

**Response 201:**
```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "MRV Submitter",
  "description": "Can submit MRV data and view approved policies",
  "permissions": ["POLICIES_POLICY_READ", "POLICIES_POLICY_EXECUTE"],
  "owner": "did:hedera:testnet:zHcDLGFN..."
}
```

---

## PUT /permissions/roles/:id

Updates an existing role's name, description, or permission set.

**Authentication:** Required — `PERMISSIONS_ROLE_UPDATE`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| id | string | Yes | Role identifier |

### Request Body

Same shape as POST — provide updated `name`, `description`, and/or `permissions`.

### Response 200 OK

Returns the updated role object.

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 404 | Role not found |
| 500 | Internal server error |

---

## DELETE /permissions/roles/:id

Deletes a role. Users assigned this role will lose the associated permissions.

**Authentication:** Required — `PERMISSIONS_ROLE_DELETE`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| id | string | Yes | Role identifier |

### Response 200 OK

Returns confirmation of deletion.

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 404 | Role not found |
| 500 | Internal server error |

---

## POST /permissions/roles/default

Sets the default role that is automatically assigned to new users who join the organization.

**Authentication:** Required — `PERMISSIONS_ROLE_CREATE`

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| id | string | Yes | ID of the role to set as default |

### Response 200 OK

Returns the updated role marked as default.

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 404 | Role not found |
| 500 | Internal server error |

---

## GET /permissions/users

Returns a paginated list of users under the authenticated Standard Registry.

**Authentication:** Required — `PERMISSIONS_ROLE_MANAGE` or `DELEGATION_ROLE_MANAGE`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| role | string | No | Filter by role ID |
| pageIndex | number | No | Zero-based page number |
| pageSize | number | No | Items per page |

### Response 200 OK

Array of user objects with their current permission assignments. Total in `X-Total-Count`.

| Field | Type | Description |
|---|---|---|
| username | string | User's login name |
| did | string | User's Hedera DID |
| parent | string | Standard Registry DID |
| role | string | Currently assigned role name |
| permissionsGroup | array | List of role assignments |

---

## GET /permissions/users/:username

Returns permission details for a specific user.

**Authentication:** Required — `PERMISSIONS_ROLE_MANAGE` or `DELEGATION_ROLE_MANAGE`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| username | string | Yes | Target user's login name |

### Response 200 OK

Returns a `UserDTO` with the user's current role and permissions.

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 404 | User not found or not under this Standard Registry |
| 500 | Internal server error |

---

## PUT /permissions/users/:username

Assigns one or more roles to a user.

**Authentication:** Required — `PERMISSIONS_ROLE_MANAGE`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| username | string | Yes | Target user's login name |

### Request Body

Array of role IDs to assign to the user.

```json
["63e3e5e8a01b3c001234abcd", "63e3e5e8a01b3c001234efgh"]
```

### Response 200 OK

Returns the updated `UserDTO`.

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 404 | User not found |
| 500 | Internal server error |

---

## GET /permissions/users/:username/policies

Returns a paginated list of policies accessible to a specific user.

**Authentication:** Required — `PERMISSIONS_ROLE_MANAGE` or `DELEGATION_ROLE_MANAGE`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| username | string | Yes | Target user's login name |

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| pageIndex | number | No | Zero-based page number |
| pageSize | number | No | Items per page |
| status | string | No | Filter by policy status (`DRAFT`, `PUBLISH`, `DISCONTINUED`) |

### Response 200 OK

Array of accessible policy objects.

---

## POST /permissions/users/:username/policies/assign

Assigns or unassigns a policy to a specific user.

**Authentication:** Required — `PERMISSIONS_ROLE_MANAGE`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| username | string | Yes | Target user's login name |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| policyIds | string[] | Yes | Array of policy IDs to assign or unassign |
| assign | boolean | Yes | `true` to assign, `false` to unassign |

### Response 200 OK

Returns updated policy assignment list.

### Example

**Request:**
```http
POST /api/v1/permissions/users/mrv_user/policies/assign
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "policyIds": ["63e3e5e8a01b3c001234abcd"],
  "assign": true
}
```

---

## PUT /permissions/users/:username/delegate

Sets a delegation role for a user — allows them to act with the permissions of a delegated role.

**Authentication:** Required — `DELEGATION_ROLE_MANAGE`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| username | string | Yes | Target user's login name |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| roleId | string | No | Role ID to delegate. Pass `null` to remove delegation. |

### Response 200 OK

Returns the updated user object.

---

## POST /permissions/users/:username/policies/delegate

Delegates policy access to a user under a specific role.

**Authentication:** Required — `DELEGATION_ROLE_MANAGE`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| username | string | Yes | Target user's login name |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| policyIds | string[] | Yes | Policies to delegate access to |
| assign | boolean | Yes | `true` to delegate, `false` to remove |
