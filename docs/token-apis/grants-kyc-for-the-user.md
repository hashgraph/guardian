# Grants KYC for the user

### GRANTS KYC FLAG FOR THE USER

**Description:** Sets the KYC flag for the user.&#x20;

Only users with the Root Authority role are allowed to make the request.

PUT  /tokens/{tokenId}/{username}/grantKyc

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
