# Authentication Process

## **Authentication Process**

### **Login**

{% swagger method="post" path="" baseUrl="/api/v1/accounts/login" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="username" type="String" required="true" %}
StandardRegistry
{% endswagger-parameter %}

{% swagger-parameter in="body" name="password" type="String" required="true" %}
test
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
"username": "StandardRegistry",
    "did": "did:hedera:testnet:5jDN1zBJPjjQhRDZ4MV3q5CFUVM99WvfJ3zMLLhLS2yk_0.0.7495695",
    "role": "STANDARD_REGISTRY",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....."
```
{% endswagger-response %}
{% endswagger %}

### Access Token

{% swagger method="post" path="" baseUrl="/api/v1/accounts/access-token" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="refreshToken" type="String" required="true" %}
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.......
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
{
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9......
}
```
{% endswagger-response %}
{% endswagger %}

### Account Session

{% swagger method="get" path="" baseUrl="/api/v1/accounts/session" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="header" name="Authorization Bearer" %}
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9......
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
 "_id": "659e8127db770133c0d8fb26",
    "createDate": "2024-01-10T11:36:07.320Z",
    "updateDate": "2024-01-23T13:53:36.347Z",
    "username": "StandardRegistry",
    "password": "9f86d081884c7d659.....",
    "did": "did:hedera:testnet:5jDN1zBJPjjQhRDZ4MV3q5CFUVM99.....",
    "walletToken": "",
    "hederaAccountId": "0.0.749...",
    "role": "STANDARD_REGISTRY",
    "refreshToken": "a0dbe6f.....",
    "id": "659e8127db770133c..."
```
{% endswagger-response %}
{% endswagger %}
