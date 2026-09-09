# Retrieves All Properties

**`GET /api/v1/projects/properties`**

Returns a list of all properties available across project documents. This endpoint does not require authentication.

---

## Response

### Success Response

**Status:** `200 OK`

```json
[
  {
    "name": "projectName",
    "label": "Project Name",
    "required": true,
    "type": "string"
  }
]
```

| Field      | Type    | Description                                |
|------------|---------|--------------------------------------------|
| `name`     | string  | Property field name                        |
| `label`    | string  | Human-readable label for the property      |
| `required` | boolean | Whether the property is required           |
| `type`     | string  | Data type of the property                  |

### Error Responses

| Status | Description |
|--------|-------------|
| `500 Internal Server Error` | Unexpected server failure |
