# Generate OTP

Generate an OTP secret for 2FA setup.

**Method:** `POST`\
**Path:** `/accounts/otp/status`

## Responses

### `201: Created`

```yaml
description: Successful operation.
content:
  application/json:
    schema:
      $ref: '#/components/schemas/GenerateOPTResponseDTO'
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
