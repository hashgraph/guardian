# confirm otp

Confirm OTP setup by OTP token.

## Request body

| Field | Type   | Required |
| ----- | ------ | -------- |
| token | Number | true     |

## Responses

### 201: Created

```javascript
{
    description: Successful operation.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OTPConfirmResponseDTO'
}
```

### 401: Unauthorized

```javascript
{
    description: Unauthorized.
}
```

### 403: Forbidden

```javascript
{
    description: Forbidden.
}
```

### 500: Internal Server Error

```javascript
{
    description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InternalServerErrorDTO'
}
```
