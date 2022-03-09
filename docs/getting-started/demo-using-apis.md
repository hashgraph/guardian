# Demo Using APIs

## 1. Login as a User

### 1.1 Get the list of policies.

{% swagger method="get" path="" baseUrl="/api/v1/policies/" summary="Displaying list of policies" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
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
{% endswagger-response %}
{% endswagger %}

### 1.2 In the policy config there is a root block which is the top of the structure

![](<../.gitbook/assets/image (25).png>)

### 1.3 Request the config for the root block

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/97379c43-2bce-4e67-9817-a79fbad3e53d" summary="Requesting configuration of root block" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
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
{% endswagger-response %}
{% endswagger %}

### 1.4 Root block contains other blocks in the 'blocks' field. Request the config for the block by the block ID. Recursively repeat this operation for all contained blocks in order to construct all components.

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/bb342b37-8bb6-4595-93fc-98fd63a23c16 " summary="Requesting configuration of block by block ID" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
     roles: 
                            ["INSTALLER"] 
                            uiMetaData: {...}, 
}
```
{% endswagger-response %}
{% endswagger %}

![](<../.gitbook/assets/image (24).png>)

### 1.5 At present only PolicyRolesBlock is available to the user. Select the "INSTALLER" role.

{% swagger method="post" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/bb342b37-8bb6-4595-93fc-98fd63a23c16" summary="Registering the role as "Installer"" %}
{% swagger-description %}
Request the role
{% endswagger-description %}

{% swagger-parameter in="path" name="role" type="String" required="true" %}
INSTALLER
{% endswagger-parameter %}
{% endswagger %}

![](<../.gitbook/assets/image (10).png>)

### 1.6 Request the root block and all contained blocks.

#### 1.6.1 Requesting InterfaceStepBlock

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/97379c43-2bce-4e67-9817-a79fbad3e53d" summary="Requesting InterfaceStepBlock" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
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
{% endswagger-response %}
{% endswagger %}

#### 1.6.2 Requesting requestVCDocumentBlock

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/9d98e2fd-6d2b-4152-b48c-cf10eb4f1298" summary="Request requestVCDocumentBlock" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    blocks:[
		id: "53dac8a9-b480-457e-920a-e4d4c653bfbe",
		blockType: "requestVCDocumentBlock"
           ]
}
```
{% endswagger-response %}
{% endswagger %}

#### 1.6.3 Requesting Installer Details

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/53dac8a9-b480-457e-920a-e4d4c653bfbe" summary="Requesting Installer Details" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    schema: {...}
}
```
{% endswagger-response %}
{% endswagger %}

### 1.7 Create json according to the schema and send to the requestVCDocumentBlock

{% swagger method="post" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/53dac8a9-b480-457e-920a-e4d4c653bfbe" summary="Creating JSON and sending it to requestVCDocumentBlock" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="field0" type="String" required="true" %}
Applicant legal name
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field1" type="String" required="true" %}
Balance sheet total for last financial year in USD
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field2" type="String" required="true" %}
CEO or general Manager passport number
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field3" type="String" required="true" %}
Corporate registration number or passport number
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field4" type="String" required="true" %}
Country
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field5" type="String" required="true" %}
Date
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field6" type="String" required="true" %}
Legal Status
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field7" type="String" required="true" %}
Main business ie food retailer
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field8" type="String" required="true" %}
Name of CEO or General Manager
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field9" type="Number" required="true" %}
Number of employees
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field10" type="String" required="true" %}
Postal zip code
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field11" type="String" required="true" %}
Primary contact email
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field12" type="String" required="true" %}
Primary contact name
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field13" type="Number" required="true" %}
primary contact telephone
{% endswagger-parameter %}

{% swagger-parameter in="body" type="String" name="field14" required="true" %}
Registered address line 1
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field15" type="String" required="true" %}
Role requested under this application ie iREC participant and or registrant
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field16" type="URL" required="true" %}
website URL
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field17" type="Number" required="true" %}
Years of registration
{% endswagger-parameter %}

{% swagger-parameter in="body" name="type" type="token" required="true" %}
0d4b2c1f-dc7a-47f5-a9ab-238d190f6769&1.0.0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="@context" type="array" required="true" %}
\["https://ipfs.io/ipfs/bafkreihj5c6npywzkfx2pylalh5f23lhy2ogofxhdqctvpoh3gczwtzjg4"]
{% endswagger-parameter %}
{% endswagger %}

![](<../.gitbook/assets/image (16).png>)

### 1.8 Request the root block and all contained blocks again.

#### 1.8.1 Requesting InterfaceStepBlock

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/97379c43-2bce-4e67-9817-a79fbad3e53d" summary="Requesting InterfaceStepBlock" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
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
{% endswagger-response %}
{% endswagger %}

#### 1.8.2 Requesting InformationBlock

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/9d98e2fd-6d2b-4152-b48c-cf10eb4f1298" summary="Requesting InformationBlock" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    blocks:[
	        id: "2368a338-adaa-434a-a7a0-803e009e5717"
		blockType: "InformationBlock"
           ]
}
```
{% endswagger-response %}
{% endswagger %}

#### 1.8.3 Requesting data after approval

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/2368a338-adaa-434a-a7a0-803e009e5717" summary="Waiting for the data to be approval" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    uiMetaData: {...},
}
```
{% endswagger-response %}
{% endswagger %}

![](<../.gitbook/assets/image (6).png>)

## 2. Login as a Root Authority

### 2.1 Request the list of policies.

{% swagger method="get" path="" baseUrl="/api/v1/policies" summary="Request List of policies" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
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
{% endswagger-response %}
{% endswagger %}

![](<../.gitbook/assets/image (5).png>)

### 2.2 Request the root block and all contained blocks.

#### 2.2.1 Requesting InterfaceContainerBlock

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/97379c43-2bce-4e67-9817-a79fbad3e53d" summary="Requesting InterfaceContainerBlock" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="" %}
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
{% endswagger-response %}
{% endswagger %}

#### 2.2.2 Requesting InterfaceContainerBlock

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/77da138a-c455-4ec6-8202-fd6a529f5300" summary="Requesting InterfaceContainerBlock" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    blocks:[
		id: "e5c40e14-3970-4f40-9e2c-34a260e6f499",
		blockType: "InterfaceContainerBlock"
           ]
}
```
{% endswagger-response %}
{% endswagger %}

#### 2.2.3 Requesting InterfaceDocumentsSourceBlock

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/e5c40e14-3970-4f40-9e2c-34a260e6f499" summary="Requesting InterfaceDocumentsSourceBlock" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    blocks:[
		id: "d5c7c788-696d-457d-985e-dce3886b7267",
		blockType: "InterfaceDocumentsSourceBlock"
           ]
}
```
{% endswagger-response %}
{% endswagger %}

#### 2.2.4 Requesting Approval&#x20;

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/d5c7c788-696d-457d-985e-dce3886b726" summary="Requesting Approval" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
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
{% endswagger-response %}
{% endswagger %}

### 2.3 In the 'Status Operation' field , there is a link to "approve\_documents\_btn" block, which requests the Block ID.

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/tag/approve_documents_btn" summary="Requesting BlockID" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    "id":"6f0f37c0-b62b-4be5-b1d0-e8114398350d"
}
```
{% endswagger-response %}
{% endswagger %}

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/6f0f37c0-b62b-4be5-b1d0-e8114398350d" summary="Requesting InterfaceActioBlock" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
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
{% endswagger-response %}
{% endswagger %}

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

![](<../.gitbook/assets/image (15).png>)

![](<../.gitbook/assets/image (2).png>)

## 3. Login as the User

### 3.1 Request the root block and all the contained blocks.

#### 3.1.1 Requesting InterfaceStepBlock

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/97379c43-2bce-4e67-9817-a79fbad3e53d" summary="Requesting InterfaceStepBlock" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
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
{% endswagger-response %}
{% endswagger %}

#### 3.1.2 Requesting InterfaceContainerBlock

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/9d98e2fd-6d2b-4152-b48c-cf10eb4f1298" summary="Requesting InterfaceContainerBlock" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
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
{% endswagger-response %}
{% endswagger %}

#### 3.1.3 Requesting multiple InterfaceContainerBlock

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/7b9273a1-1398-4560-be19-cc59d6c4c752" summary="Requesting multiple InterfaceContainerBlock" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
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
{% endswagger-response %}
{% endswagger %}

#### 3.1.4 Requesting InterfaceDocumentsSourceBlock and InterfaceStepBlock

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/4008376b-0047-4004-83df-cf4c3555fc33" summary="Requesting InterfaceDocumentsSourceBlock and InterfaceStepBlock" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
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
{% endswagger-response %}
{% endswagger %}

#### 3.1.5 Requesting Data

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/af9fd59b-06a3-48b5-b610-b0af7888e39b" summary="Requesting Data" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    data:[...],
    fields: [...]
}
```
{% endswagger-response %}
{% endswagger %}

#### 3.1.6 Requesting requestVCDocumentBlock

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/06cfd440-03ec-471e-9b3f-e0c583555b94" summary="Requesting requestVCDocumentBlock" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
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
{% endswagger-response %}
{% endswagger %}

#### 3.1.7 Requesting Data and Schema

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/d068b59e-eec7-4452-b866-468e9ed6c7fa" summary="Requesting Data and Schema" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    uiMetaData: {...},
    schema: {...}
}
```
{% endswagger-response %}
{% endswagger %}

### 3.2 In the fields of the grid there is a link to the "download\_config\_btn" bloc.&#x20;

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/tag/download_config_btn" summary="Requesting BlockID" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    "id":"24942cf7-fcc5-4dff-8471-d5affeb4c206"
}
```
{% endswagger-response %}
{% endswagger %}

#### 3.2.1 Requesting InterfaceActionBlock

{% swagger method="get" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/24942cf7-fcc5-4dff-8471-d5affeb4c206" summary="Requesting InterfaceActionBlock" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    id: "24942cf7-fcc5-4dff-8471-d5affeb4c206",
    blockType: "InterfaceActionBlock",
    type: "download",
    "uiMetaData":{...}
}
```
{% endswagger-response %}
{% endswagger %}

### 3.3 Create a sensor

{% swagger method="post" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/d068b59e-eec7-4452-b866-468e9ed6c7fa" summary="Creating a Sensor" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="field0" type="String" required="true" %}
projectID
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field1" type="String" required="true" %}
projectName
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field2" type="String" required="true" %}
sensorID
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field3" type="String" required="true" %}
capacity
{% endswagger-parameter %}

{% swagger-parameter in="body" name="type" type="token" required="true" %}
885838ef-6385-403a-b413-38baad45ee26&1.0.0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="@context" type="URL" required="true" %}
\["https://ipfs.io/ipfs/bafkreidnedcys7trnfeovygn3tvemmlltnszbci6fhnk2hnexscmtchhka"]
{% endswagger-parameter %}
{% endswagger %}

![](<../.gitbook/assets/image (12).png>)

![](../.gitbook/assets/image.png)

### 3.4 Refresh the Blocks

### 3.5 Download the config

{% swagger method="post" path="" baseUrl="/api/v1/policies/621376c8e6763a0014fb0de4/blocks/24942cf7-fcc5-4dff-8471-d5affeb4c206" summary="Downloading the configuration" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="VC" required="true" %}
record in the grid (data[0])
{% endswagger-parameter %}
{% endswagger %}

![](<../.gitbook/assets/image (17).png>)
