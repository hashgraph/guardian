# Disassociates the user with token

### DISASSOCIATES USER WITH TOKEN

**Description:** Disassociates the user with the provided Hedera token.&#x20;

Only users with the Installer role are allowed to make the request.

PUT  /tokens/{tokenId}/disassociate

**Request body:**

```
  parameters:
        - in: path
          name: tokenId
          schema:
            type: string
          required: true
          description: Token ID.
      security:
      - bearerAuth: []
```

#### Response body:

```
200:
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
