# Import schema from IPFS

### IMPORTING SCHEMA FROM IPFS FILE

**Description:** Imports new schema from a zip file into the local DB.

Only users with the Root Authority role are allowed to make the request.

POST /schemas/import/file

**Request body:**

```
description: A zip file containing schema to be imported.
        required: true
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

**Description:** Previews the schema from a zip file.&#x20;

Only users with the Root Authority role are allowed to make the request.

POST /schemas/import/message/preview:

**Request body:**

```
   description: Object that contains the identifier of the Hedera message which contains the IPFS CID of the schema.
        required: true
        content:
          application/json:
            schema:
              type: array
                items:
                  $ref: '#/components/schemas/Schema'
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
