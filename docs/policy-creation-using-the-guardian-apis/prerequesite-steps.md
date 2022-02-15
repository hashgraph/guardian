# Prerequesite Steps

Prior to creating a policy there are a few steps that need to be done first. Please see below for the prerequesite steps:

### **New Root Authority registration**

`POST /api/v1/accounts/register`

**Request body:**

```
{
	"username":"njkgur8x",
	"password":"test",
	"role":"ROOT_AUTHORITY"
}
```

### **Login**

`POST /api/v1/accounts/login`

**Request body:**

```
{
	"username":"njkgur8x",
	"password":"test"
}
```

**Response body:**

```
{
	"username":"njkgur8x",
	"did":null,
	"role":"ROOT_AUTHORITY",
	"accessToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im5qa2d1cjh4IiwiZGlkIjpudWxsLCJyb2xlIjoiUk9PVF9BVVRIT1JJVFkiLCJpYXQiOjE2NDMwMTkxMDh9.Z4l77uhaPu09gkjSZpqcF2H0S27oGvFfOA-bytzrsL4"
}
```

### **Hedera account creation**

`GET /api/v1/demo/randomKey`

**Response body:**

```
{
	"id":"0.0.29511776",
	"key":"302e020100300506032b6570042204200c8d2abbdd9aee64eed6e4891c276aa50248ab182c0cd7dfbec8506e5eaaaef8"
}
```

### **Address book creation**

`PUT /api/v1/profile`

**Request body:**

```
{
    "hederaAccountId":"0.0.29511776",
    "hederaAccountKey":"302e020100300506032b6570042204200c8d2abbdd9aee64eed6e4891c276aa50248ab182c0cd7dfbec8506e5eaaaef8",
    "vcDocument":{
        "name":"DD",
        "type":"RootAuthority",
        "@context":["https://localhost/schema"]
    },
    "addressBook":{
        "appnetName":"Test Identity SDK appnet",
        "didServerUrl":"http://localhost:3000/api/v1",
        "didTopicMemo":"Test Identity SDK appnet DID topic",
        "vcTopicMemo":"Test Identity SDK appnet VC topic"
    }
}
```

### **iRec schema creation**

`POST /api/v1/schemas`

**Request body:**

```
{
    "uuid":"d018a6ce-71f0-4bc5-9380-6bae4d4bb5bb",
    "status":"DRAFT",
    "readonly":false,
    "name":"iRec",
    "description":"iRec application form",
    "entity":"VC",
    "owner":"",
    "version":"",
    "document":"{\"$id\":\"#d018a6ce-71f0-4bc5-9380-6bae4d4bb5bb\",\"$comment\":\"{ \\\"term\\\": \\\"d018a6ce-71f0-4bc5-9380-6bae4d4bb5bb\\\", \\\"@id\\\": \\\"https://localhost/schema#d018a6ce-71f0-4bc5-9380-6bae4d4bb5bb\\\" }\",\"title\":\"iRec\",\"description\":\"iRec application form\",\"type\":\"object\",\"properties\":{\"@context\":{\"oneOf\":[{\"type\":\"string\"},{\"type\":\"array\",\"items\":{\"type\":\"string\"}}],\"readOnly\":true},\"type\":{\"oneOf\":[{\"type\":\"string\"},{\"type\":\"array\",\"items\":{\"type\":\"string\"}}],\"readOnly\":true},\"id\":{\"type\":\"string\",\"readOnly\":true},\"field0\":{\"title\":\"Test field\",\"description\":\"Test field\",\"readOnly\":false,\"$comment\":\"{ \\\"term\\\": \\\"field0\\\", \\\"@id\\\": \\\"https://www.schema.org/text\\\" }\",\"type\":\"string\"},\"field1\":{\"title\":\"Required field\",\"description\":\"Required field\",\"readOnly\":false,\"$comment\":\"{ \\\"term\\\": \\\"field1\\\", \\\"@id\\\": \\\"https://www.schema.org/text\\\" }\",\"type\":\"string\"},\"field2\":{\"title\":\"Multiple field\",\"description\":\"Multiple field\",\"readOnly\":false,\"type\":\"array\",\"items\":{\"type\":\"string\"},\"$comment\":\"{ \\\"term\\\": \\\"field2\\\", \\\"@id\\\": \\\"https://www.schema.org/text\\\" }\"},\"policyId\":{\"title\":\"policyId\",\"description\":\"policyId\",\"readOnly\":true,\"$comment\":\"{ \\\"term\\\": \\\"policyId\\\", \\\"@id\\\": \\\"https://www.schema.org/text\\\" }\",\"type\":\"string\"}},\"required\":[\"@context\",\"type\",\"field1\",\"policyId\"],\"additionalProperties\":false}",
}
```

**Response body:**

```
[
	...
	{
		"id":"61ee7ecd9c02660014fa662e",
		...
	}
]
```

### **iRec schema publish**

`PUT /api/v1/schemas/61ee7ecd9c02660014fa662e/publish`

**Request body:**

```
{"version":"1.0.0"}
```

### **Token creation**

`POST /api/v1/tokens`

**Request body:**

```
{
	"tokenName":"iRec",
	"tokenSymbol":"iRec",
	"tokenType":"fungible",
	"decimals":"2",
	"initialSupply":"0",
	"enableAdmin":true,
	"changeSupply":true,
	"enableFreeze":true,
	"enableKYC":true,
	"enableWipe":true
}
```

**Response body:**

```
[
	{
		"id":"61ee817b9c02660014fa662f",
		"tokenId":"0.0.29511821",
		...
	}
]
```
