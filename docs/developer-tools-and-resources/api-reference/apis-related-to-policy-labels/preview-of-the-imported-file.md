# Preview of the Imported File

**`POST /api/v1/policy-labels/import/file/preview`**

Returns a preview of the policy label definition contained in a zip file without importing it.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_LABEL_CREATE`

---

## Request

### Request Body

Binary zip file to preview.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| *(binary)* | file | Yes | A `.zip` file exported from a Guardian instance |

> Set `Content-Type: application/zip` when uploading the file.

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "Carbon Credit Label",
  "description": "Certification label for verified carbon credits",
  "policyId": "63e3e5e8a01b3c001234abcd",
  "status": "DRAFT",
  "config": {}
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `400 Bad Request` | Malformed or unreadable zip file |
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
