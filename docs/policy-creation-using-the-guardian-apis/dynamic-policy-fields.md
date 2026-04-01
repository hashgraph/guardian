# Dynamic Policy Fields

Guardian policies use user-authored schemas to define the exact fields that appear in API payloads. Unlike fixed APIs, the document fields vary per policy because each Standard Registry designs their own data model. This guide explains how to discover and correctly populate these dynamic fields.

---

## Why Fields Are Dynamic

When a Standard Registry creates a policy, they define **schemas** — JSON Schema definitions specifying what data participants must submit. The same API endpoint (`PUT /policies/{policyId}/blocks/{blockId}`) is used regardless of which policy is being interacted with, but the fields inside `credentialSubject` change based on the policy's schema.

For example:
- An iREC policy might require `facilityName`, `country`, `installedCapacity`
- A GHG protocol policy might require `emissionSource`, `activityData`, `emissionFactor`

Both use the same endpoint but completely different payload fields.

---

## The `field0`, `field1` Naming Convention

Guardian schemas internally use sequential key names: `field0`, `field1`, `field2`, etc. The human-readable name is stored in the schema property's `title` attribute. This indirection allows schema field order and identity to remain stable even if titles are updated.

**Example schema properties:**
```json
{
  "field0": { "title": "Organization Name", "type": "string" },
  "field1": { "title": "Country", "type": "string" },
  "field2": { "title": "Facility Name", "type": "string" },
  "field3": { "title": "Installed Capacity (MW)", "type": "number" },
  "field4": { "title": "Fuel Type", "type": "string", "enum": ["Solar", "Wind", "Hydro"] }
}
```

When submitting data, always use `field0`, `field1`, etc. as the JSON keys — **not** the title strings.

---

## Step-by-Step: Discovering Schema Fields

### 1. Get the Block's Schema

Call `GET /api/v1/policies/{policyId}/blocks/{blockId}` and look at the `schema` object in the response:

```http
GET /api/v1/policies/63e3e5e8a01b3c001234abcd/blocks/form-block-uuid
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

```json
{
  "id": "form-block-uuid",
  "blockType": "requestVcDocumentBlock",
  "schema": {
    "$id": "#irec-installer-v2",
    "title": "Installer Application",
    "type": "object",
    "properties": {
      "field0": { "title": "Organization Name", "type": "string" },
      "field1": { "title": "Country", "type": "string" },
      "field2": { "title": "Facility Name", "type": "string" },
      "field3": { "title": "Installed Capacity (MW)", "type": "number" },
      "field4": {
        "title": "Fuel Type",
        "type": "string",
        "enum": ["Solar", "Wind", "Hydro", "Geothermal"]
      }
    },
    "required": ["field0", "field1", "field2"]
  }
}
```

### 2. Build a Title-to-Key Map

```javascript
// JavaScript
function buildFieldMap(schema) {
  const fieldMap = {};
  for (const [key, def] of Object.entries(schema.properties)) {
    fieldMap[def.title] = key;  // { "Organization Name": "field0", ... }
  }
  return fieldMap;
}

const fieldMap = buildFieldMap(schema);
// fieldMap["Installed Capacity (MW)"] === "field3"
```

```python
# Python
def build_field_map(schema):
    return {
        definition["title"]: key
        for key, definition in schema["properties"].items()
    }

field_map = build_field_map(schema)
# field_map["Fuel Type"] == "field4"
```

### 3. Construct the Payload

```javascript
const payload = {
  document: {
    credentialSubject: [
      {
        type: schema["$id"],
        [fieldMap["Organization Name"]]:  "Acme Energy Corp",
        [fieldMap["Country"]]:            "Kenya",
        [fieldMap["Facility Name"]]:      "Nairobi Solar Farm 1",
        [fieldMap["Installed Capacity (MW)"]]: 10.5,
        [fieldMap["Fuel Type"]]:          "Solar"
      }
    ]
  }
};
```

Which produces:
```json
{
  "document": {
    "credentialSubject": [
      {
        "type": "#irec-installer-v2",
        "field0": "Acme Energy Corp",
        "field1": "Kenya",
        "field2": "Nairobi Solar Farm 1",
        "field3": 10.5,
        "field4": "Solar"
      }
    ]
  }
}
```

---

## Field Types

| JSON Schema `type` | Expected JS/Python value | Notes |
|---|---|---|
| `string` | `"some text"` | |
| `number` | `1250.5` | Decimal allowed |
| `integer` | `1250` | No decimal |
| `boolean` | `true` / `false` | |
| `array` | `["item1", "item2"]` | Check `items` for element type |
| `object` | `{ "subField": "value" }` | Check `properties` for nested keys |

---

## Enum Fields

When a field has an `enum` array, only the listed values are accepted:

```json
"field4": {
  "title": "Fuel Type",
  "type": "string",
  "enum": ["Solar", "Wind", "Hydro", "Geothermal"]
}
```

**Valid submission:**
```json
{ "field4": "Solar" }
```

**Invalid submission** (will fail schema validation):
```json
{ "field4": "Nuclear" }
```

To enumerate valid options programmatically:
```javascript
const fuelTypeOptions = schema.properties["field4"].enum;
// ["Solar", "Wind", "Hydro", "Geothermal"]
```

---

## Required vs Optional Fields

The schema `required` array lists field keys that must be present. Missing required fields will cause a `422 Unprocessable Entity` response:

```json
{
  "required": ["field0", "field1", "field2"]
}
```

Fields not in `required` are optional. Include them when you have data; omit them when you don't.

---

## Nested Object Fields

Some schemas contain nested objects for grouped data:

```json
"field5": {
  "title": "Location",
  "type": "object",
  "properties": {
    "field5_0": { "title": "Latitude", "type": "number" },
    "field5_1": { "title": "Longitude", "type": "number" }
  }
}
```

Submission:
```json
{
  "field5": {
    "field5_0": -1.2921,
    "field5_1": 36.8219
  }
}
```

The nested key pattern follows the same `field{N}` convention, prefixed with the parent field key.

---

## Array Fields

Array fields contain multiple values of the same type:

```json
"field6": {
  "title": "Energy Sources",
  "type": "array",
  "items": { "type": "string", "enum": ["Solar", "Wind"] }
}
```

Submission:
```json
{
  "field6": ["Solar", "Wind"]
}
```

---

## Discovering All Schemas for a Policy

To get all schemas a policy uses (useful for building a complete field reference):

```http
GET /api/v1/policies/{policyId}/schemas
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

Or get an individual schema:
```http
GET /api/v1/schemas/{schemaId}
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

---

## Real-World Example: iREC MRV Submission

An iREC policy MRV schema might define:

```json
{
  "$id": "#irec-mrv-v1",
  "properties": {
    "field0": { "title": "Meter Reading Start (MWh)", "type": "number" },
    "field1": { "title": "Meter Reading End (MWh)", "type": "number" },
    "field2": { "title": "Reporting Period Start", "type": "string", "format": "date" },
    "field3": { "title": "Reporting Period End", "type": "string", "format": "date" },
    "field4": { "title": "Unit", "type": "string", "enum": ["MWh", "kWh"] },
    "field5": { "title": "Metering Authority", "type": "string" }
  },
  "required": ["field0", "field1", "field2", "field3", "field4"]
}
```

Complete PUT submission:
```json
{
  "document": {
    "credentialSubject": [
      {
        "type": "#irec-mrv-v1",
        "field0": 0.0,
        "field1": 1250.5,
        "field2": "2025-01-01",
        "field3": "2025-12-31",
        "field4": "MWh",
        "field5": "Kenya Power and Lighting"
      }
    ]
  },
  "ref": "installer-registration-doc-id"
}
```

The `ref` field links this MRV document to the installer's registration document, establishing the trust chain.

---

## Error Handling for Dynamic Field Errors

When a field submission fails validation, Guardian returns `422 Unprocessable Entity`:

```json
{
  "statusCode": 422,
  "message": "Document validation failed",
  "details": [
    "field0: Expected number, got string",
    "field4: Value 'Nuclear' is not in enum [Solar, Wind, Hydro, Geothermal]",
    "field2: Required field missing"
  ]
}
```

Always validate field types and enum constraints client-side before submitting.
