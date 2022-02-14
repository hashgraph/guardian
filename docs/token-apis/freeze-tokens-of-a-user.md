# Freeze Tokens of a user

### FREEZE TRANSFER OF TOKENS OF A USER

**Description:** Freezes transfers of the specified token for the user.&#x20;

Only users with the Root Authority role are allowed to make the request.

PUT  /tokens/{tokenId}/{username}/freeze

**Request body:**

```
 parameters:
        - in: path
          name: tokenId
          schema:
            type: string
          required: true
          description: Token ID.
        - in: path
          name: username
          schema:
            type: string
          required: true
          description: Username.
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
                $ref: '#/components/schemas/TokenInfo'
400:
          description: Bad Request.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
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
