# Token Listing

### DISPLAYS ALL TOKENS

**Description:** Returns all tokens. For the Root Authority role it returns only the list of tokens, for other users it also returns token balances as well as the KYC, Freeze, and Association statuses. Not allowed for the Auditor role.

GET  /tokens

**Request body:**

```
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
                type: array
                items:
                  $ref: '#/components/schemas/TokenInfo'
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
