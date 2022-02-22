# User Account Information

### RETURNS USER'S ACCOUNT BALANCE

**Description:** Returns user account information.&#x20;

For users with the Root Authority role it also returns address book and VC document information.

GET  /profiles/{username}

**Request body:**

```
    - in: path
          name: username
          schema:
            type: string
          required: true
          description: The name of the user for whom to fetch the information.
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
                $ref: '#/components/schemas/User'
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
