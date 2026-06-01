# deactivate otp

**POST** `/accounts/otp/status`

Deactivate 2FA.

## Responses

### `201: Created`

```
{
    description: Successful operation.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EmptyResponseDTO'
}
```

### `401: Unauthorized`

```
{
    description: Unauthorized.
}
```

### `403: Forbidden`

```
{
    description: Forbidden.
}
```

### `500: Internal Server Error`

```
{
    description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InternalServerErrorDTO'
}
```
