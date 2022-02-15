# Adding file to IPFS

### ADDING FILE TO IPFS

**Description:** Add file to ipfs.&#x20;

**Note:** **Only users with the Root Authority role are allowed to make the request.**

`POST /policies/import`

**Request body:**

```
description: Data array of file.
required: true
content:
          binary/octet-stream:
              schema:
                type: string
                format: binary
```

#### **Response body:**

```
      200:
          description: Successful operation.
          content:
            application/json:
              schema:
                description: CID of added file.
                type: string
        401:
          description: Unauthorized.
        500:
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
```
