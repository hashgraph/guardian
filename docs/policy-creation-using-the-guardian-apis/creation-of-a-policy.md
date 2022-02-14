# Creation of a Policy

### **POLICY CREATION**

**Description:** Creates a new policy.&#x20;

Only users with the Root Authority role are allowed to make the request.

`POST /policies`

**Request body:**

```
description: Object that contains policy configuration.
required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/PolicyConfig"
```

**Response body:**

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
