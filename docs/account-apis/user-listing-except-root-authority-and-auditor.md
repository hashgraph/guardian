# User listing except Root Authority and Auditor

### DISPLAYING USERS&#x20;

**Description:** Returns all users except those with roles Root Authority and Auditor. Only users with the Root Authority role are allowed to make the request.

**Note:** **Only users with the Root Authority role are allowed to make the request.**

GET  /accounts

**Response body:**

```
responses:
        200:
          description: Successful operation.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Account'
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

****
