# Sends Data to Specified Block by Tag

**`POST /policies/{policyId}/tag/{tagName}/blocks`**

Sends data to the block identified by tag name within the specified policy.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_EXECUTE` or `Permissions.POLICIES_POLICY_MANAGE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `policyId` | string | Yes | The policy ID (MongoDB ObjectId, e.g. `63e3e5e8a01b3c001234abcd`) |
| `tagName` | string | Yes | The block tag name (e.g. `submit_application`) |

### Request Body

```json
{
  "document": {},
  "ref": null
}
```

The request body is a JSON object containing the data to submit to the block (exact schema depends on the block type).

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "blockType": "requestVcDocumentBlock",
  "data": {}
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Policy or block with given tag not found |
| `422 Unprocessable Entity` | Invalid or rejected block data |
| `500 Internal Server Error` | Unexpected server failure |
