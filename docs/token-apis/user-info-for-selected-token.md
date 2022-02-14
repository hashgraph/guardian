# User Info for selected token

### DISPLAYS USER INFORMATION FOR SELECTED TOKEN

**Description:** Returns user information for the selected token.&#x20;

Only users with the Root Authority role are allowed to make the request.

GET  /tokens/{tokenId}/{username}/info

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
