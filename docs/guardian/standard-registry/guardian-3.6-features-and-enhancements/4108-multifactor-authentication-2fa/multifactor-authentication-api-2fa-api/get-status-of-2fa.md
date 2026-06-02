# get status of 2fa

`GET /accounts/otp/status`

Get OTP status for current user.

## Responses

### 200: OK

Successful Operation

```javascript
{
    description: Successful operation.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OTPStatusResponseDTO'
}
```

### 401: Unauthorized

Unauthorized

```javascript
{
    description: Unauthorized.
}
```

### 403: Forbidden

Forbidden

```javascript
{
    description: Forbidden.
}
```

### 500: Internal Server Error

Internal Server Error

```javascript
{
    description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InternalServerErrorDTO'
}
```
