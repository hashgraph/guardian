# Publish a Policy

### PUBLISH POLICY USING SPECIFIED POLICY ID

**Description**: Publishes the policy with the specified (internal) policy ID onto IPFS, sends a message featuring its IPFS CID into the corresponding Hedera topic. Only users with the Root Authority role are allowed to make the request.

`PUT` /policies/{policyId}/publish

**Request body:**

```
description: Object that contains policy version.
        required: true
        content:
          application/json:
              schema:
                type: object
                properties:
                  policyVersion:
                    type: string
      summary: Publishes the policy onto IPFS.
      security:
      - bearerAuth: []
```

#### Response body:

```
200:
          description: Successful operation.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PublishPolicy'
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
