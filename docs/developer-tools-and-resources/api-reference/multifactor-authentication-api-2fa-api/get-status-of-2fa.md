# Get status of MFA

**GET** `/accounts/otp/status`

Get the current user's OTP status.

## Responses

### 200: OK

Successful operation.

```yaml
description: Successful operation.
content:
  application/json:
    schema:
      $ref: '#/components/schemas/OTPStatusResponseDTO'
```

### 401: Unauthorized

Unauthorized.

```yaml
description: Unauthorized.
```

### 403: Forbidden

Forbidden.

```yaml
description: Forbidden.
```

### 500: Internal Server Error

Internal server error.

```yaml
description: Internal server error.
content:
  application/json:
    schema:
      $ref: '#/components/schemas/InternalServerErrorDTO'
```
