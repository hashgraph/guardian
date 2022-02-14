# Import schema from IPFS

### IMPORTING SCHEMA FROM IPFS FILE

**Description:** Imports new schema from IPFS into the local DB.&#x20;

Only users with the Root Authority role are allowed to make the request.

POST /schemas/import

**Request body:**

```
description: Object that contains the identifier of the Hedera message which contains the IPFS CID of the schema.
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                messageId:
                  type: string
```

**Response body:**

```
201:
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

### IMPORT PREVIEW

**Description:** Previews the schema from IPFS without loading it into the local DB. Only users with the Root Authority role are allowed to make the request.



**Request body:**

```
   description: Object that contains the identifier of the Hedera message which contains the IPFS CID of the schema.
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                messageId:
                  type: string
```

**Response body:**

```
200:
          description: Successful operation.
          content:
            application/json:
              schema:
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
