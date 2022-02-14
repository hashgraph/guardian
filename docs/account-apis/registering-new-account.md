# Registering new account

### REGISTERING NEW ACCOUNT

**Description:** Registers a new user account.

POST  /accounts/register

**Request body:**

```
   description: Object that contain username, password and role (optional) fields.
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/Credentials"
```

#### Response body:

```
   201:
          description: Successful operation.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Account'
   500:
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
```
