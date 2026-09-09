# Publishing Schema Based on Schema ID

**`PUT /api/v1/schemas/{schemaId}/publish`**

Publishes the schema with the specified internal ID onto IPFS and sends a message containing the IPFS CID to the corresponding Hedera topic. Only users with the Standard Registry role are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_REVIEW`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaId` | string | Yes | The internal database ID of the schema to publish |

### Request Body

```json
{
  "version": "1.0.0"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | Yes | The version string to assign to this published schema (e.g. `1.0.0`) |

---

## Response

### Success Response

**Status:** `200 OK`

The response includes an `X-Total-Count` header with the total number of policy schemas.

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Carbon Offset Schema",
    "status": "PUBLISHED",
    "version": "1.0.0",
    "topicId": "0.0.1234567",
    "messageId": "1234567890.000000001",
    "owner": "example_user"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions or schema is owned by another user |
| `404 Not Found` | Schema with the provided ID does not exist |
| `422 Unprocessable Entity` | Schema is already published, in demo mode, or version already exists |
| `500 Internal Server Error` | Unexpected server failure |
