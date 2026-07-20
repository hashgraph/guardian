# Confirm OTP

Confirm OTP setup with an OTP token.

## Request body

| Field | Type   | Required |
| ----- | ------ | -------- |
| token | Number | true     |

## Responses

### 201: Created

```yaml
description: Successful operation.
content:
  application/json:
    schema:
      $ref: '#/components/schemas/OTPConfirmResponseDTO'
```

### 401: Unauthorized

```yaml
description: Unauthorized.
```

### 403: Forbidden

```yaml
description: Forbidden.
```

### 500: Internal Server Error

```yaml
description: Internal server error.
content:
  application/json:
    schema:
      $ref: '#/components/schemas/InternalServerErrorDTO'
```
