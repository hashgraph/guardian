# Setting User Credentials

### SETS HEDERA CREDENTIALS

**Description:** Sets Hedera credentials for the user. For users with the Root Authority role it also creates an address book.

**Request body:**

```
     description: Object that contains the Hedera account data.
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/User"
```

#### Response body:

```
   201:
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
