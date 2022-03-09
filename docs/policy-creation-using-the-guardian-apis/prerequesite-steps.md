# Prerequesite Steps

Prior to creating a policy there are a few steps that need to be done first. Please see below for the prerequesite steps:

### **New Root Authority registration**

{% swagger method="post" path="" baseUrl="/api/v1/accounts/register" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="username" type="String" required="true" %}
njkqur8x
{% endswagger-parameter %}

{% swagger-parameter in="body" name="password" type="String" required="true" %}
test
{% endswagger-parameter %}

{% swagger-parameter in="body" name="role" type="String" required="true" %}
ROOT_AUTHORITY
{% endswagger-parameter %}
{% endswagger %}

### **Login**

{% swagger method="post" path="" baseUrl="/api/v1/accounts/login" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="username" type="String" required="true" %}
njkgur8x
{% endswagger-parameter %}

{% swagger-parameter in="body" name="password" type="String" required="true" %}
test
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    {
	"username":"njkgur8x",
	"did":null,
	"role":"ROOT_AUTHORITY",
	"accessToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im5qa2d1cjh4IiwiZGlkIjpudWxsLCJyb2xlIjoiUk9PVF9BVVRIT1JJVFkiLCJpYXQiOjE2NDMwMTkxMDh9.Z4l77uhaPu09gkjSZpqcF2H0S27oGvFfOA-bytzrsL4"
}
}
```
{% endswagger-response %}
{% endswagger %}

### **Hedera account creation**

{% swagger method="get" path="" baseUrl="/api/v1/demo/randomKey" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="" %}
```javascript
{
    
	"id":"0.0.29511776",
	"key":"302e020100300506032b6570042204200c8d2abbdd9aee64eed6e4891c276aa50248ab182c0cd7dfbec8506e5eaaaef8"

}
```
{% endswagger-response %}
{% endswagger %}

### **Address book creation**

{% swagger method="put" path="" baseUrl="/api/v1/profile" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="hederaAccountId" required="true" %}
0.0.29511776
{% endswagger-parameter %}

{% swagger-parameter in="body" name="hederaAccountKey" required="true" %}
302e020100300506032b6570042204200c8d2abbdd9aee64eed6e4891c276aa50248ab182c0cd7dfbec8506e5eaaaef8
{% endswagger-parameter %}

{% swagger-parameter in="body" name="name" type="String" required="true" %}
DD
{% endswagger-parameter %}

{% swagger-parameter in="body" name="type" type="String" required="true" %}
RootAuthority
{% endswagger-parameter %}

{% swagger-parameter in="body" name="context" type="String" required="true" %}


[https://localhost/schema](https://localhost/schema)


{% endswagger-parameter %}

{% swagger-parameter in="body" name="aopnetname" type="String" required="true" %}
Test Identity SDK appnet
{% endswagger-parameter %}

{% swagger-parameter in="body" name="didSrverURL" required="true" type="URL" %}


[http://localhost:3000/api/v1](http://localhost:3000/api/v1)


{% endswagger-parameter %}

{% swagger-parameter in="body" name="didTopicMemo" required="true" %}
Test Identity SDK appnet DID topic
{% endswagger-parameter %}

{% swagger-parameter in="body" name="vcTopicMemo" required="true" %}
Test Identity SDK appnet DID topic
{% endswagger-parameter %}
{% endswagger %}

### **iRec schema creation**

{% swagger method="post" path="" baseUrl="/api/v1/schemas" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="uuid" required="true" %}
d018a6ce-71f0-4bc5-9380-6bae4d4bb5bb
{% endswagger-parameter %}

{% swagger-parameter in="body" name="status" required="true" %}
DRAFT
{% endswagger-parameter %}

{% swagger-parameter in="body" name="readonly" required="true" %}
False
{% endswagger-parameter %}

{% swagger-parameter in="body" name="name" type="String" required="true" %}
iRec
{% endswagger-parameter %}

{% swagger-parameter in="body" name="description" type="String" required="true" %}
iRec Application Form
{% endswagger-parameter %}

{% swagger-parameter in="body" name="entity" type="String" required="true" %}
VC
{% endswagger-parameter %}

{% swagger-parameter in="body" name="owner" type="String" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="version" type="String" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="document" required="true" %}
{"$id":"#d018a6ce-71f0-4bc5-9380-6bae4d4bb5bb","$comment":"{ \\"term\\": \\"d018a6ce-71f0-4bc5-9380-6bae4d4bb5bb\\", \\"@id\\": \\"https://localhost/schema#d018a6ce-71f0-4bc5-9380-6bae4d4bb5bb\\" }","title":"iRec","description":"iRec application form","type":"object","properties":{"@context":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},"type":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},"id":{"type":"string","readOnly":true},"field0":{"title":"Test field","description":"Test field","readOnly":false,"$comment":"{ \\"term\\": \\"field0\\", \\"@id\\": \\"https://www.schema.org/text\\" }","type":"string"},"field1":{"title":"Required field","description":"Required field","readOnly":false,"$comment":"{ \\"term\\": \\"field1\\", \\"@id\\": \\"https://www.schema.org/text\\" }","type":"string"},"field2":{"title":"Multiple field","description":"Multiple field","readOnly":false,"type":"array","items":{"type":"string"},"$comment":"{ \\"term\\": \\"field2\\", \\"@id\\": \\"https://www.schema.org/text\\" }"},"policyId":{"title":"policyId","description":"policyId","readOnly":true,"$comment":"{ \\"term\\": \\"policyId\\", \\"@id\\": \\"https://www.schema.org/text\\" }","type":"string"}},"required":["@context","type","field1","policyId"],"additionalProperties":false}
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    ...
	{
		"id":"61ee7ecd9c02660014fa662e",
		...
	}
}
```
{% endswagger-response %}
{% endswagger %}

### **iRec schema publish**

{% swagger method="put" path="" baseUrl="/api/v1/schemas/61ee7ecd9c02660014fa662e/publish" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="version" required="true" %}
{"version":"1.0.0"}
{% endswagger-parameter %}
{% endswagger %}

### **Token creation**

{% swagger method="post" path="" baseUrl="/api/v1/tokens" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="tokenName" type="String" required="true" %}
iRec
{% endswagger-parameter %}

{% swagger-parameter in="body" name="tokenSymbol" type="String" required="true" %}
iRec
{% endswagger-parameter %}

{% swagger-parameter in="body" name="tokenType" type="String" required="true" %}
fungible
{% endswagger-parameter %}

{% swagger-parameter in="body" name="decimals" type="String" required="true" %}
2
{% endswagger-parameter %}

{% swagger-parameter in="body" name="initialsupply" type="String" required="true" %}
0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="enableAdmin" type="Boolean" %}
true
{% endswagger-parameter %}

{% swagger-parameter in="body" name="changeSupply" type="Boolean" %}
true
{% endswagger-parameter %}

{% swagger-parameter in="body" name="enableFreeze" type="Boolean" %}
true
{% endswagger-parameter %}

{% swagger-parameter in="body" name="enableKYC" type="Boolean" %}
true
{% endswagger-parameter %}

{% swagger-parameter in="body" name="enableWipe" type="Boolean" %}
true
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="" %}
```javascript
{
    
		"id":"61ee817b9c02660014fa662f",
		"tokenId":"0.0.29511821",
		...
	
}
```
{% endswagger-response %}
{% endswagger %}
