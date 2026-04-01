# Branding APIs

Base URL: `/api/v1/branding`

These endpoints allow Standard Registry administrators to customize the platform's visual appearance, including colors, logos, and legal text.

---

## POST /branding

Updates the platform branding configuration. Only Standard Registry users with the `BRANDING_CONFIG_UPDATE` permission can call this endpoint.

**Authentication:** Required — `BRANDING_CONFIG_UPDATE` permission

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| headerColor | string | No | Hex color code for the application header background (e.g., `#1a73e8`) |
| headerColor1 | string | No | Secondary header color / accent (e.g., `#ffffff`) |
| primaryColor | string | No | Hex color code for primary action buttons and highlights |
| companyName | string | No | Organization name displayed in the header and login page |
| companyLogoUrl | string | No | URL to the company logo image (displayed in header) |
| loginBannerUrl | string | No | URL to the banner image shown on the login page |
| faviconUrl | string | No | URL to the favicon image |
| termsAndConditions | string | No | HTML or plain-text content for the Terms & Conditions shown to users |

### Response 204 No Content

No response body on success.

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized — missing or invalid JWT |
| 403 | Forbidden — user lacks `BRANDING_CONFIG_UPDATE` permission |
| 500 | Internal server error |

### Example

**Request:**
```http
POST /api/v1/branding
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "headerColor": "#1a73e8",
  "headerColor1": "#ffffff",
  "primaryColor": "#34a853",
  "companyName": "Acme Carbon Registry",
  "companyLogoUrl": "https://cdn.acme.com/logo.png",
  "loginBannerUrl": "https://cdn.acme.com/banner.jpg",
  "faviconUrl": "https://cdn.acme.com/favicon.ico",
  "termsAndConditions": "<p>By using this platform you agree to our terms...</p>"
}
```

**Response 204:** (no body)

---

## GET /branding

Returns the current platform branding configuration. This endpoint is **public** — no authentication required.

**Authentication:** Not required

### Response 200 OK

Returns the current branding configuration object.

| Field | Type | Description |
|---|---|---|
| headerColor | string | Header background color |
| headerColor1 | string | Secondary header color |
| primaryColor | string | Primary action color |
| companyName | string | Organization name |
| companyLogoUrl | string | URL to company logo |
| loginBannerUrl | string | URL to login page banner |
| faviconUrl | string | URL to favicon |
| termsAndConditions | string | Terms and conditions content |

### Error Codes

| Code | Description |
|---|---|
| 500 | Internal server error |

### Example

**Request:**
```http
GET /api/v1/branding
```

**Response 200:**
```json
{
  "headerColor": "#1a73e8",
  "headerColor1": "#ffffff",
  "primaryColor": "#34a853",
  "companyName": "Acme Carbon Registry",
  "companyLogoUrl": "https://cdn.acme.com/logo.png",
  "loginBannerUrl": "https://cdn.acme.com/banner.jpg",
  "faviconUrl": "https://cdn.acme.com/favicon.ico",
  "termsAndConditions": "<p>By using this platform you agree to our terms...</p>"
}
```
