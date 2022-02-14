# User Login

### LOGS USER INTO THE SYSTEM

**Description:** Logs user into the system

POST /accounts/login

**Request body:**

```
    description: Object that contains username and password fields.
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/Credentials"
```

#### Response body:

```
   200:
          description: Successful operation.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Session'
        500:
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
```
