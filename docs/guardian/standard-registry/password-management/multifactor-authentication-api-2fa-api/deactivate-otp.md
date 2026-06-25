# Deactivate OTP

**POST** `/accounts/otp/status`

Deactivate 2FA.

## Responses

### `201: Created`

```yaml
description: Successful operation.
content:
  application/json:
    schema:
      $ref: '#/components/schemas/EmptyResponseDTO'
```

### `401: Unauthorized`

```yaml
description: Unauthorized.
```

### `403: Forbidden`

```yaml
description: Forbidden.
```

### `500: Internal Server Error`

```yaml
description: Internal server error.
content:
  application/json:
    schema:
      $ref: '#/components/schemas/InternalServerErrorDTO'
```
