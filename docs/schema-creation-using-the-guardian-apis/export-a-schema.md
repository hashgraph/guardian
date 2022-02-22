# Export a schema

### IMPORTING SCHEMA FROM IPFS FILE

**Description:** Returns Hedera message IDs of the published schemas, these messages contain IPFS CIDs of schema files.&#x20;

Only users with the Root Authority role are allowed to make the request.

POST /schemas/export

**Request body:**

```
description: Object that contains IDs of schemas.
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                ids:
                  type: array
                  items:
                    type: string
```

**Response body:**

```
200:
          description: Successful operation.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ExportSchema"
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
