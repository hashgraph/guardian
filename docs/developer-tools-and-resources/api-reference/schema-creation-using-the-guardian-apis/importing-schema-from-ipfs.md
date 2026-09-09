# Importing Schema from IPFS

**`POST /schemas/{topicId}/import/message`**

Imports a new schema from IPFS into the local database for the specified topic.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `topicId` | string | Yes | The Hedera topic ID to import the schema under (e.g. `0.0.4532001`) |

### Request Body

```json
{
  "messageId": "1680000000.000000001"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messageId` | string | Yes | The Hedera message ID containing the IPFS CID of the schema |

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
    "status": "PUBLISHED",
    "version": "1.0.0",
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
| `422 Unprocessable Entity` | Message ID is missing or invalid |
| `500 Internal Server Error` | Unexpected server failure |
