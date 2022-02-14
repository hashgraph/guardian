# User Session

### DISPLAY CURRENT USER SESSION

**Description:** Returns current session of the user

GET  /accounts/session

**Response body:**

```
   200:
          description: Successful operation.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Session'
   401:
          description: Unauthorized.
   500:
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
```

****
