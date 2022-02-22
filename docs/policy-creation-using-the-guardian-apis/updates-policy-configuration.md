# Updates Policy Configuration

### UPDATES **POLICY CONFIGURATION**

**Description:** Updates policy configuration for the specified policy ID.&#x20;

Only users with the Root Authority role are allowed to make the request.

`PUT` /policies/{policyId}

**Request body:**

```
description: Object that contains policy configuration.
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/PolicyConfig"
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
