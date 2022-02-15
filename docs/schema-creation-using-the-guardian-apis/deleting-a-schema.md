# Deleting a schema

### DELETING SCHEMA BASED ON SCHEMA ID

**Description:** Deletes the schema with the provided schema ID.&#x20;

Only users with the Root Authority role are allowed to make the request.

DELETE schemas/{schemaId}

**Request body:**

```
        - in: path
          name: schemaId
          schema:
            type: string
          required: true
          description: Schema ID.
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
