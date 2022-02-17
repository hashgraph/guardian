# Policy Listing

### **POLICY LISTING**

**Description:** Returns all policies.&#x20;

Only users with the Root Authority and Installer role are allowed to make the request.

`GET /policies`

**Request body:**

```
security:
        - bearerAuth: []
```

**Response body:**

```
200:
          description: Successful operation.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/PolicyConfig'
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
