# Demo Using APIs and UI

## 1. Login as a User

### 1.1 Get the list of policies.

## Displaying list of policies

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    [
			{
				id: "621376c8e6763a0014fb0de4",
				config:{
					id: "97379c43-2bce-4e67-9817-a79fbad3e53d",
					blockType: "InterfaceContainerBlock"
				}
			}
		]
}
```
{% endtab %}
{% endtabs %}

### 1.2 In the policy config there is a root block which is the top of the structure

![](<../../../.gitbook/assets/API_1 (1).png>)

### 1.3 Request the config for the root block

## Requesting configuration of root block

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/97379c43-2bce-4e67-9817-a79fbad3e53d`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    	uiMetaData: {...},
			blocks: [
				{
					id: "bb342b37-8bb6-4595-93fc-98fd63a23c16",
					blockType: "PolicyRolesBlock"
				}
			]
}
```
{% endtab %}
{% endtabs %}

### 1.4 Root block contains other blocks in the 'blocks' field. Request the config for the block by the block ID. Recursively repeat this operation for all contained blocks in order to construct all components.

## Requesting configuration of block by block ID

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/bb342b37-8bb6-4595-93fc-98fd63a23c16`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
     roles: 
                            ["INSTALLER"] 
                            uiMetaData: {...}, 
}
```
{% endtab %}
{% endtabs %}

![](<../../../.gitbook/assets/API_2 (1) (1).png>)

### 1.5 At present only PolicyRolesBlock is available to the user. Select the "INSTALLER" role.

## Registering the role as

<mark style="color:green;">`POST`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/bb342b37-8bb6-4595-93fc-98fd63a23c16`

Request the role

#### Path Parameters

| Name                                   | Type   | Description |
| -------------------------------------- | ------ | ----------- |
| role<mark style="color:red;">\*</mark> | String | INSTALLER   |

![](<../../../.gitbook/assets/API_3 (1).png>)

### 1.6 Request the root block and all contained blocks.

#### 1.6.1 Requesting InterfaceStepBlock

## Requesting InterfaceStepBlock

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/97379c43-2bce-4e67-9817-a79fbad3e53d`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    blocks: [
                {
			id: "9d98e2fd-6d2b-4152-b48c-cf10eb4f1298",
			blockType: "InterfaceStepBlock"
                }
            ]
}
```
{% endtab %}
{% endtabs %}

#### 1.6.2 Requesting requestVCDocumentBlock

## Request requestVCDocumentBlock

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/9d98e2fd-6d2b-4152-b48c-cf10eb4f1298`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    blocks:[
		id: "53dac8a9-b480-457e-920a-e4d4c653bfbe",
		blockType: "requestVCDocumentBlock"
           ]
}
```
{% endtab %}
{% endtabs %}

#### 1.6.3 Requesting Installer Details

## Requesting Installer Details

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/53dac8a9-b480-457e-920a-e4d4c653bfbe`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    schema: {...}
}
```
{% endtab %}
{% endtabs %}

### 1.7 Create json according to the schema and send to the requestVCDocumentBlock

## Creating JSON and sending it to requestVCDocumentBlock

<mark style="color:green;">`POST`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/53dac8a9-b480-457e-920a-e4d4c653bfbe`

#### Request Body

| Name                                       | Type   | Description                                                                           |
| ------------------------------------------ | ------ | ------------------------------------------------------------------------------------- |
| field0<mark style="color:red;">\*</mark>   | String | Applicant legal name                                                                  |
| field1<mark style="color:red;">\*</mark>   | String | Balance sheet total for last financial year in USD                                    |
| field2<mark style="color:red;">\*</mark>   | String | CEO or general Manager passport number                                                |
| field3<mark style="color:red;">\*</mark>   | String | Corporate registration number or passport number                                      |
| field4<mark style="color:red;">\*</mark>   | String | Country                                                                               |
| field5<mark style="color:red;">\*</mark>   | String | Date                                                                                  |
| field6<mark style="color:red;">\*</mark>   | String | Legal Status                                                                          |
| field7<mark style="color:red;">\*</mark>   | String | Main business ie food retailer                                                        |
| field8<mark style="color:red;">\*</mark>   | String | Name of CEO or General Manager                                                        |
| field9<mark style="color:red;">\*</mark>   | Number | Number of employees                                                                   |
| field10<mark style="color:red;">\*</mark>  | String | Postal zip code                                                                       |
| field11<mark style="color:red;">\*</mark>  | String | Primary contact email                                                                 |
| field12<mark style="color:red;">\*</mark>  | String | Primary contact name                                                                  |
| field13<mark style="color:red;">\*</mark>  | Number | primary contact telephone                                                             |
| field14<mark style="color:red;">\*</mark>  | String | Registered address line 1                                                             |
| field15<mark style="color:red;">\*</mark>  | String | Role requested under this application ie iREC participant and or registrant           |
| field16<mark style="color:red;">\*</mark>  | URL    | website URL                                                                           |
| field17<mark style="color:red;">\*</mark>  | Number | Years of registration                                                                 |
| type<mark style="color:red;">\*</mark>     | token  | 0d4b2c1f-dc7a-47f5-a9ab-238d190f6769&1.0.0                                            |
| @context<mark style="color:red;">\*</mark> | array  | \["https://ipfs.io/ipfs/bafkreihj5c6npywzkfx2pylalh5f23lhy2ogofxhdqctvpoh3gczwtzjg4"] |

![](<../../../.gitbook/assets/API_4 (1) (1).png>)

### 1.8 Request the root block and all contained blocks again.

#### 1.8.1 Requesting InterfaceStepBlock

## Requesting InterfaceStepBlock

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/97379c43-2bce-4e67-9817-a79fbad3e53d`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    blocks: [
        {
	    id: "9d98e2fd-6d2b-4152-b48c-cf10eb4f1298",
	    blockType: "InterfaceStepBlock"
	}
	    ]
}
```
{% endtab %}
{% endtabs %}

#### 1.8.2 Requesting InformationBlock

## Requesting InformationBlock

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/9d98e2fd-6d2b-4152-b48c-cf10eb4f1298`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    blocks:[
	        id: "2368a338-adaa-434a-a7a0-803e009e5717"
		blockType: "InformationBlock"
           ]
}
```
{% endtab %}
{% endtabs %}

#### 1.8.3 Requesting data after approval

## Waiting for the data to be approval

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/2368a338-adaa-434a-a7a0-803e009e5717`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    uiMetaData: {...},
}
```
{% endtab %}
{% endtabs %}

![](<../../../.gitbook/assets/API_5 (1).png>)

## 2. Login as a Standard Registry

### 2.1 Request the list of policies.

## Request List of policies

<mark style="color:blue;">`GET`</mark> `/api/v1/policies`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    {
		id: "621376c8e6763a0014fb0de4",
		config:{
				id: "97379c43-2bce-4e67-9817-a79fbad3e53d",
				blockType: "InterfaceContainerBlock"
			}
    }
}
```
{% endtab %}
{% endtabs %}

![](<../../../.gitbook/assets/API_6 (1).png>)

### 2.2 Request the root block and all contained blocks.

#### 2.2.1 Requesting InterfaceContainerBlock

## Requesting InterfaceContainerBlock

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/97379c43-2bce-4e67-9817-a79fbad3e53d`

{% tabs %}
{% tab title="200: OK " %}
```javascript
{
    uiMetaData: {...},
    blocks: [
		{
                        id: "77da138a-c455-4ec6-8202-fd6a529f5300",
			blockType: "InterfaceContainerBlock"
		}
	    ]
}
```
{% endtab %}
{% endtabs %}

#### 2.2.2 Requesting InterfaceContainerBlock

## Requesting InterfaceContainerBlock

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/77da138a-c455-4ec6-8202-fd6a529f5300`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    blocks:[
		id: "e5c40e14-3970-4f40-9e2c-34a260e6f499",
		blockType: "InterfaceContainerBlock"
           ]
}
```
{% endtab %}
{% endtabs %}

#### 2.2.3 Requesting InterfaceDocumentsSourceBlock

## Requesting InterfaceDocumentsSourceBlock

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/e5c40e14-3970-4f40-9e2c-34a260e6f499`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    blocks:[
		id: "d5c7c788-696d-457d-985e-dce3886b7267",
		blockType: "InterfaceDocumentsSourceBlock"
           ]
}
```
{% endtab %}
{% endtabs %}

#### 2.2.4 Requesting Approval

## Requesting Approval

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/d5c7c788-696d-457d-985e-dce3886b726`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    data:[...],
    fields: [
		...
		{
		    action: "block"
                    bindBlock: "approve_documents_btn"
		}
            ]
}
```
{% endtab %}
{% endtabs %}

### 2.3 In the 'Status Operation' field , there is a link to "approve\_documents\_btn" block, which requests the Block ID.

## Requesting BlockID

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/tag/approve_documents_btn`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    "id":"6f0f37c0-b62b-4be5-b1d0-e8114398350d"
}
```
{% endtab %}
{% endtabs %}

## Requesting InterfaceActioBlock

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/6f0f37c0-b62b-4be5-b1d0-e8114398350d`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    "id":"6f0f37c0-b62b-4be5-b1d0-e8114398350d",
    "blockType":"InterfaceActionBlock",
    "type":"selector",
    "uiMetaData":{
			"field":"status",
			"options":[
				    {
					"name":"Approve","value":"APPROVED","uiClass":"btn-approve","bindBlock":"update_approve_document_status"},
				    {
					"name":"Reject","value":"REJECTED","uiClass":"btn-reject","bindBlock":"rejected_approve_document_status"}
				  ]
		},
    "field":"option.status"
}
```
{% endtab %}
{% endtabs %}

### 2.4 Approve the document

```
Select the VC from the grid:	
		const VC = data[0];
		
Change status:	
		VC.option.status = "APPROVED";
		
Send to the VC:
POST  /api/v1/policies/621376c8e6763a0014fb0de4/blocks/6f0f37c0-b62b-4be5-b1d0-e8114398350d
		Request:
				VC
				
```

![](<../../../.gitbook/assets/API_7 (1).png>)

![](<../../../.gitbook/assets/image 2.png>)

## 3. Login as the User

### 3.1 Request the root block and all the contained blocks.

#### 3.1.1 Requesting InterfaceStepBlock

## Requesting InterfaceStepBlock

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/97379c43-2bce-4e67-9817-a79fbad3e53d`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    blocks: [
                {
			id: "9d98e2fd-6d2b-4152-b48c-cf10eb4f1298",
			blockType: "InterfaceStepBlock"
                }
            ]
}
```
{% endtab %}
{% endtabs %}

#### 3.1.2 Requesting InterfaceContainerBlock

## Requesting InterfaceContainerBlock

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/9d98e2fd-6d2b-4152-b48c-cf10eb4f1298`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    blocks:[
    {
	id: "7b9273a1-1398-4560-be19-cc59d6c4c752",
	blockType: "InterfaceContainerBlock"
    }
	   ]
}
```
{% endtab %}
{% endtabs %}

#### 3.1.3 Requesting multiple InterfaceContainerBlock

## Requesting multiple InterfaceContainerBlock

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/7b9273a1-1398-4560-be19-cc59d6c4c752`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    blocks:[
		{
			id: "4008376b-0047-4004-83df-cf4c3555fc33",
			blockType: "InterfaceContainerBlock"
		},
		{
			id: "7b47566d-c61e-4a74-8646-3d9bbac8eb42",
			blockType: "InterfaceContainerBlock"
		}
	    ]
}
```
{% endtab %}
{% endtabs %}

#### 3.1.4 Requesting InterfaceDocumentsSourceBlock and InterfaceStepBlock

## Requesting InterfaceDocumentsSourceBlock and InterfaceStepBlock

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/4008376b-0047-4004-83df-cf4c3555fc33`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    blocks:[
		{
			id: "af9fd59b-06a3-48b5-b610-b0af7888e39b",
			blockType: "InterfaceDocumentsSourceBlock"
		}
		{
			id: "06cfd440-03ec-471e-9b3f-e0c583555b94",
			blockType: "InterfaceStepBlockBlock"
		}
	   ]
}
```
{% endtab %}
{% endtabs %}

#### 3.1.5 Requesting Data

## Requesting Data

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/af9fd59b-06a3-48b5-b610-b0af7888e39b`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    data:[...],
    fields: [...]
}
```
{% endtab %}
{% endtabs %}

#### 3.1.6 Requesting requestVCDocumentBlock

## Requesting requestVCDocumentBlock

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/06cfd440-03ec-471e-9b3f-e0c583555b94`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    blocks:[
                {
			id: "d068b59e-eec7-4452-b866-468e9ed6c7fa"
			blockType: "requestVCDocumentBlock"
                }
           ]
}
```
{% endtab %}
{% endtabs %}

#### 3.1.7 Requesting Data and Schema

## Requesting Data and Schema

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/d068b59e-eec7-4452-b866-468e9ed6c7fa`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    schema: {...}
}
```
{% endtab %}
{% endtabs %}

### 3.2 In the fields of the grid there is a link to the "download\_config\_btn" bloc.

## Requesting BlockID

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/tag/download_config_btn`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    "id":"24942cf7-fcc5-4dff-8471-d5affeb4c206"
}
```
{% endtab %}
{% endtabs %}

#### 3.2.1 Requesting InterfaceActionBlock

## Requesting InterfaceActionBlock

<mark style="color:blue;">`GET`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/24942cf7-fcc5-4dff-8471-d5affeb4c206`

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    id: "24942cf7-fcc5-4dff-8471-d5affeb4c206",
    blockType: "InterfaceActionBlock",
    type: "download",
    "uiMetaData":{...}
}
```
{% endtab %}
{% endtabs %}

### 3.3 Create a sensor

## Creating a Sensor

<mark style="color:green;">`POST`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/d068b59e-eec7-4452-b866-468e9ed6c7fa`

#### Request Body

| Name                                       | Type   | Description                                                                           |
| ------------------------------------------ | ------ | ------------------------------------------------------------------------------------- |
| field0<mark style="color:red;">\*</mark>   | String | projectID                                                                             |
| field1<mark style="color:red;">\*</mark>   | String | projectName                                                                           |
| field2<mark style="color:red;">\*</mark>   | String | sensorID                                                                              |
| field3<mark style="color:red;">\*</mark>   | String | capacity                                                                              |
| type<mark style="color:red;">\*</mark>     | token  | 885838ef-6385-403a-b413-38baad45ee26&1.0.0                                            |
| @context<mark style="color:red;">\*</mark> | URL    | \["https://ipfs.io/ipfs/bafkreidnedcys7trnfeovygn3tvemmlltnszbci6fhnk2hnexscmtchhka"] |

![](<../../../.gitbook/assets/API_9 (1).png>)

<figure><img src="../../../.gitbook/assets/image (96) (3).png" alt=""><figcaption></figcaption></figure>

### 3.4 Refresh the Blocks

### 3.5 Download the config

## Downloading the configuration

<mark style="color:green;">`POST`</mark> `/api/v1/policies/621376c8e6763a0014fb0de4/blocks/24942cf7-fcc5-4dff-8471-d5affeb4c206`

#### Request Body

| Name                                 | Type   | Description                   |
| ------------------------------------ | ------ | ----------------------------- |
| VC<mark style="color:red;">\*</mark> | String | record in the grid (data\[0]) |

![](<../../../.gitbook/assets/API_11 (1).png>)

### 3.6 Sample MRV Sender Data

## Sending MRV Data

<mark style="color:green;">`POST`</mark> `/external`

Sending MRV Data

#### Request Body

| Name      | Type   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| document  | String | "id":"8d8e8a0a-211d-4180-8001-2e30cd7b915f", "type":\[ "VerifiableCredential" ], "issuer":"did:hedera:testnet:3G7JYDvL5QsbBz5u9531UyMKWPJHdDQ5B6nRMK3zqoUm;hedera:testnet:tid=0.0.34404759", "issuanceDate":"2022-05-05T12:30:14.909Z", "@context":\[ "https://www.w3.org/2018/credentials/v1" ], "credentialSubject":\[ { "type":"5b4cdcee-ba73-4234-bddd-2988b050552c&1.0.0", "@context":\[ "https://ipfs.io/ipfs/bafkreiaihnzlo7ahhr6wqnnyqprrl7onqdogkfzyum6poixba5ptjptowu" ], "field0":"2", "field1":"8", "field2":"1", "policyId":"6273c027d79555ef171b550d", "accountId":"0.0.34235315" } ], "proof":{ "type":"Ed25519Signature2018", "created":"2022-05-05T12:30:14Z", "verificationMethod":"did:hedera:testnet:3G7JYDvL5QsbBz5u9531UyMKWPJHdDQ5B6nRMK3zqoUm;hedera:testnet:tid=0.0.34404759#did-root-key", "proofPurpose":"assertionMethod", "jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..awGmfcQzVefihEkoLT7zrqltRoEkuluVV8PALFc7ftlOckY0K7wQOwmdZMG479IZ1g4mW0todYmcLueNgTruAQ" } |
| owner     | String | did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| policyTag | String | Tag\_1651752987100                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    // Response
}
```
{% endtab %}

{% tab title="500: Internal Server Error Internal Server Error" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
}
```
{% endtab %}
{% endtabs %}
