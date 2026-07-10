# Importing Zip File Containing Schema

**`POST /schemas/{topicId}/import/file`**

Imports a new schema from a zip file into the local database for the specified topic.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `topicId` | string | Yes | The Hedera topic ID to import the schema under (e.g. `0.0.4532001`) |

### Request Body

The request body must be the raw binary content of a `.zip` file exported from Guardian.

**Content-Type:** `application/octet-stream`

---

## Response

### Success Response

**Status:** `201 Created`

The response includes an `X-Total-Count` header with the total number of policy schemas.

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Carbon Offset Schema",
    "entity": "VC",
    "status": "DRAFT",
    "version": "",
    "topicId": "0.0.4532001",
    "owner": "example_user"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | File is missing or invalid |
| `500 Internal Server Error` | Unexpected server failure |
