# generate otp

Generate a OTP secret for 2FA setup.

**Method:** `POST`\
**Path:** `/accounts/otp/status`

## Responses

### `201: Created`

```javascript
{
    description: Successful operation.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GenerateOPTResponseDTO'
}
```

### `401: Unauthorized`

```javascript
{
    description: Unauthorized.
}
```

### `403: Forbidden`

```javascript
{
    description: Forbidden.
}
```

### `500: Internal Server Error`

```javascript
{
    description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InternalServerErrorDTO'
}
```
