# Building and returning

### BUILDING AND RETURNING A TRUSTCHAIN

**Description:** Builds and returns a trustchain, from the VP to the root VC document.&#x20;

Only users with the Auditor role are allowed to make the request.

GET /trustchains/{hash}

**Request body:**

```
 - in: path
          name: hash
          schema:
            type: string
          required: true
          description: Hash or ID of a VP document.
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
                $ref: '#/components/schemas/TrustChains'
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
