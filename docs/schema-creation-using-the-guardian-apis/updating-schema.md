# Updating Schema

### UPDATING SCHEMA BASED ON SCHEMA ID

**Description:** Updates the schema with the provided schema ID.&#x20;

Only users with the Root Authority role are allowed to make the request.

PUT schemas/{schemaId}

**Request body:**

```
description: Object that contains a valid schema.
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/Schema"
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
