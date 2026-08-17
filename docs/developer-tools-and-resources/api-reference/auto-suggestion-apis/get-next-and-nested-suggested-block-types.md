# Get Next and Nested Suggested Block Types

**`POST /api/v1/suggestions`**

Returns the suggested next and nested block types based on the current policy configuration context. Only Standard Registry users are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SUGGESTIONS_SUGGESTIONS_READ`

---

## Request

### Request Body

```json
{
  "blockType": "requestVcDocumentBlock",
  "children": []
}
```

| Field       | Type   | Required | Description                                          |
|-------------|--------|----------|------------------------------------------------------|
| `blockType` | string | Yes      | The current block type to base suggestions on        |
| `children`  | array  | No       | Current children blocks for nested suggestions       |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "next": "sendToGuardianBlock",
  "nested": "calculateContainerBlock"
}
```

| Field    | Type   | Description                          |
|----------|--------|--------------------------------------|
| `next`   | string | Suggested next block type            |
| `nested` | string | Suggested nested block type          |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
