# Creation of a Schema

### SCHEMA CREATION

**Description:** Creates new schema. Only users with the Root Authority role are allowed to make the request.

`POST /schemas`

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
201:
          description: Successful operation.
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

****
