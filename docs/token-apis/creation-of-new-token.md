# Creation of new token

### CREATION OF A TOKEN

**Description:** Creates a new token. Only users with the Root Authority role are allowed to make the request.

POST  /tokens

**Request body:**

```
  description: Object that contains token information.
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/Token"
```

#### Response body:

```
201:
          description: Successful operation.
          content:
            application/json:
              schema:
                type: array
                items:
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
