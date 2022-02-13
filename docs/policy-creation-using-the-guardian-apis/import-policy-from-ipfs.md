# Import Policy from IPFS

### IMPORT OF NEW POLICY&#x20;

**Description:** Imports new policy from IPFS into the local DB.&#x20;

**Note:** **Only users with the Root Authority role are allowed to make the request.**

`POST /policies/import`

**Request body:**

```
description: Object that contains the identifier of the Hedera message which contains the IPFS CID of the Policy.
required: true
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
                  $ref: '#/components/schemas/PolicyConfig'
```

### Imported policy preview

`/schemas/import/preview`

**Description:** Previews the policy from IPFS without loading it into the local DB

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

#### **Response body:**

```
      200:
          description: Successful operation.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PreviewPolicy'
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
