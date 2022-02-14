# Retrieves Policy Configuration

### **RETRIEVES POLICY CONFIGURATION**

**Description:** Retrieves policy configuration for the specified policy ID.&#x20;

Only users with the Root Authority role are allowed to make the request.

`GET` /policies/{policyId}

**Request body:**

```
- in: path
          name: policyId
          schema:
            type: string
          required: true
          description: Selected policy ID.
      summary: Retrieves policy configuration.
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
