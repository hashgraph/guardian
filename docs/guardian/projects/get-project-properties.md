# Get Project Properties

**`GET /projects/properties`**

Returns all available project properties.

---

## Request

No request parameters.

---

## Response

### Success Response

**Status:** `202 Accepted`

Returns an array of property objects.

```json
[
  {
    "id": "f3b2a9c1e4d5678901234567",
    "title": "string",
    "value": "string"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `500 Internal Server Error` | Unexpected server failure |
