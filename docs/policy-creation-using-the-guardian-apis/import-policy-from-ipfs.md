# Import Policy from IPFS

### IMPORT OF NEW POLICY&#x20;

**Description:** Imports new policy and all associated artifacts from IPFS into the local DB

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

**Description:** Imports new policy and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB.

#### **Request body:**

```
description: A zip file that contains the policy and associated schemas and VCs to be imported.
required: true
```

#### **Response body:**

```
201:
          description: Successful operation.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/PolicyConfig'
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
