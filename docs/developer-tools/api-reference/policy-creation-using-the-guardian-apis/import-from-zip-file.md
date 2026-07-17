# Import from Zip File

**`POST /policies/import/file`**

Imports a new policy and all associated artifacts (schemas, VCs) from the provided zip file into the local database.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_CREATE`

---

## Request

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `versionOfTopicId` | string | No | — | The topic ID of the policy version to associate |
| `demo` | boolean | No | false | Import the policy in demo mode |

### Request Body

The request body must be the raw binary content of a `.zip` file exported from Guardian.

**Content-Type:** `application/octet-stream`

---

## Response

### Success Response

**Status:** `201 Created`

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "name": "iREC Policy",
    "version": "1.0.0",
    "status": "DRAFT",
    "topicId": "0.0.4532001"
  }
]
```

Returns the full list of policies after import.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Invalid zip file content |
| `500 Internal Server Error` | Unexpected server failure |
