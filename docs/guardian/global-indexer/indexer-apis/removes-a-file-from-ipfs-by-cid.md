# Removes a file from IPFS by CID

Removes a file from IPFS by CID

<mark style="color:red;">`DELETE`</mark> `/ipfs/file/{cid}`

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name | Type   | Description |
| ---- | ------ | ----------- |
| cid  | string | CID         |

**Response**

{% tabs %}
{% tab title="401" %}
```json5
description: Unauthorized.
```
{% endtab %}

{% tab title="403" %}
```json5
description: Forbidden.
```
{% endtab %}
{% endtabs %}
