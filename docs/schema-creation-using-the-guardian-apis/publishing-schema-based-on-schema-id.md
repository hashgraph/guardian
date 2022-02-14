# Publishing Schema based on Schema ID

### PUBLISHING SCHEMA BASED ON SCHEMA ID

**Description:** Returns all schemas.

`PUT` /schemas/{schemaId}/publish

**Request body:**

```
description: Object that contains policy version.
        required: true
        content:
          application/json:
              schema:
                type: object
                properties:
                  version:
                    type: string
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
