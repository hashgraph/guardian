# User Account Balance

### RETURNS USER'S ACCOUNT BALANCE

**Description:** Requests Hedera's account balance. Only users with the Installer role are allowed to make the request.

GET  /profiles/{username}/balance

**Request body:**

```
   parameters:
        - in: path
          name: username
          schema:
            type: string
          required: true
          description: The name of the user for whom to fetch the balance.
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
                type: string
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
