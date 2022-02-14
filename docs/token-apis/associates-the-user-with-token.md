# Associates the user with token

### ASSOCIATES USER WITH TOKEN

**Description:** Returns user information for the selected token.&#x20;

Only users with the Root Authority role are allowed to make the request.

PUT  /tokens/{tokenId}/associate

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
