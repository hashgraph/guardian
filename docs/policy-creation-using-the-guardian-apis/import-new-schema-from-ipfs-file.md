# Import new schema from IPFS file

### IMPORT OF NEW SCHEMA&#x20;

**Schema import ()**

**Description:** Imports new schema from IPFS into the local DB.&#x20;

**Note:** Only users with the Root Authority role are allowed to make the request.

`POST /schemas/import`

**Request body:**

```
Content:
   application/json:
            schema:
              type: object
              properties:
                messageId:
                  type: string
```

#### **Response body:**

```
content:
      application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Schema'
```

### Imported schema preview

`/schemas/import/preview`

**Description:** Previews the schema from IPFS without loading it into the local DB

#### **Request body:**

```
content:
          application/json:
            schema:
              type: object
              properties:
                messageId:
                  type: string
```

#### **Request body:**

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
