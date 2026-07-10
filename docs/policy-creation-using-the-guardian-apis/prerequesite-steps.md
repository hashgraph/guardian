# Prerequisite Steps

Before calling any Policy API endpoint, complete the following setup steps.

---

## 1. Register a Standard Registry Account

**`POST /api/v1/accounts/register`**

```json
{
  "username": "example_user",
  "password": "examplePassword123",
  "role": "STANDARD_REGISTRY"
}
```

**Response `201 Created`:**

```json
{
  "username": "example_user",
  "role": "STANDARD_REGISTRY"
}
```

---

## 2. Obtain a Bearer Token

**`POST /api/v1/accounts/login`**

```json
{
  "username": "example_user",
  "password": "examplePassword123"
}
```

**Response `200 OK`:**

```json
{
  "username": "example_user",
  "did": null,
  "role": "STANDARD_REGISTRY",
  "accessToken": "<token>"
}
```

Use the `accessToken` value as the Bearer token in the `Authorization` header for all subsequent requests:

```
Authorization: Bearer <accessToken>
```

---

## 3. Create a Hedera Account (Demo)

**`GET /api/v1/demo/random-key`**

```json
{
  "id": "0.0.4532001",
  "key": "302e020100300506032b657004220420..."
}
```

---

## 4. Set Up the Standard Registry Profile

**`PUT /api/v1/profile`**

```json
{
  "hederaAccountId": "0.0.4532001",
  "hederaAccountKey": "302e020100300506032b657004220420...",
  "name": "My Registry",
  "type": "StandardRegistry"
}
```

---

## 5. Create and Publish a Schema

Create a schema via **`POST /api/v1/schemas`** with the schema document, then publish it via **`PUT /api/v1/schemas/{schemaId}/publish`** with body `{ "version": "1.0.0" }`.

---

## 6. Create a Token

**`POST /api/v1/tokens`**

```json
{
  "tokenName": "Example Token",
  "tokenSymbol": "EXT",
  "tokenType": "fungible",
  "decimals": "2",
  "initialSupply": "0",
  "enableAdmin": true,
  "changeSupply": true,
  "enableFreeze": true,
  "enableKYC": true,
  "enableWipe": true
}
```

**Response `201 Created`:**

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "tokenId": "0.0.5000001"
}
```

---

## Base URL

All policy endpoints are relative to:

```
/api/v1/policies
```

## Pagination

Endpoints that return lists support standard pagination query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `pageIndex` | number | 0 | Zero-based page index |
| `pageSize` | number | 20 | Number of items per page |

The total item count is returned in the `X-Total-Count` response header.
