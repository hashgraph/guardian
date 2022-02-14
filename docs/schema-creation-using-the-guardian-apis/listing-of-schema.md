# Listing of Schema

### SCHEMA LISTING

**Description:** Returns all schemas.

`GET /schemas`

**Request body:**

```
description: Returns all schemas.
      security:
      - bearerAuth: []
```

**Response body:**

```
200:
          description: Successful operation.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Schema'
401:
          description: Unauthorized.
403:
          description: Forbidden.
500:
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
```
