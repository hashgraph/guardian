# API Workflow of iREC 2 Demo

## Root Authority

### Create Root Account

{% swagger method="post" path="" baseUrl="/account/register" summary="Creating Root Authority" %}
{% swagger-description %}
To create a Root Account
{% endswagger-description %}

{% swagger-parameter in="body" name="username" type="String" required="true" %}
rootUsername
{% endswagger-parameter %}

{% swagger-parameter in="body" name="password" type="String" required="true" %}
rootPassword
{% endswagger-parameter %}

{% swagger-parameter in="body" name="role" type="String" required="true" %}
ROOT_AUTHORITY
{% endswagger-parameter %}

{% swagger-response status="201: Created" description="Successful Operation" %}
```javascript
{
    "username": "1tckto80",
    "password": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    "did": null,
    "parent": null,
    "role": "ROOT_AUTHORITY",
    "id": "627d4b99ab3cae7c07025893"
}
```
{% endswagger-response %}
{% endswagger %}

### Login as Root Authority

{% swagger method="post" path="" baseUrl="/accounts/login" summary="Login to the Root Account" %}
{% swagger-description %}
Login as Root Authority
{% endswagger-description %}

{% swagger-parameter in="body" name="username" type="String" required="true" %}
username
{% endswagger-parameter %}

{% swagger-parameter in="body" name="password" type="String" required="true" %}
Password
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
  "username": "1tckto80",
    "did": null,
    "role": "ROOT_AUTHORITY",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IjF0Y2t0bzgwIiwiZGlkIjpudWxsLCJyb2xlIjoiUk9PVF9BVVRIT1JJVFkiLCJpYXQiOjE2NTIzNzk5MDR9.xo6WrNhW5uPfpxBICgTHqyip7TFk2GnrUHtMTJ-TKgU"  
}
```
{% endswagger-response %}
{% endswagger %}

### Generating Root Key

{% swagger method="get" path="" baseUrl="/demo/randomKey" summary="To Generate Root Key" %}
{% swagger-description %}
Generating Root Key
{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    "id": "0.0.34751301",
    "key": "302e020100300506032b65700422042076ccbf8eec6031299bbcdaf14f97b3de116e5b809e8ae3f8a55f7e035aa0fbdc"
}
```
{% endswagger-response %}
{% endswagger %}

### Update Root Profile

{% swagger method="put" path="{rootUsername}" baseUrl="/profiles/" summary="Updating Profile of Root Authority" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="hederaAccountID" type="String" required="true" %}
rootID
{% endswagger-parameter %}

{% swagger-parameter in="body" name="hederaAccountKey" type="Key" required="true" %}
rootKey
{% endswagger-parameter %}

{% swagger-parameter in="body" name="vcDocument" type="Array" required="false" %}

{% endswagger-parameter %}
{% endswagger %}

### Get Root Profile

{% swagger method="get" path="" baseUrl="/profiles/{rootUsername}" summary="Getting Root Authority Profile Details" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    "username": "1tckto80",
    "role": "ROOT_AUTHORITY",
    "did": "did:hedera:testnet:F9Nhh3jSvVX6sErMuy95WkEr2fqCuWzZFsoq8YWRQdvD;hedera:testnet:tid=0.0.34751333",
    "parent": null,
    "hederaAccountId": "0.0.34751301",
    "confirmed": true,
    "failed": false,
    "hederaAccountKey": null,
    "topicId": "0.0.34751333",
    "didDocument": {
        "id": "627d553d0f12a18fef5f1d52",
        "did": "did:hedera:testnet:F9Nhh3jSvVX6sErMuy95WkEr2fqCuWzZFsoq8YWRQdvD;hedera:testnet:tid=0.0.34751333",
        "document": {
            "@context": [
                "https://www.w3.org/ns/did/v1",
                "https://ns.did.ai/transmute/v1"
            ],
            "id": "did:hedera:testnet:F9Nhh3jSvVX6sErMuy95WkEr2fqCuWzZFsoq8YWRQdvD;hedera:testnet:tid=0.0.34751333",
            "verificationMethod": [
                {
                    "id": "did:hedera:testnet:F9Nhh3jSvVX6sErMuy95WkEr2fqCuWzZFsoq8YWRQdvD;hedera:testnet:tid=0.0.34751333#did-root-key",
                    "type": "Ed25519VerificationKey2018",
                    "controller": "did:hedera:testnet:F9Nhh3jSvVX6sErMuy95WkEr2fqCuWzZFsoq8YWRQdvD;hedera:testnet:tid=0.0.34751333",
                    "publicKeyBase58": "B5Myaf7Uhfg8t5XWjm6QZCd6HB44xqyiiBXVDFokYEzR"
                }
            ],
            "authentication": "did:hedera:testnet:F9Nhh3jSvVX6sErMuy95WkEr2fqCuWzZFsoq8YWRQdvD;hedera:testnet:tid=0.0.34751333#did-root-key",
            "assertionMethod": [
                "#did-root-key"
            ]
        },
        "createDate": "2022-05-12T18:43:09.816Z",
        "updateDate": "2022-05-12T18:43:09.817Z",
        "status": "CREATE",
        "messageId": "1652380991.675947000",
        "topicId": "0.0.34751333"
    },
    "vcDocument": {
        "id": "627d553d0f12a18fef5f1d53",
        "owner": "did:hedera:testnet:F9Nhh3jSvVX6sErMuy95WkEr2fqCuWzZFsoq8YWRQdvD;hedera:testnet:tid=0.0.34751333",
        "hash": "D9A1uvPHUsjn869gswTkhQTQUJcpRaihSwnRhqF1L9Mm",
        "document": {
            "id": "e0a4ddac-682f-4b64-8e50-dfa2e6d98d9d",
            "type": [
                "VerifiableCredential"
            ],
            "issuer": "did:hedera:testnet:F9Nhh3jSvVX6sErMuy95WkEr2fqCuWzZFsoq8YWRQdvD;hedera:testnet:tid=0.0.34751333",
            "issuanceDate": "2022-05-12T18:43:09.839Z",
            "@context": [
                "https://www.w3.org/2018/credentials/v1"
            ],
            "credentialSubject": [
                {
                    "id": "did:hedera:testnet:F9Nhh3jSvVX6sErMuy95WkEr2fqCuWzZFsoq8YWRQdvD;hedera:testnet:tid=0.0.34751333"
                }
            ],
            "proof": {
                "type": "Ed25519Signature2018",
                "created": "2022-05-12T18:43:09Z",
                "verificationMethod": "did:hedera:testnet:F9Nhh3jSvVX6sErMuy95WkEr2fqCuWzZFsoq8YWRQdvD;hedera:testnet:tid=0.0.34751333#did-root-key",
                "proofPurpose": "assertionMethod",
                "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..mWMjPMSIf6E8U7ZJTve-L4JWDu6mrWVsVgdkRz4Rsk-oH4l27A1ApRGDo7FrsSkmQjQqbixJ8IxBtraOs-fRCA"
            }
        },
        "createDate": "2022-05-12T18:43:09.924Z",
        "updateDate": "2022-05-12T18:43:09.924Z",
        "hederaStatus": "ISSUE",
        "signature": 0,
        "type": "ROOT_AUTHORITY",
        "option": {},
        "messageId": "1652380995.021714404",
        "topicId": "0.0.34751333"
    }
}
```
{% endswagger-response %}
{% endswagger %}

## User

### Create User Account

{% swagger method="post" path="" baseUrl="/accounts/register" summary="Creating User Account" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="username" type="String" required="true" %}
rootUsername
{% endswagger-parameter %}

{% swagger-parameter in="body" name="password" type="String" required="true" %}
rootPassword
{% endswagger-parameter %}

{% swagger-parameter in="body" name="role" type="String" required="true" %}
USER
{% endswagger-parameter %}

{% swagger-response status="201: Created" description="Successful Operation" %}
```javascript
{
    "username": "keovlmcy",
    "password": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    "did": null,
    "parent": null,
    "role": "USER",
    "id": "627d5740ab3cae7c07025895"
}
```
{% endswagger-response %}
{% endswagger %}

### Login to User Account

{% swagger method="post" path="" baseUrl="/accounts/login" summary="Login as User" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="username" type="String" required="true" %}
rootUsername
{% endswagger-parameter %}

{% swagger-parameter in="body" name="password" type="String" required="true" %}
rootPassword
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    "username": "keovlmcy",
    "did": null,
    "role": "USER",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Imtlb3ZsbWN5IiwiZGlkIjpudWxsLCJyb2xlIjoiVVNFUiIsImlhdCI6MTY1MjM4MTcyNn0.T6ptsaQmCvHUVUfqcO3LJHY4GVZJn9Sbgt5N9WpZ_bI"
}
```
{% endswagger-response %}
{% endswagger %}

### Generate User Key

{% swagger method="get" path="" baseUrl="/demo/randomKey" summary="Generating User Key" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    "id": "0.0.34751370",
    "key": "302e020100300506032b657004220420ba1b0e7b60f40e0032c21fa1c19eb6e4a09a53ad217c80ab08f6b0720d6ffbf3"
}
```
{% endswagger-response %}
{% endswagger %}

### Update User Profile

{% swagger method="put" path="" baseUrl="/profiles/{userUsername}" summary="Updating User Profiles" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="hederaAccountID" type="ID" required="true" %}
UserID
{% endswagger-parameter %}

{% swagger-parameter in="body" name="hederaAccountKey" type="Key" required="true" %}
UserKey
{% endswagger-parameter %}

{% swagger-parameter in="body" name="parent" type="DID" required="true" %}
rootDID
{% endswagger-parameter %}
{% endswagger %}

### Get User Profile

{% swagger method="get" path="" baseUrl="/profiles/{userUsername}" summary="Getting User Profile Details" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    "username": "keovlmcy",
    "role": "USER",
    "did": "did:hedera:testnet:6PthfKmdjeKjXoJ9XULiUwJMLbooHoEHgsqoPTT9LArW;hedera:testnet:tid=0.0.34751333",
    "parent": "did:hedera:testnet:F9Nhh3jSvVX6sErMuy95WkEr2fqCuWzZFsoq8YWRQdvD;hedera:testnet:tid=0.0.34751333",
    "hederaAccountId": "0.0.34751370",
    "confirmed": true,
    "failed": false,
    "hederaAccountKey": null,
    "topicId": "0.0.34751333",
    "didDocument": {
        "id": "627d595c0f12a18fef5f1d54",
        "did": "did:hedera:testnet:6PthfKmdjeKjXoJ9XULiUwJMLbooHoEHgsqoPTT9LArW;hedera:testnet:tid=0.0.34751333",
        "document": {
            "@context": [
                "https://www.w3.org/ns/did/v1",
                "https://ns.did.ai/transmute/v1"
            ],
            "id": "did:hedera:testnet:6PthfKmdjeKjXoJ9XULiUwJMLbooHoEHgsqoPTT9LArW;hedera:testnet:tid=0.0.34751333",
            "verificationMethod": [
                {
                    "id": "did:hedera:testnet:6PthfKmdjeKjXoJ9XULiUwJMLbooHoEHgsqoPTT9LArW;hedera:testnet:tid=0.0.34751333#did-root-key",
                    "type": "Ed25519VerificationKey2018",
                    "controller": "did:hedera:testnet:6PthfKmdjeKjXoJ9XULiUwJMLbooHoEHgsqoPTT9LArW;hedera:testnet:tid=0.0.34751333",
                    "publicKeyBase58": "EpLUuXpqFSChqCgmDLcKqsm1EBhVRXLxH7juwu3iEYtw"
                }
            ],
            "authentication": "did:hedera:testnet:6PthfKmdjeKjXoJ9XULiUwJMLbooHoEHgsqoPTT9LArW;hedera:testnet:tid=0.0.34751333#did-root-key",
            "assertionMethod": [
                "#did-root-key"
            ]
        },
        "createDate": "2022-05-12T19:00:44.279Z",
        "updateDate": "2022-05-12T19:00:44.279Z",
        "status": "CREATE",
        "messageId": "1652382046.878940000",
        "topicId": "0.0.34751333"
    }
}
```
{% endswagger-response %}
{% endswagger %}

## Policy

### New Policy

#### Import Policy

{% swagger method="post" path="" baseUrl="/policies/import/message" summary="Importing Policy" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="messageID" type="ID" required="true" %}
1651598638.021817000
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    {
        "id": "627e97fb0f12a18fef5f1d61",
        "uuid": "35461391-ddec-4c05-a446-da0c9324d1b2",
        "name": "iRec_2_1650456840748_1652463611568",
        "description": "iRec Description",
        "topicDescription": "iRec Description",
        "config": {
            "blockType": "interfaceContainerBlock",
            "permissions": [
                "ANY_ROLE"
            ],
            "id": "5de4c484-e9fa-4e4e-a3b0-70d945441a34",
            "onErrorAction": "no-action",
            "uiMetaData": {
                "type": "blank"
            },
            "children": [
                {
                    "id": "18639325-e036-4773-9eaa-6ccbb965b19d",
                    "tag": "choose_role",
                    "blockType": "policyRolesBlock",
                    "defaultActive": true,
                    "children": [],
                    "permissions": [
                        "NO_ROLE"
                    ],
                    "onErrorAction": "no-action",
                    "uiMetaData": {
                        "title": "Registration",
                        "description": "Choose a role"
                    },
                    "roles": [
                        "Registrant"
                    ]
                },
                {
                    "id": "c769991c-af8d-4292-989c-a697cd047f73",
                    "tag": "registrants_workflow",
                    "blockType": "interfaceContainerBlock",
                    "defaultActive": true,
                    "children": [
                        {
                            "id": "1ba36c5a-78ac-4081-80f4-7ac8693df3e1",
                            "tag": "registrants_workflow_steps",
                            "blockType": "interfaceStepBlock",
                            "defaultActive": true,
                            "children": [
                                {
                                    "id": "f2c1674d-443f-435f-839f-4325e6ca0698",
                                    "tag": "create_application",
                                    "blockType": "requestVcDocumentBlock",
                                    "defaultActive": true,
                                    "children": [],
                                    "permissions": [
                                        "Registrant"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {
                                        "type": "page",
                                        "title": "Registrant Application"
                                    },
                                    "presetFields": [],
                                    "schema": "#049308d8-d519-427c-bfae-8c77e7671da5",
                                    "idType": "OWNER"
                                },
                                {
                                    "id": "0292bfb4-ebdf-4ff7-a927-ce9fb58925d0",
                                    "tag": "save_application(hedera)",
                                    "blockType": "sendToGuardianBlock",
                                    "defaultActive": false,
                                    "children": [],
                                    "permissions": [
                                        "Registrant"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {},
                                    "options": [],
                                    "dataType": "",
                                    "entityType": "registrant",
                                    "topic": "Project",
                                    "dataSource": "hedera",
                                    "documentType": "vc",
                                    "topicOwner": "user"
                                },
                                {
                                    "id": "fed49259-8ce2-4330-910b-02ee7719b499",
                                    "tag": "create_application(db)",
                                    "blockType": "sendToGuardianBlock",
                                    "defaultActive": false,
                                    "children": [],
                                    "permissions": [
                                        "Registrant"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {},
                                    "options": [
                                        {
                                            "name": "status",
                                            "value": "Waiting for approval"
                                        }
                                    ],
                                    "dataType": "",
                                    "entityType": "registrant",
                                    "dataSource": "database",
                                    "documentType": "vc"
                                },
                                {
                                    "id": "47dcda17-a066-4713-8b37-3a7e53f30be1",
                                    "tag": "wait_for_approve",
                                    "blockType": "informationBlock",
                                    "defaultActive": true,
                                    "children": [],
                                    "permissions": [
                                        "Registrant"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {
                                        "description": "The page will refresh automatically once the application is approved.",
                                        "type": "text",
                                        "title": "Submitted for Approval"
                                    },
                                    "stopPropagation": true
                                },
                                {
                                    "id": "27cecf69-1fd4-47d9-b42d-93218e9d1023",
                                    "tag": "save_application_status(approve)",
                                    "blockType": "sendToGuardianBlock",
                                    "defaultActive": false,
                                    "children": [],
                                    "permissions": [
                                        "Registrant"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {},
                                    "options": [
                                        {
                                            "name": "status",
                                            "value": "Approved"
                                        }
                                    ],
                                    "dataType": "",
                                    "entityType": "registrant",
                                    "dataSource": "database",
                                    "documentType": "vc"
                                },
                                {
                                    "id": "9e5c60b1-18e3-4770-9771-da9af49811c4",
                                    "tag": "sign_by_issuer",
                                    "blockType": "reassigningBlock",
                                    "defaultActive": false,
                                    "children": [],
                                    "permissions": [
                                        "Registrant"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {},
                                    "issuer": "policyOwner",
                                    "actor": "owner"
                                },
                                {
                                    "id": "ee7d2cfa-ec36-46dc-accc-0cad35f270d0",
                                    "tag": "save_copy_application(hedera)",
                                    "blockType": "sendToGuardianBlock",
                                    "defaultActive": false,
                                    "children": [],
                                    "permissions": [
                                        "Registrant"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {},
                                    "options": [],
                                    "dataSource": "hedera",
                                    "documentType": "vc",
                                    "topic": "Project",
                                    "entityType": "registrant(Approved)",
                                    "topicOwner": "owner"
                                },
                                {
                                    "id": "47a2c964-23dc-41ce-ae4f-cb4886c7a076",
                                    "tag": "save_copy_application",
                                    "blockType": "sendToGuardianBlock",
                                    "defaultActive": false,
                                    "children": [],
                                    "permissions": [
                                        "Registrant"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {},
                                    "options": [
                                        {
                                            "name": "status",
                                            "value": "Approved"
                                        }
                                    ],
                                    "dataType": "",
                                    "entityType": "registrant(Approved)",
                                    "forceNew": true,
                                    "dataSource": "database",
                                    "documentType": "vc"
                                },
                                {
                                    "id": "4ba98a84-ac13-4f74-b2ec-4cb5be6efae7",
                                    "tag": "registrants_page",
                                    "blockType": "interfaceContainerBlock",
                                    "defaultActive": true,
                                    "children": [
                                        {
                                            "id": "a4584ad6-fc88-485c-99d4-368b5be76527",
                                            "tag": "devices_page",
                                            "blockType": "interfaceContainerBlock",
                                            "defaultActive": true,
                                            "children": [
                                                {
                                                    "id": "53e0e097-a9df-4d9a-95e7-8c5ca0acf205",
                                                    "tag": "devices_grid",
                                                    "blockType": "interfaceDocumentsSourceBlock",
                                                    "defaultActive": true,
                                                    "children": [
                                                        {
                                                            "id": "a92ef034-74f8-4e80-a7bb-bd40217ce784",
                                                            "tag": "devices_source",
                                                            "blockType": "documentsSourceAddon",
                                                            "defaultActive": false,
                                                            "children": [],
                                                            "permissions": [
                                                                "Registrant"
                                                            ],
                                                            "onErrorAction": "no-action",
                                                            "filters": [
                                                                {
                                                                    "value": "Approved",
                                                                    "field": "option.status",
                                                                    "type": "not_equal"
                                                                },
                                                                {
                                                                    "value": "device",
                                                                    "field": "type",
                                                                    "type": "equal"
                                                                }
                                                            ],
                                                            "schema": "#ca220a1e-1622-4ef1-ba10-468eff2b97af",
                                                            "dataType": "vc-documents",
                                                            "onlyOwnDocuments": true
                                                        },
                                                        {
                                                            "id": "44f94b84-d19c-4874-adba-e337c63c889c",
                                                            "tag": "devices_source(approved)",
                                                            "blockType": "documentsSourceAddon",
                                                            "defaultActive": false,
                                                            "children": [],
                                                            "permissions": [
                                                                "Registrant"
                                                            ],
                                                            "onErrorAction": "no-action",
                                                            "filters": [
                                                                {
                                                                    "value": "Approved",
                                                                    "field": "option.status",
                                                                    "type": "equal"
                                                                },
                                                                {
                                                                    "value": "device(Approved)",
                                                                    "field": "type",
                                                                    "type": "equal"
                                                                }
                                                            ],
                                                            "dataType": "vc-documents",
                                                            "schema": "#ca220a1e-1622-4ef1-ba10-468eff2b97af",
                                                            "onlyOwnDocuments": true
                                                        }
                                                    ],
                                                    "permissions": [
                                                        "Registrant"
                                                    ],
                                                    "onErrorAction": "no-action",
                                                    "uiMetaData": {
                                                        "fields": [
                                                            {
                                                                "title": "Device Name",
                                                                "name": "document.credentialSubject.0.field4.field0",
                                                                "type": "text"
                                                            },
                                                            {
                                                                "title": "Address",
                                                                "name": "document.credentialSubject.0.field4.field1",
                                                                "type": "text"
                                                            },
                                                            {
                                                                "title": "Longitude",
                                                                "name": "document.credentialSubject.0.field4.field4",
                                                                "type": "text"
                                                            },
                                                            {
                                                                "title": "Latitude",
                                                                "name": "document.credentialSubject.0.field4.field5",
                                                                "type": "text"
                                                            },
                                                            {
                                                                "title": "Capacity (kW)",
                                                                "name": "document.credentialSubject.0.field4.field7",
                                                                "type": "text"
                                                            },
                                                            {
                                                                "title": "Issue Request",
                                                                "name": "option.status",
                                                                "type": "text",
                                                                "bindGroup": "devices_source",
                                                                "width": "150px"
                                                            },
                                                            {
                                                                "title": "Issue Request",
                                                                "name": "",
                                                                "type": "block",
                                                                "action": "",
                                                                "url": "",
                                                                "dialogContent": "",
                                                                "dialogClass": "",
                                                                "dialogType": "",
                                                                "bindBlock": "create_issue_request_form",
                                                                "width": "150px",
                                                                "bindGroup": "devices_source(approved)"
                                                            },
                                                            {
                                                                "name": "document",
                                                                "title": "Document",
                                                                "tooltip": "",
                                                                "type": "button",
                                                                "action": "dialog",
                                                                "content": "View Document",
                                                                "uiClass": "link",
                                                                "dialogContent": "VC",
                                                                "dialogClass": "",
                                                                "dialogType": "json"
                                                            }
                                                        ]
                                                    },
                                                    "dependencies": [
                                                        "create_device",
                                                        "create_issue_request",
                                                        "save_device_status(approved)",
                                                        "save_device_status(reject)"
                                                    ]
                                                },
                                                {
                                                    "id": "9851be69-140e-458a-b9fa-86610abf8944",
                                                    "tag": "new_device",
                                                    "blockType": "interfaceStepBlock",
                                                    "defaultActive": true,
                                                    "children": [
                                                        {
                                                            "id": "86c88ac1-6f89-4e76-9f2b-28ecfb8ae984",
                                                            "tag": "create_device_form",
                                                            "blockType": "requestVcDocumentBlock",
                                                            "defaultActive": true,
                                                            "children": [
                                                                {
                                                                    "id": "9929592e-3661-405e-b194-9f0fc25cbec8",
                                                                    "tag": "current_registrant",
                                                                    "blockType": "documentsSourceAddon",
                                                                    "defaultActive": false,
                                                                    "children": [],
                                                                    "permissions": [
                                                                        "Registrant"
                                                                    ],
                                                                    "onErrorAction": "no-action",
                                                                    "filters": [
                                                                        {
                                                                            "value": "registrant(Approved)",
                                                                            "field": "type",
                                                                            "type": "equal"
                                                                        }
                                                                    ],
                                                                    "onlyOwnDocuments": true,
                                                                    "schema": "#049308d8-d519-427c-bfae-8c77e7671da5",
                                                                    "dataType": "vc-documents"
                                                                }
                                                            ],
                                                            "permissions": [
                                                                "Registrant"
                                                            ],
                                                            "onErrorAction": "no-action",
                                                            "uiMetaData": {
                                                                "type": "dialog",
                                                                "content": "Create New Device",
                                                                "dialogContent": "Device Registration"
                                                            },
                                                            "presetFields": [
                                                                {
                                                                    "name": "field0",
                                                                    "title": "Registrant Id",
                                                                    "value": "id",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field1",
                                                                    "title": "Date",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field2",
                                                                    "title": "Is the Registrant also the owner of the Device? (provide evidence) ",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field3",
                                                                    "title": "Registrant Details",
                                                                    "value": "field2",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field4",
                                                                    "title": "Production Device Details",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field5",
                                                                    "title": "Energy Sources",
                                                                    "readonly": false
                                                                }
                                                            ],
                                                            "idType": "DID",
                                                            "schema": "#ca220a1e-1622-4ef1-ba10-468eff2b97af",
                                                            "preset": true,
                                                            "presetSchema": "#049308d8-d519-427c-bfae-8c77e7671da5"
                                                        },
                                                        {
                                                            "id": "a798348d-7882-4264-81ca-97d37d60aa43",
                                                            "tag": "save_device(hedera)",
                                                            "blockType": "sendToGuardianBlock",
                                                            "defaultActive": false,
                                                            "children": [],
                                                            "permissions": [
                                                                "Registrant"
                                                            ],
                                                            "onErrorAction": "no-action",
                                                            "uiMetaData": {},
                                                            "options": [],
                                                            "dataType": "",
                                                            "topic": "Project",
                                                            "entityType": "device",
                                                            "dataSource": "hedera",
                                                            "documentType": "vc"
                                                        },
                                                        {
                                                            "id": "229e0f65-05c0-4af3-b882-cc0638da7654",
                                                            "tag": "create_device",
                                                            "blockType": "sendToGuardianBlock",
                                                            "defaultActive": false,
                                                            "children": [],
                                                            "permissions": [
                                                                "Registrant"
                                                            ],
                                                            "onErrorAction": "no-action",
                                                            "uiMetaData": {},
                                                            "options": [
                                                                {
                                                                    "name": "status",
                                                                    "value": "Waiting for approval"
                                                                }
                                                            ],
                                                            "entityType": "device",
                                                            "dataType": "",
                                                            "dataSource": "database",
                                                            "documentType": "vc"
                                                        }
                                                    ],
                                                    "permissions": [
                                                        "Registrant"
                                                    ],
                                                    "onErrorAction": "no-action",
                                                    "uiMetaData": {
                                                        "type": "blank"
                                                    },
                                                    "cyclic": true
                                                },
                                                {
                                                    "id": "f28a4529-e402-44e7-9fe6-6c2342babe7e",
                                                    "tag": "new_issue_request",
                                                    "blockType": "interfaceStepBlock",
                                                    "defaultActive": false,
                                                    "children": [
                                                        {
                                                            "id": "76449598-fdef-4b78-8836-ed986e55aa75",
                                                            "tag": "create_issue_request_form",
                                                            "blockType": "requestVcDocumentBlock",
                                                            "defaultActive": true,
                                                            "children": [],
                                                            "permissions": [
                                                                "Registrant"
                                                            ],
                                                            "onErrorAction": "no-action",
                                                            "uiMetaData": {
                                                                "type": "dialog",
                                                                "content": "Create Issue Request",
                                                                "dialogContent": "New Issue Request",
                                                                "buttonClass": "link"
                                                            },
                                                            "presetFields": [
                                                                {
                                                                    "name": "field0",
                                                                    "title": "Registrant Id",
                                                                    "value": "field0",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field1",
                                                                    "title": "Production Device/Production Group Id",
                                                                    "value": "id",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field2",
                                                                    "title": "Registrant Details",
                                                                    "value": "field3",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field3",
                                                                    "title": "Production Device/Production Group",
                                                                    "value": "field4",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field4",
                                                                    "title": "Labelling scheme(s)",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field5",
                                                                    "title": "Last registration date",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field6",
                                                                    "title": "Production Period Start Date",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field7",
                                                                    "title": "Total kWh Produced in this period",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field8",
                                                                    "title": "Production Period End Date",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field9",
                                                                    "title": "Percentage of eligible total applied for",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field10",
                                                                    "title": "Type a: Settlement Metering data",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field11",
                                                                    "title": "Type b: Non-settlement Metering data",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field12",
                                                                    "title": "Type c: Measured Volume Transfer documentation",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field13",
                                                                    "title": "Type d: Other",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field14",
                                                                    "title": "Is the production of this electricity counted towards a national, sub-national or regulatory target?",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field15",
                                                                    "title": "Is any of this production subject to a public consumption obligation?",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field16",
                                                                    "title": "Do you retain the right to obtain emissions reduction certificates or carbon offsets for the energy nominated in this Issue Request?",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field17",
                                                                    "title": "I-REC Participant name",
                                                                    "value": "username",
                                                                    "readonly": false
                                                                },
                                                                {
                                                                    "name": "field18",
                                                                    "title": "Account number",
                                                                    "value": "hederaAccountId",
                                                                    "readonly": false
                                                                }
                                                            ],
                                                            "idType": "UUID",
                                                            "schema": "#fb069289-5bdd-4bba-972a-68b33eca3671",
                                                            "preset": true,
                                                            "presetSchema": "#ca220a1e-1622-4ef1-ba10-468eff2b97af"
                                                        },
                                                        {
                                                            "id": "60c1ae67-5b4d-4c4b-926f-6afd56e5968f",
                                                            "tag": "save_issue(hedera)",
                                                            "blockType": "sendToGuardianBlock",
                                                            "defaultActive": false,
                                                            "children": [],
                                                            "permissions": [
                                                                "Registrant"
                                                            ],
                                                            "onErrorAction": "no-action",
                                                            "uiMetaData": {},
                                                            "options": [],
                                                            "dataType": "",
                                                            "topic": "Project",
                                                            "entityType": "issue_request",
                                                            "dataSource": "hedera",
                                                            "documentType": "vc"
                                                        },
                                                        {
                                                            "id": "38157ad3-c5e8-4e83-a127-5fc463144b5e",
                                                            "tag": "create_issue_request",
                                                            "blockType": "sendToGuardianBlock",
                                                            "defaultActive": false,
                                                            "children": [],
                                                            "permissions": [
                                                                "Registrant"
                                                            ],
                                                            "onErrorAction": "no-action",
                                                            "uiMetaData": {},
                                                            "options": [
                                                                {
                                                                    "name": "status",
                                                                    "value": "Waiting for approval"
                                                                }
                                                            ],
                                                            "dataType": "",
                                                            "entityType": "issue_request",
                                                            "dataSource": "database",
                                                            "documentType": "vc"
                                                        }
                                                    ],
                                                    "permissions": [
                                                        "Registrant"
                                                    ],
                                                    "onErrorAction": "no-action",
                                                    "uiMetaData": {
                                                        "type": "blank"
                                                    },
                                                    "cyclic": true
                                                }
                                            ],
                                            "permissions": [
                                                "Registrant"
                                            ],
                                            "onErrorAction": "no-action",
                                            "uiMetaData": {
                                                "type": "blank",
                                                "title": "Devices"
                                            }
                                        },
                                        {
                                            "id": "5d97928a-7ad0-4d12-8a24-0887d2c462fa",
                                            "tag": "issue_requests_page",
                                            "blockType": "interfaceContainerBlock",
                                            "defaultActive": true,
                                            "children": [
                                                {
                                                    "id": "5842e60f-ffcf-4cde-bb7c-d0a7d564b58b",
                                                    "tag": "issue_requests_grid",
                                                    "blockType": "interfaceDocumentsSourceBlock",
                                                    "defaultActive": true,
                                                    "children": [
                                                        {
                                                            "id": "148d8640-91b6-4453-84a0-88410554e760",
                                                            "tag": "issue_requests_source",
                                                            "blockType": "documentsSourceAddon",
                                                            "defaultActive": false,
                                                            "children": [
                                                                {
                                                                    "id": "de8f42d5-6901-441f-9d6f-f7d10ae9fa0f",
                                                                    "tag": "issue_by_device",
                                                                    "blockType": "filtersAddon",
                                                                    "defaultActive": true,
                                                                    "children": [
                                                                        {
                                                                            "id": "8063ccbb-3328-490f-ae92-fd773e372e08",
                                                                            "tag": "devices_source_from_filters",
                                                                            "blockType": "documentsSourceAddon",
                                                                            "defaultActive": false,
                                                                            "children": [],
                                                                            "permissions": [
                                                                                "Registrant"
                                                                            ],
                                                                            "onErrorAction": "no-action",
                                                                            "filters": [
                                                                                {
                                                                                    "value": "Approved",
                                                                                    "field": "option.status",
                                                                                    "type": "equal"
                                                                                },
                                                                                {
                                                                                    "value": "device",
                                                                                    "field": "type",
                                                                                    "type": "equal"
                                                                                }
                                                                            ],
                                                                            "dataType": "vc-documents",
                                                                            "schema": "#ca220a1e-1622-4ef1-ba10-468eff2b97af",
                                                                            "onlyOwnDocuments": true
                                                                        }
                                                                    ],
                                                                    "permissions": [
                                                                        "Registrant"
                                                                    ],
                                                                    "onErrorAction": "no-action",
                                                                    "uiMetaData": {
                                                                        "options": [],
                                                                        "content": "Device"
                                                                    },
                                                                    "type": "dropdown",
                                                                    "field": "document.credentialSubject.0.ref",
                                                                    "optionName": "document.credentialSubject.0.field3.field0",
                                                                    "optionValue": "document.credentialSubject.0.id"
                                                                }
                                                            ],
                                                            "permissions": [
                                                                "Registrant"
                                                            ],
                                                            "onErrorAction": "no-action",
                                                            "filters": [
                                                                {
                                                                    "value": "issue_request",
                                                                    "field": "type",
                                                                    "type": "equal"
                                                                }
                                                            ],
                                                            "dataType": "vc-documents",
                                                            "schema": "#fb069289-5bdd-4bba-972a-68b33eca3671",
                                                            "onlyOwnDocuments": true
                                                        }
                                                    ],
                                                    "permissions": [
                                                        "Registrant"
                                                    ],
                                                    "onErrorAction": "no-action",
                                                    "uiMetaData": {
                                                        "fields": [
                                                            {
                                                                "title": "Production Period Start Date",
                                                                "name": "document.credentialSubject.0.field6",
                                                                "type": "text"
                                                            },
                                                            {
                                                                "title": "Production Period End Date",
                                                                "name": "document.credentialSubject.0.field8",
                                                                "type": "text"
                                                            },
                                                            {
                                                                "title": "Total kWh Produced in this period",
                                                                "name": "document.credentialSubject.0.field7",
                                                                "type": "text"
                                                            },
                                                            {
                                                                "title": "Date",
                                                                "name": "document.issuanceDate",
                                                                "type": "text"
                                                            },
                                                            {
                                                                "name": "option.status",
                                                                "title": "Status",
                                                                "type": "text"
                                                            },
                                                            {
                                                                "name": "document",
                                                                "title": "Document",
                                                                "tooltip": "",
                                                                "type": "button",
                                                                "action": "dialog",
                                                                "content": "View Document",
                                                                "uiClass": "link",
                                                                "dialogContent": "VC",
                                                                "dialogClass": "",
                                                                "dialogType": "json"
                                                            }
                                                        ]
                                                    },
                                                    "dependencies": [
                                                        "create_issue_request",
                                                        "save_issue_status(minted)",
                                                        "save_issue_status(minting)",
                                                        "save_issue_status(reject)"
                                                    ]
                                                }
                                            ],
                                            "permissions": [
                                                "Registrant"
                                            ],
                                            "onErrorAction": "no-action",
                                            "uiMetaData": {
                                                "type": "blank",
                                                "title": "Issue Requests"
                                            }
                                        },
                                        {
                                            "id": "3da2bbb7-0c4a-4ec9-8c38-b217af2da35b",
                                            "tag": "token_history_page",
                                            "blockType": "interfaceContainerBlock",
                                            "defaultActive": true,
                                            "children": [
                                                {
                                                    "id": "2eaa8a53-0379-4479-a53f-7b397b9b41d8",
                                                    "tag": "token_history_grid",
                                                    "blockType": "interfaceDocumentsSourceBlock",
                                                    "defaultActive": true,
                                                    "children": [
                                                        {
                                                            "id": "a9abb318-30b3-4b53-bd19-292047b0935b",
                                                            "tag": "token_history_source",
                                                            "blockType": "documentsSourceAddon",
                                                            "defaultActive": false,
                                                            "children": [
                                                                {
                                                                    "id": "962714b7-8bb5-4958-841a-6b370cfe1192",
                                                                    "tag": "token_history_source_filter",
                                                                    "blockType": "filtersAddon",
                                                                    "defaultActive": true,
                                                                    "children": [
                                                                        {
                                                                            "id": "8b5a74e6-fb37-432d-9223-e89065dca7e5",
                                                                            "tag": "devices_source_from_filters2",
                                                                            "blockType": "documentsSourceAddon",
                                                                            "defaultActive": false,
                                                                            "children": [],
                                                                            "permissions": [
                                                                                "Registrant"
                                                                            ],
                                                                            "onErrorAction": "no-action",
                                                                            "filters": [
                                                                                {
                                                                                    "value": "Approved",
                                                                                    "field": "option.status",
                                                                                    "type": "equal"
                                                                                },
                                                                                {
                                                                                    "value": "device",
                                                                                    "field": "type",
                                                                                    "type": "equal"
                                                                                }
                                                                            ],
                                                                            "dataType": "vc-documents",
                                                                            "schema": "#ca220a1e-1622-4ef1-ba10-468eff2b97af",
                                                                            "onlyOwnDocuments": true
                                                                        }
                                                                    ],
                                                                    "permissions": [
                                                                        "Registrant"
                                                                    ],
                                                                    "onErrorAction": "no-action",
                                                                    "uiMetaData": {
                                                                        "options": [],
                                                                        "content": "Device"
                                                                    },
                                                                    "type": "dropdown",
                                                                    "optionName": "document.credentialSubject.0.field3.field0",
                                                                    "optionValue": "document.credentialSubject.0.id",
                                                                    "field": "document.verifiableCredential.0.credentialSubject.0.field1"
                                                                }
                                                            ],
                                                            "permissions": [
                                                                "Registrant"
                                                            ],
                                                            "onErrorAction": "no-action",
                                                            "filters": [],
                                                            "dataType": "vp-documents",
                                                            "onlyOwnDocuments": false
                                                        }
                                                    ],
                                                    "permissions": [
                                                        "Registrant"
                                                    ],
                                                    "onErrorAction": "no-action",
                                                    "uiMetaData": {
                                                        "fields": [
                                                            {
                                                                "title": "Date",
                                                                "name": "document.verifiableCredential.1.credentialSubject.0.date",
                                                                "tooltip": "",
                                                                "type": "text"
                                                            },
                                                            {
                                                                "title": "Token Id",
                                                                "name": "document.verifiableCredential.1.credentialSubject.0.tokenId",
                                                                "tooltip": "",
                                                                "type": "text"
                                                            },
                                                            {
                                                                "title": "Serials",
                                                                "name": "document.verifiableCredential.1.credentialSubject.0.serials",
                                                                "tooltip": "",
                                                                "type": "text"
                                                            }
                                                        ]
                                                    }
                                                }
                                            ],
                                            "permissions": [
                                                "Registrant"
                                            ],
                                            "onErrorAction": "no-action",
                                            "uiMetaData": {
                                                "type": "blank",
                                                "title": "Token History"
                                            }
                                        }
                                    ],
                                    "permissions": [
                                        "Registrant"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {
                                        "type": "tabs"
                                    }
                                },
                                {
                                    "id": "ba6926b1-be6d-46a0-8986-c155b9865331",
                                    "tag": "save_application_status(reject)",
                                    "blockType": "sendToGuardianBlock",
                                    "defaultActive": false,
                                    "children": [],
                                    "permissions": [
                                        "Registrant"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {},
                                    "options": [
                                        {
                                            "name": "status",
                                            "value": "Rejected"
                                        }
                                    ],
                                    "dataType": "",
                                    "entityType": "registrant",
                                    "dataSource": "database",
                                    "documentType": "vc"
                                },
                                {
                                    "id": "3941044d-d593-4246-b7f7-20e53057e711",
                                    "tag": "application_rejected",
                                    "blockType": "informationBlock",
                                    "defaultActive": true,
                                    "children": [],
                                    "permissions": [
                                        "Registrant"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {
                                        "title": "Rejected",
                                        "description": "Your application was rejected",
                                        "type": "text"
                                    },
                                    "stopPropagation": true
                                }
                            ],
                            "permissions": [
                                "Registrant"
                            ],
                            "onErrorAction": "no-action",
                            "uiMetaData": {
                                "type": "blank"
                            }
                        }
                    ],
                    "permissions": [
                        "Registrant"
                    ],
                    "onErrorAction": "no-action",
                    "uiMetaData": {
                        "type": "blank"
                    }
                },
                {
                    "id": "550b6cc0-35b5-4e81-bfbb-496ffc78e621",
                    "tag": "evident_workflow",
                    "blockType": "interfaceContainerBlock",
                    "defaultActive": true,
                    "children": [
                        {
                            "id": "d1edace7-9ec6-4bc0-9bf0-acaded28fe10",
                            "tag": "approve_application_page",
                            "blockType": "interfaceContainerBlock",
                            "defaultActive": true,
                            "children": [
                                {
                                    "id": "869280f7-626a-4e5e-8c88-6d2d14ddbc88",
                                    "tag": "registrants_grid",
                                    "blockType": "interfaceDocumentsSourceBlock",
                                    "defaultActive": true,
                                    "children": [
                                        {
                                            "id": "283a4eee-01fe-4501-b6df-33cae2c2fd68",
                                            "tag": "registrants_source(need_approve)",
                                            "blockType": "documentsSourceAddon",
                                            "defaultActive": false,
                                            "children": [],
                                            "permissions": [
                                                "OWNER"
                                            ],
                                            "onErrorAction": "no-action",
                                            "filters": [
                                                {
                                                    "value": "Waiting for approval",
                                                    "field": "option.status",
                                                    "type": "equal"
                                                },
                                                {
                                                    "value": "registrant",
                                                    "field": "type",
                                                    "type": "equal"
                                                }
                                            ],
                                            "dataType": "vc-documents",
                                            "schema": "#049308d8-d519-427c-bfae-8c77e7671da5"
                                        },
                                        {
                                            "id": "c4a0dc23-d30c-44f2-95c1-bb46be8cfedb",
                                            "tag": "registrants_source(approved)",
                                            "blockType": "documentsSourceAddon",
                                            "defaultActive": false,
                                            "children": [],
                                            "permissions": [
                                                "OWNER"
                                            ],
                                            "onErrorAction": "no-action",
                                            "filters": [
                                                {
                                                    "value": "Waiting for approval",
                                                    "field": "option.status",
                                                    "type": "not_equal"
                                                },
                                                {
                                                    "value": "registrant",
                                                    "field": "type",
                                                    "type": "equal"
                                                }
                                            ],
                                            "dataType": "vc-documents",
                                            "schema": "#049308d8-d519-427c-bfae-8c77e7671da5"
                                        }
                                    ],
                                    "permissions": [
                                        "OWNER"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {
                                        "fields": [
                                            {
                                                "title": "Legal Name",
                                                "name": "document.credentialSubject.0.field1.field0",
                                                "type": "text"
                                            },
                                            {
                                                "title": "Organization Name",
                                                "name": "document.credentialSubject.0.field2.field0",
                                                "type": "text"
                                            },
                                            {
                                                "title": "Operation",
                                                "name": "option.status",
                                                "type": "text",
                                                "width": "250px",
                                                "bindGroup": "registrants_source(approved)",
                                                "action": "",
                                                "url": "",
                                                "dialogContent": "",
                                                "dialogClass": "",
                                                "dialogType": "",
                                                "bindBlock": ""
                                            },
                                            {
                                                "title": "Operation",
                                                "name": "option.status",
                                                "tooltip": "",
                                                "type": "block",
                                                "action": "",
                                                "url": "",
                                                "dialogContent": "",
                                                "dialogClass": "",
                                                "dialogType": "",
                                                "bindBlock": "approve_registrant_btn",
                                                "width": "250px",
                                                "bindGroup": "registrants_source(need_approve)"
                                            },
                                            {
                                                "name": "document",
                                                "title": "Document",
                                                "tooltip": "",
                                                "type": "button",
                                                "action": "dialog",
                                                "content": "View Document",
                                                "uiClass": "link",
                                                "dialogContent": "VC",
                                                "dialogClass": "",
                                                "dialogType": "json"
                                            }
                                        ]
                                    },
                                    "dependencies": [
                                        "save_application_status(approve)",
                                        "save_application_status(reject)"
                                    ]
                                },
                                {
                                    "id": "92365a5c-d7bc-4985-b425-cf1340a4f1c7",
                                    "tag": "approve_registrant_btn",
                                    "blockType": "interfaceActionBlock",
                                    "defaultActive": false,
                                    "children": [],
                                    "permissions": [
                                        "OWNER"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {
                                        "options": [
                                            {
                                                "title": "",
                                                "name": "Approve",
                                                "tooltip": "",
                                                "type": "text",
                                                "value": "Approved",
                                                "uiClass": "btn-approve",
                                                "bindBlock": "save_application_status(approve)"
                                            },
                                            {
                                                "title": "",
                                                "name": "Reject",
                                                "tooltip": "",
                                                "type": "text",
                                                "value": "Rejected",
                                                "uiClass": "btn-reject",
                                                "bindBlock": "save_application_status(reject)"
                                            }
                                        ]
                                    },
                                    "type": "selector",
                                    "field": "option.status"
                                }
                            ],
                            "permissions": [
                                "OWNER"
                            ],
                            "onErrorAction": "no-action",
                            "uiMetaData": {
                                "type": "blank",
                                "title": "Applications"
                            }
                        },
                        {
                            "id": "584752e1-d0bb-4b21-b183-3690207bbdb2",
                            "tag": "approve_device_page",
                            "blockType": "interfaceContainerBlock",
                            "defaultActive": true,
                            "children": [
                                {
                                    "id": "888cc08a-9348-41cf-a8fd-365401acf40e",
                                    "tag": "approve_devices_grid",
                                    "blockType": "interfaceDocumentsSourceBlock",
                                    "defaultActive": true,
                                    "children": [
                                        {
                                            "id": "8b0438fd-32e3-4666-bdee-54ec071789d3",
                                            "tag": "approve_devices_source(need_approve)",
                                            "blockType": "documentsSourceAddon",
                                            "defaultActive": false,
                                            "children": [],
                                            "permissions": [
                                                "OWNER"
                                            ],
                                            "onErrorAction": "no-action",
                                            "filters": [
                                                {
                                                    "value": "Waiting for approval",
                                                    "field": "option.status",
                                                    "type": "equal"
                                                },
                                                {
                                                    "value": "device",
                                                    "field": "type",
                                                    "type": "equal"
                                                }
                                            ],
                                            "dataType": "vc-documents",
                                            "schema": "#ca220a1e-1622-4ef1-ba10-468eff2b97af"
                                        },
                                        {
                                            "id": "bda94def-d1ba-4fa1-b03a-7c7035a12df5",
                                            "tag": "approve_devices_source(approved)",
                                            "blockType": "documentsSourceAddon",
                                            "defaultActive": false,
                                            "children": [],
                                            "permissions": [
                                                "OWNER"
                                            ],
                                            "onErrorAction": "no-action",
                                            "filters": [
                                                {
                                                    "value": "Waiting for approval",
                                                    "field": "option.status",
                                                    "type": "not_equal"
                                                },
                                                {
                                                    "value": "device",
                                                    "field": "type",
                                                    "type": "equal"
                                                }
                                            ],
                                            "dataType": "vc-documents",
                                            "schema": "#ca220a1e-1622-4ef1-ba10-468eff2b97af"
                                        }
                                    ],
                                    "permissions": [
                                        "OWNER"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {
                                        "fields": [
                                            {
                                                "title": "Organization Name",
                                                "name": "document.credentialSubject.0.field3.field0",
                                                "type": "text"
                                            },
                                            {
                                                "title": "Device Name",
                                                "name": "document.credentialSubject.0.field4.field0",
                                                "type": "text"
                                            },
                                            {
                                                "title": "Address",
                                                "name": "document.credentialSubject.0.field4.field1",
                                                "type": "text"
                                            },
                                            {
                                                "title": "Longitude",
                                                "name": "document.credentialSubject.0.field4.field4",
                                                "type": "text"
                                            },
                                            {
                                                "title": "Latitude",
                                                "name": "document.credentialSubject.0.field4.field5",
                                                "type": "text"
                                            },
                                            {
                                                "title": "Capacity (kW)",
                                                "name": "document.credentialSubject.0.field4.field7",
                                                "type": "text"
                                            },
                                            {
                                                "name": "option.status",
                                                "title": "Operation",
                                                "type": "text",
                                                "width": "250px",
                                                "bindGroup": "approve_devices_source(approved)",
                                                "action": "",
                                                "url": "",
                                                "dialogContent": "",
                                                "dialogClass": "",
                                                "dialogType": "",
                                                "bindBlock": ""
                                            },
                                            {
                                                "title": "Operation",
                                                "name": "option.status",
                                                "tooltip": "",
                                                "type": "block",
                                                "action": "",
                                                "url": "",
                                                "dialogContent": "",
                                                "dialogClass": "",
                                                "dialogType": "",
                                                "bindBlock": "approve_device_btn",
                                                "width": "250px",
                                                "bindGroup": "approve_devices_source(need_approve)"
                                            },
                                            {
                                                "name": "document",
                                                "title": "Document",
                                                "tooltip": "",
                                                "type": "button",
                                                "action": "dialog",
                                                "content": "View Document",
                                                "uiClass": "link",
                                                "dialogContent": "VC",
                                                "dialogClass": "",
                                                "dialogType": "json"
                                            }
                                        ]
                                    },
                                    "dependencies": [
                                        "create_device",
                                        "save_device_status(approved)",
                                        "save_device_status(reject)"
                                    ]
                                },
                                {
                                    "id": "5404a5bf-32d6-483e-8cce-f3ed344eaab4",
                                    "tag": "approve_device_btn",
                                    "blockType": "interfaceActionBlock",
                                    "defaultActive": false,
                                    "children": [],
                                    "permissions": [
                                        "OWNER"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {
                                        "options": [
                                            {
                                                "title": "",
                                                "name": "Approve",
                                                "tooltip": "",
                                                "type": "text",
                                                "value": "Approved",
                                                "uiClass": "btn-approve",
                                                "bindBlock": "save_device_status(approved)"
                                            },
                                            {
                                                "title": "",
                                                "name": "Reject",
                                                "tooltip": "",
                                                "type": "text",
                                                "value": "Rejected",
                                                "uiClass": "btn-reject",
                                                "bindBlock": "save_device_status(reject)"
                                            }
                                        ]
                                    },
                                    "type": "selector",
                                    "field": "option.status"
                                },
                                {
                                    "id": "0495a898-4ae3-4ee1-bf89-1b7bdec3d11b",
                                    "tag": "save_device_status(approved)",
                                    "blockType": "sendToGuardianBlock",
                                    "defaultActive": false,
                                    "children": [],
                                    "permissions": [
                                        "OWNER"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {},
                                    "options": [
                                        {
                                            "name": "status",
                                            "value": "Approved"
                                        }
                                    ],
                                    "stopPropagation": false,
                                    "dataType": "",
                                    "entityType": "device",
                                    "dataSource": "database",
                                    "documentType": "vc"
                                },
                                {
                                    "id": "038c7fbc-38cc-4bc5-9600-77594723819e",
                                    "tag": "sign_device_by_issuer",
                                    "blockType": "reassigningBlock",
                                    "defaultActive": false,
                                    "children": [],
                                    "permissions": [
                                        "OWNER"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {},
                                    "actor": "",
                                    "issuer": "policyOwner"
                                },
                                {
                                    "id": "9ebf31d2-4ff2-4048-b610-7db47b425e0e",
                                    "tag": "save_copy_device(hedera)",
                                    "blockType": "sendToGuardianBlock",
                                    "defaultActive": false,
                                    "children": [],
                                    "permissions": [
                                        "OWNER"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {},
                                    "options": [],
                                    "dataSource": "hedera",
                                    "documentType": "vc",
                                    "topic": "Project",
                                    "entityType": "device(Approved)",
                                    "topicOwner": "owner"
                                },
                                {
                                    "id": "e0fa120a-48d0-4e29-a5aa-c5645e997ea2",
                                    "tag": "save_copy_device",
                                    "blockType": "sendToGuardianBlock",
                                    "defaultActive": false,
                                    "children": [],
                                    "permissions": [
                                        "OWNER"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {},
                                    "options": [
                                        {
                                            "name": "status",
                                            "value": "Approved"
                                        }
                                    ],
                                    "entityType": "device(Approved)",
                                    "dataType": "",
                                    "stopPropagation": true,
                                    "forceNew": true,
                                    "dataSource": "database",
                                    "documentType": "vc"
                                },
                                {
                                    "id": "0e082400-1b0f-4229-830f-1e03b5767e17",
                                    "tag": "save_device_status(reject)",
                                    "blockType": "sendToGuardianBlock",
                                    "defaultActive": false,
                                    "children": [],
                                    "permissions": [
                                        "OWNER"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {},
                                    "options": [
                                        {
                                            "name": "status",
                                            "value": "Rejected"
                                        }
                                    ],
                                    "stopPropagation": true,
                                    "dataType": "",
                                    "entityType": "device",
                                    "dataSource": "database",
                                    "documentType": "vc"
                                }
                            ],
                            "permissions": [
                                "OWNER"
                            ],
                            "onErrorAction": "no-action",
                            "uiMetaData": {
                                "type": "blank",
                                "title": "Devices"
                            }
                        },
                        {
                            "id": "0df2fd8c-1614-4a07-94b1-870e2638e78d",
                            "tag": "approve_issue_requests_page",
                            "blockType": "interfaceContainerBlock",
                            "defaultActive": true,
                            "children": [
                                {
                                    "id": "5197e08f-0cbe-4ded-a0c0-4657a8ee1c3f",
                                    "tag": "issue_requests_grid(evident)",
                                    "blockType": "interfaceDocumentsSourceBlock",
                                    "defaultActive": true,
                                    "children": [
                                        {
                                            "id": "499c9c18-2375-4a40-a460-92b8d8f92e96",
                                            "tag": "issue_requests_source(need_approve)",
                                            "blockType": "documentsSourceAddon",
                                            "defaultActive": false,
                                            "children": [],
                                            "permissions": [
                                                "OWNER"
                                            ],
                                            "onErrorAction": "no-action",
                                            "filters": [
                                                {
                                                    "value": "Waiting for approval",
                                                    "field": "option.status",
                                                    "type": "equal"
                                                },
                                                {
                                                    "value": "issue_request",
                                                    "field": "type",
                                                    "type": "equal"
                                                }
                                            ],
                                            "dataType": "vc-documents",
                                            "schema": "#fb069289-5bdd-4bba-972a-68b33eca3671"
                                        },
                                        {
                                            "id": "6d352c31-5602-486c-bd35-ef35de6b87ee",
                                            "tag": "issue_requests_source(approved)",
                                            "blockType": "documentsSourceAddon",
                                            "defaultActive": false,
                                            "children": [],
                                            "permissions": [
                                                "OWNER"
                                            ],
                                            "onErrorAction": "no-action",
                                            "filters": [
                                                {
                                                    "value": "Waiting for approval",
                                                    "field": "option.status",
                                                    "type": "not_equal"
                                                },
                                                {
                                                    "value": "issue_request",
                                                    "field": "type",
                                                    "type": "equal"
                                                }
                                            ],
                                            "dataType": "vc-documents",
                                            "schema": "#fb069289-5bdd-4bba-972a-68b33eca3671"
                                        }
                                    ],
                                    "permissions": [
                                        "OWNER"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {
                                        "fields": [
                                            {
                                                "title": "Organization Name",
                                                "name": "document.credentialSubject.0.field2.field0",
                                                "type": "text"
                                            },
                                            {
                                                "title": "Production Period Start Date",
                                                "name": "document.credentialSubject.0.field6",
                                                "type": "text"
                                            },
                                            {
                                                "title": "Production Period End Date",
                                                "name": "document.credentialSubject.0.field8",
                                                "type": "text"
                                            },
                                            {
                                                "title": "Total kWh Produced in this period",
                                                "name": "document.credentialSubject.0.field7",
                                                "type": "text"
                                            },
                                            {
                                                "title": "Date",
                                                "name": "document.issuanceDate",
                                                "type": "text"
                                            },
                                            {
                                                "name": "option.status",
                                                "title": "Operation",
                                                "type": "text",
                                                "width": "250px",
                                                "bindGroup": "issue_requests_source(approved)",
                                                "action": "",
                                                "url": "",
                                                "dialogContent": "",
                                                "dialogClass": "",
                                                "dialogType": "",
                                                "bindBlock": ""
                                            },
                                            {
                                                "title": "Operation",
                                                "name": "option.status",
                                                "tooltip": "",
                                                "type": "block",
                                                "action": "",
                                                "url": "",
                                                "dialogContent": "",
                                                "dialogClass": "",
                                                "dialogType": "",
                                                "bindBlock": "approve_issue_requests_btn",
                                                "width": "250px",
                                                "bindGroup": "issue_requests_source(need_approve)"
                                            },
                                            {
                                                "name": "document",
                                                "title": "Document",
                                                "tooltip": "",
                                                "type": "button",
                                                "action": "dialog",
                                                "content": "View Document",
                                                "uiClass": "link",
                                                "dialogContent": "VC",
                                                "dialogClass": "",
                                                "dialogType": "json"
                                            }
                                        ]
                                    },
                                    "dependencies": [
                                        "create_issue_request",
                                        "save_issue_status(minted)",
                                        "save_issue_status(minting)",
                                        "save_issue_status(reject)"
                                    ]
                                },
                                {
                                    "id": "02f54956-6dd8-4755-aa52-b08674774be9",
                                    "tag": "approve_issue_requests_btn",
                                    "blockType": "interfaceActionBlock",
                                    "defaultActive": false,
                                    "children": [],
                                    "permissions": [
                                        "OWNER"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {
                                        "options": [
                                            {
                                                "title": "",
                                                "name": "Approve",
                                                "tooltip": "",
                                                "type": "text",
                                                "value": "Approved",
                                                "uiClass": "btn-approve",
                                                "bindBlock": "save_issue_status(approved)"
                                            },
                                            {
                                                "title": "",
                                                "name": "Reject",
                                                "tooltip": "",
                                                "type": "text",
                                                "value": "Rejected",
                                                "uiClass": "btn-reject",
                                                "bindBlock": "save_issue_status(reject)"
                                            }
                                        ]
                                    },
                                    "type": "selector",
                                    "field": "option.status"
                                },
                                {
                                    "id": "c272b91f-b2b9-4e52-bd80-c84505d77770",
                                    "tag": "mint_events",
                                    "blockType": "interfaceContainerBlock",
                                    "defaultActive": false,
                                    "children": [
                                        {
                                            "id": "dca3ca61-0c75-4530-be9e-847e5db8c251",
                                            "tag": "save_issue_status(approved)",
                                            "blockType": "sendToGuardianBlock",
                                            "defaultActive": false,
                                            "children": [],
                                            "permissions": [
                                                "OWNER"
                                            ],
                                            "onErrorAction": "no-action",
                                            "uiMetaData": {},
                                            "options": [
                                                {
                                                    "name": "status",
                                                    "value": "Approved"
                                                }
                                            ],
                                            "entityType": "issue_request",
                                            "dataType": "",
                                            "dataSource": "database",
                                            "documentType": "vc"
                                        },
                                        {
                                            "id": "7055730e-0f81-426d-ad3a-032e2d4fc54f",
                                            "tag": "sign_issue_by_issuer",
                                            "blockType": "calculateContainerBlock",
                                            "defaultActive": false,
                                            "children": [],
                                            "permissions": [
                                                "OWNER"
                                            ],
                                            "onErrorAction": "no-action",
                                            "inputFields": [
                                                {
                                                    "name": "field0",
                                                    "title": "Registrant Id",
                                                    "value": "field0"
                                                },
                                                {
                                                    "name": "field1",
                                                    "title": "Production Device/Production Group Id",
                                                    "value": "field1"
                                                },
                                                {
                                                    "name": "field2",
                                                    "title": "Registrant Details",
                                                    "value": "field2"
                                                },
                                                {
                                                    "name": "field3",
                                                    "title": "Production Device/Production Group",
                                                    "value": "field3"
                                                },
                                                {
                                                    "name": "field4",
                                                    "title": "Labelling scheme(s)",
                                                    "value": "field4"
                                                },
                                                {
                                                    "name": "field5",
                                                    "title": "Last registration date",
                                                    "value": "field5"
                                                },
                                                {
                                                    "name": "field6",
                                                    "title": "Production Period Start Date",
                                                    "value": "field6"
                                                },
                                                {
                                                    "name": "field7",
                                                    "title": "Total kWh Produced in this period",
                                                    "value": "field7"
                                                },
                                                {
                                                    "name": "field8",
                                                    "title": "Production Period End Date",
                                                    "value": "field8"
                                                },
                                                {
                                                    "name": "field9",
                                                    "title": "Percentage of eligible total applied for",
                                                    "value": "field9"
                                                },
                                                {
                                                    "name": "field10",
                                                    "title": "Type a: Settlement Metering data",
                                                    "value": "field10"
                                                },
                                                {
                                                    "name": "field11",
                                                    "title": "Type b: Non-settlement Metering data",
                                                    "value": "field11"
                                                },
                                                {
                                                    "name": "field12",
                                                    "title": "Type c: Measured Volume Transfer documentation",
                                                    "value": "field12"
                                                },
                                                {
                                                    "name": "field13",
                                                    "title": "Type d: Other",
                                                    "value": "field13"
                                                },
                                                {
                                                    "name": "field14",
                                                    "title": "Is the production of this electricity counted towards a national, sub-national or regulatory target?",
                                                    "value": "field14"
                                                },
                                                {
                                                    "name": "field15",
                                                    "title": "Is any of this production subject to a public consumption obligation?",
                                                    "value": "field15"
                                                },
                                                {
                                                    "name": "field16",
                                                    "title": "Do you retain the right to obtain emissions reduction certificates or carbon offsets for the energy nominated in this Issue Request?",
                                                    "value": "field16"
                                                },
                                                {
                                                    "name": "field17",
                                                    "title": "I-REC Participant name",
                                                    "value": "field17"
                                                },
                                                {
                                                    "name": "field18",
                                                    "title": "Account number",
                                                    "value": "field18"
                                                }
                                            ],
                                            "outputFields": [
                                                {
                                                    "name": "field0",
                                                    "title": "Registrant Id",
                                                    "value": "field0"
                                                },
                                                {
                                                    "name": "field1",
                                                    "title": "Production Device/Production Group Id",
                                                    "value": "field1"
                                                },
                                                {
                                                    "name": "field2",
                                                    "title": "Registrant Details",
                                                    "value": "field2"
                                                },
                                                {
                                                    "name": "field3",
                                                    "title": "Production Device/Production Group",
                                                    "value": "field3"
                                                },
                                                {
                                                    "name": "field4",
                                                    "title": "Labelling scheme(s)",
                                                    "value": "field4"
                                                },
                                                {
                                                    "name": "field5",
                                                    "title": "Last registration date",
                                                    "value": "field5"
                                                },
                                                {
                                                    "name": "field6",
                                                    "title": "Production Period Start Date",
                                                    "value": "field6"
                                                },
                                                {
                                                    "name": "field7",
                                                    "title": "Total kWh Produced in this period",
                                                    "value": "field7"
                                                },
                                                {
                                                    "name": "field8",
                                                    "title": "Production Period End Date",
                                                    "value": "field8"
                                                },
                                                {
                                                    "name": "field9",
                                                    "title": "Percentage of eligible total applied for",
                                                    "value": "field9"
                                                },
                                                {
                                                    "name": "field10",
                                                    "title": "Type a: Settlement Metering data",
                                                    "value": "field10"
                                                },
                                                {
                                                    "name": "field11",
                                                    "title": "Type b: Non-settlement Metering data",
                                                    "value": "field11"
                                                },
                                                {
                                                    "name": "field12",
                                                    "title": "Type c: Measured Volume Transfer documentation",
                                                    "value": "field12"
                                                },
                                                {
                                                    "name": "field13",
                                                    "title": "Type d: Other",
                                                    "value": "field13"
                                                },
                                                {
                                                    "name": "field14",
                                                    "title": "Is the production of this electricity counted towards a national, sub-national or regulatory target?",
                                                    "value": "field14"
                                                },
                                                {
                                                    "name": "field15",
                                                    "title": "Is any of this production subject to a public consumption obligation?",
                                                    "value": "field15"
                                                },
                                                {
                                                    "name": "field16",
                                                    "title": "Do you retain the right to obtain emissions reduction certificates or carbon offsets for the energy nominated in this Issue Request?",
                                                    "value": "field16"
                                                },
                                                {
                                                    "name": "field17",
                                                    "title": "I-REC Participant name",
                                                    "value": "field17"
                                                },
                                                {
                                                    "name": "field18",
                                                    "title": "Account number",
                                                    "value": "field18"
                                                }
                                            ],
                                            "inputSchema": "#fb069289-5bdd-4bba-972a-68b33eca3671",
                                            "outputSchema": "#fb069289-5bdd-4bba-972a-68b33eca3671"
                                        },
                                        {
                                            "id": "739a2a05-ec36-4b1c-b27e-368219e8dd7f",
                                            "tag": "save_copy_issue(hedera)",
                                            "blockType": "sendToGuardianBlock",
                                            "defaultActive": false,
                                            "children": [],
                                            "permissions": [
                                                "OWNER"
                                            ],
                                            "onErrorAction": "no-action",
                                            "uiMetaData": {},
                                            "options": [],
                                            "dataSource": "hedera",
                                            "documentType": "vc",
                                            "topic": "Project",
                                            "topicOwner": "owner"
                                        },
                                        {
                                            "id": "cad6e6c9-2408-40a8-9c9f-ab19682d8998",
                                            "tag": "save_copy_issue",
                                            "blockType": "sendToGuardianBlock",
                                            "defaultActive": false,
                                            "children": [],
                                            "permissions": [
                                                "OWNER"
                                            ],
                                            "onErrorAction": "no-action",
                                            "uiMetaData": {},
                                            "options": [
                                                {
                                                    "name": "status",
                                                    "value": "Minting"
                                                }
                                            ],
                                            "entityType": "issue_request(Approved)",
                                            "dataType": "",
                                            "forceNew": true,
                                            "dataSource": "database",
                                            "documentType": "vc"
                                        },
                                        {
                                            "id": "6ca507d0-7512-4578-85c5-a85744e8f0ac",
                                            "tag": "mint_token",
                                            "blockType": "mintDocumentBlock",
                                            "defaultActive": false,
                                            "children": [],
                                            "permissions": [
                                                "OWNER"
                                            ],
                                            "onErrorAction": "no-action",
                                            "uiMetaData": {},
                                            "tokenId": "0.0.34804363",
                                            "rule": "field7"
                                        },
                                        {
                                            "id": "14ff06fa-9c76-4468-b873-c59d751b0029",
                                            "tag": "save_issue_status(minted)",
                                            "blockType": "sendToGuardianBlock",
                                            "defaultActive": false,
                                            "children": [],
                                            "permissions": [
                                                "OWNER"
                                            ],
                                            "onErrorAction": "no-action",
                                            "uiMetaData": {},
                                            "options": [
                                                {
                                                    "name": "status",
                                                    "value": "Minted"
                                                }
                                            ],
                                            "entityType": "issue_request(Approved)",
                                            "dataType": "",
                                            "dataSource": "database",
                                            "documentType": "vc"
                                        }
                                    ],
                                    "permissions": [
                                        "OWNER"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {
                                        "type": "blank"
                                    }
                                },
                                {
                                    "id": "54e33f31-76b0-4e7d-ac60-af515c9c22be",
                                    "tag": "save_issue_status(reject)",
                                    "blockType": "sendToGuardianBlock",
                                    "defaultActive": false,
                                    "children": [],
                                    "permissions": [
                                        "OWNER"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {},
                                    "options": [
                                        {
                                            "name": "status",
                                            "value": "Rejected"
                                        }
                                    ],
                                    "entityType": "issue_request",
                                    "dataType": "",
                                    "stopPropagation": true,
                                    "dataSource": "database",
                                    "documentType": "vc"
                                }
                            ],
                            "permissions": [
                                "OWNER"
                            ],
                            "onErrorAction": "no-action",
                            "uiMetaData": {
                                "type": "blank",
                                "title": "Issue Requests"
                            }
                        },
                        {
                            "id": "872d5b8f-a8c6-4e94-a24a-ab3f35762e8c",
                            "tag": "VP",
                            "blockType": "interfaceContainerBlock",
                            "defaultActive": true,
                            "children": [
                                {
                                    "id": "0bdac0af-6539-4395-b365-1e8187580a46",
                                    "tag": "vp_grid",
                                    "blockType": "interfaceDocumentsSourceBlock",
                                    "defaultActive": true,
                                    "children": [
                                        {
                                            "id": "d64e68d9-f396-4817-bc38-89def589f582",
                                            "tag": "vp_source",
                                            "blockType": "documentsSourceAddon",
                                            "defaultActive": false,
                                            "children": [],
                                            "permissions": [
                                                "OWNER"
                                            ],
                                            "onErrorAction": "no-action",
                                            "filters": [],
                                            "dataType": "vp-documents"
                                        }
                                    ],
                                    "permissions": [
                                        "OWNER"
                                    ],
                                    "onErrorAction": "no-action",
                                    "uiMetaData": {
                                        "fields": [
                                            {
                                                "title": "HASH",
                                                "name": "hash",
                                                "tooltip": "",
                                                "type": "text"
                                            },
                                            {
                                                "title": "Date",
                                                "name": "document.verifiableCredential.1.credentialSubject.0.date",
                                                "tooltip": "",
                                                "type": "text"
                                            },
                                            {
                                                "title": "Token Id",
                                                "name": "document.verifiableCredential.1.credentialSubject.0.tokenId",
                                                "tooltip": "",
                                                "type": "text"
                                            },
                                            {
                                                "title": "Serials",
                                                "name": "document.verifiableCredential.1.credentialSubject.0.serials",
                                                "tooltip": "",
                                                "type": "text"
                                            },
                                            {
                                                "title": "TrustChain",
                                                "name": "hash",
                                                "tooltip": "",
                                                "type": "button",
                                                "action": "link",
                                                "url": "",
                                                "dialogContent": "",
                                                "dialogClass": "",
                                                "dialogType": "",
                                                "bindBlock": "trustChainBlock",
                                                "content": "View TrustChain",
                                                "width": "150px"
                                            }
                                        ]
                                    }
                                }
                            ],
                            "permissions": [
                                "OWNER"
                            ],
                            "onErrorAction": "no-action",
                            "uiMetaData": {
                                "type": "blank",
                                "title": "Token History"
                            }
                        },
                        {
                            "id": "837286ed-4931-4245-98b5-2365b2aa1b5f",
                            "tag": "trust_chain",
                            "blockType": "interfaceContainerBlock",
                            "defaultActive": true,
                            "children": [
                                {
                                    "id": "7bc21e88-af74-48d7-8722-859e06dcdc2c",
                                    "tag": "trustChainBlock",
                                    "blockType": "reportBlock",
                                    "defaultActive": true,
                                    "children": [
                                        {
                                            "id": "61cec38a-734e-4dbf-a93f-213be5d3e0a2",
                                            "tag": "MintTokenItem",
                                            "blockType": "reportItemBlock",
                                            "defaultActive": false,
                                            "children": [],
                                            "permissions": [
                                                "OWNER"
                                            ],
                                            "onErrorAction": "no-action",
                                            "filters": [
                                                {
                                                    "type": "equal",
                                                    "typeValue": "variable",
                                                    "field": "document.id",
                                                    "value": "actionId"
                                                }
                                            ],
                                            "variables": [],
                                            "visible": true,
                                            "iconType": "COMMON",
                                            "title": "Token",
                                            "description": "Token[s] minted."
                                        },
                                        {
                                            "id": "191975eb-42b2-4454-97c4-ae6a37d9b62c",
                                            "tag": "issue_report(approved)",
                                            "blockType": "reportItemBlock",
                                            "defaultActive": false,
                                            "children": [],
                                            "permissions": [
                                                "OWNER"
                                            ],
                                            "onErrorAction": "no-action",
                                            "filters": [
                                                {
                                                    "typeValue": "value",
                                                    "field": "type",
                                                    "type": "equal",
                                                    "value": "issue_request(Approved)"
                                                },
                                                {
                                                    "type": "equal",
                                                    "typeValue": "variable",
                                                    "field": "document.id",
                                                    "value": "documentId"
                                                }
                                            ],
                                            "variables": [
                                                {
                                                    "value": "document.credentialSubject.0.id",
                                                    "name": "issueId"
                                                },
                                                {
                                                    "name": "registrantId",
                                                    "value": "document.credentialSubject.0.field0"
                                                },
                                                {
                                                    "name": "deviceId",
                                                    "value": "document.credentialSubject.0.field1"
                                                }
                                            ],
                                            "visible": true,
                                            "iconType": "COMMON",
                                            "title": "Issue Request Review",
                                            "description": "Issue Request processed."
                                        },
                                        {
                                            "id": "6c9d4aca-ee28-4b66-81d0-db6feec7b458",
                                            "tag": "issue_report(submit)",
                                            "blockType": "reportItemBlock",
                                            "defaultActive": false,
                                            "children": [],
                                            "permissions": [
                                                "OWNER"
                                            ],
                                            "onErrorAction": "no-action",
                                            "filters": [
                                                {
                                                    "typeValue": "value",
                                                    "field": "type",
                                                    "type": "equal",
                                                    "value": "issue_request"
                                                },
                                                {
                                                    "type": "equal",
                                                    "typeValue": "variable",
                                                    "field": "document.credentialSubject.0.id",
                                                    "value": "issueId"
                                                }
                                            ],
                                            "variables": [],
                                            "visible": true,
                                            "iconType": "COMMON",
                                            "description": "Registrant submitted Issue Request to Issuer.",
                                            "title": "Issue Request"
                                        },
                                        {
                                            "id": "01d36d6f-da44-416c-87af-82512f920795",
                                            "tag": "device_report(approved)",
                                            "blockType": "reportItemBlock",
                                            "defaultActive": false,
                                            "children": [],
                                            "permissions": [
                                                "OWNER"
                                            ],
                                            "onErrorAction": "no-action",
                                            "filters": [
                                                {
                                                    "typeValue": "value",
                                                    "type": "equal",
                                                    "field": "type",
                                                    "value": "device(Approved)"
                                                },
                                                {
                                                    "field": "document.credentialSubject.0.id",
                                                    "value": "deviceId",
                                                    "type": "equal",
                                                    "typeValue": "variable"
                                                }
                                            ],
                                            "variables": [],
                                            "visible": true,
                                            "iconType": "COMMON",
                                            "description": "Device registration request processed.",
                                            "title": "Device Review"
                                        },
                                        {
                                            "id": "9e404222-5247-4923-9a1e-293fad6619f8",
                                            "tag": "device_report(submit)",
                                            "blockType": "reportItemBlock",
                                            "defaultActive": false,
                                            "children": [],
                                            "permissions": [
                                                "OWNER"
                                            ],
                                            "onErrorAction": "no-action",
                                            "filters": [
                                                {
                                                    "value": "device",
                                                    "field": "type",
                                                    "type": "equal",
                                                    "typeValue": "value"
                                                },
                                                {
                                                    "field": "document.credentialSubject.0.id",
                                                    "value": "deviceId",
                                                    "type": "equal",
                                                    "typeValue": "variable"
                                                }
                                            ],
                                            "variables": [],
                                            "visible": true,
                                            "iconType": "COMMON",
                                            "title": "Device Registration",
                                            "description": "Production Facility/Device registration request submitted to Issuer."
                                        },
                                        {
                                            "id": "9da21b8a-3018-4b91-8b34-b293d9d4ec53",
                                            "tag": "registrant_report(approved)",
                                            "blockType": "reportItemBlock",
                                            "defaultActive": false,
                                            "children": [],
                                            "permissions": [
                                                "OWNER"
                                            ],
                                            "onErrorAction": "no-action",
                                            "filters": [
                                                {
                                                    "type": "equal",
                                                    "typeValue": "value",
                                                    "field": "type",
                                                    "value": "registrant(Approved)"
                                                },
                                                {
                                                    "field": "document.credentialSubject.0.id",
                                                    "value": "registrantId",
                                                    "type": "equal",
                                                    "typeValue": "variable"
                                                }
                                            ],
                                            "variables": [],
                                            "visible": true,
                                            "iconType": "COMMON",
                                            "description": "Application/KYC processed.",
                                            "title": "Application Review"
                                        },
                                        {
                                            "id": "d01cb7b3-1b8f-46ba-9e06-0c34cedfeb2e",
                                            "tag": "registrant_report(submit)",
                                            "blockType": "reportItemBlock",
                                            "defaultActive": false,
                                            "children": [],
                                            "permissions": [
                                                "OWNER"
                                            ],
                                            "onErrorAction": "no-action",
                                            "filters": [
                                                {
                                                    "value": "registrant",
                                                    "field": "type",
                                                    "type": "equal",
                                                    "typeValue": "value"
                                                },
                                                {
                                                    "field": "document.credentialSubject.0.id",
                                                    "value": "registrantId",
                                                    "type": "equal",
                                                    "typeValue": "variable"
                                                }
                                            ],
                                            "variables": [],
                                            "visible": true,
                                            "iconType": "COMMON",
                                            "description": "Application submitted to Issuer.",
                                            "title": "Registrant Application"
                                        }
                                    ],
                                    "permissions": [
                                        "OWNER"
                                    ],
                                    "onErrorAction": "no-action"
                                }
                            ],
                            "permissions": [
                                "OWNER"
                            ],
                            "onErrorAction": "no-action",
                            "uiMetaData": {
                                "type": "blank",
                                "title": "TrustChain"
                            }
                        }
                    ],
                    "permissions": [
                        "OWNER"
                    ],
                    "onErrorAction": "no-action",
                    "uiMetaData": {
                        "type": "tabs"
                    }
                }
            ]
        },
        "status": "DRAFT",
        "creator": "did:hedera:testnet:F9Nhh3jSvVX6sErMuy95WkEr2fqCuWzZFsoq8YWRQdvD;hedera:testnet:tid=0.0.34751333",
        "owner": "did:hedera:testnet:F9Nhh3jSvVX6sErMuy95WkEr2fqCuWzZFsoq8YWRQdvD;hedera:testnet:tid=0.0.34751333",
        "policyRoles": [
            "Registrant"
        ],
        "policyTopics": [
            {
                "name": "Project",
                "description": "Project",
                "type": "any",
                "static": false
            }
        ],
        "registeredUsers": {},
        "topicId": "0.0.34804358",
        "instanceTopicId": "0.0.34251041",
        "policyTag": "Tag_1652463578256",
        "createDate": "2022-05-13T17:40:11.584Z"
    }
}
```
{% endswagger-response %}
{% endswagger %}

#### Publish Policy

{% swagger method="put" path="{policyId}/publish" baseUrl="/policies/" summary="Publishing Policy" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="policyVersion" type="String" required="true" %}
1.0.0
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    "policies": [
        {
            "id": "627e97fb0f12a18fef5f1d61",
            "uuid": "35461391-ddec-4c05-a446-da0c9324d1b2",
            "name": "iRec_2_1650456840748_1652463611568",
            "version": "1.0.0",
            "description": "iRec Description",
            "topicDescription": "iRec Description",
            "config": {
                "blockType": "interfaceContainerBlock",
                "permissions": [
                    "ANY_ROLE"
                ],
                "id": "3909fb19-5181-48cb-91e4-8230c0e83521",
                "onErrorAction": "no-action",
                "uiMetaData": {
                    "type": "blank"
                },
                "children": [
                    {
                        "id": "23f73d24-3482-4cef-9185-3605bb84384e",
                        "tag": "choose_role",
                        "blockType": "policyRolesBlock",
                        "defaultActive": true,
                        "children": [],
                        "permissions": [
                            "NO_ROLE"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {
                            "title": "Registration",
                            "description": "Choose a role"
                        },
                        "roles": [
                            "Registrant"
                        ]
                    },
                    {
                        "id": "a653e179-779f-4b1b-8d3b-986e534329c2",
                        "tag": "registrants_workflow",
                        "blockType": "interfaceContainerBlock",
                        "defaultActive": true,
                        "children": [
                            {
                                "id": "f99af4b5-d80c-4caa-9c7a-8c5e6519e2ee",
                                "tag": "registrants_workflow_steps",
                                "blockType": "interfaceStepBlock",
                                "defaultActive": true,
                                "children": [
                                    {
                                        "id": "8a0cad0d-81d2-499f-be21-b2bea383114a",
                                        "tag": "create_application",
                                        "blockType": "requestVcDocumentBlock",
                                        "defaultActive": true,
                                        "children": [],
                                        "permissions": [
                                            "Registrant"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {
                                            "type": "page",
                                            "title": "Registrant Application"
                                        },
                                        "presetFields": [],
                                        "schema": "#049308d8-d519-427c-bfae-8c77e7671da5&1.0.0",
                                        "idType": "OWNER"
                                    },
                                    {
                                        "id": "665ba2f2-dbda-49a6-9eb8-bbf4bb0315e8",
                                        "tag": "save_application(hedera)",
                                        "blockType": "sendToGuardianBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "Registrant"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {},
                                        "options": [],
                                        "dataType": "",
                                        "entityType": "registrant",
                                        "topic": "Project",
                                        "dataSource": "hedera",
                                        "documentType": "vc",
                                        "topicOwner": "user"
                                    },
                                    {
                                        "id": "0bd2c4a3-29f8-4442-87c6-6c0fea7d423b",
                                        "tag": "create_application(db)",
                                        "blockType": "sendToGuardianBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "Registrant"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {},
                                        "options": [
                                            {
                                                "name": "status",
                                                "value": "Waiting for approval"
                                            }
                                        ],
                                        "dataType": "",
                                        "entityType": "registrant",
                                        "dataSource": "database",
                                        "documentType": "vc"
                                    },
                                    {
                                        "id": "7615c4b3-9f48-4fbf-b100-0d41adab690c",
                                        "tag": "wait_for_approve",
                                        "blockType": "informationBlock",
                                        "defaultActive": true,
                                        "children": [],
                                        "permissions": [
                                            "Registrant"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {
                                            "description": "The page will refresh automatically once the application is approved.",
                                            "type": "text",
                                            "title": "Submitted for Approval"
                                        },
                                        "stopPropagation": true
                                    },
                                    {
                                        "id": "f5068d63-1fcf-43f7-8965-5f6d2957dc24",
                                        "tag": "save_application_status(approve)",
                                        "blockType": "sendToGuardianBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "Registrant"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {},
                                        "options": [
                                            {
                                                "name": "status",
                                                "value": "Approved"
                                            }
                                        ],
                                        "dataType": "",
                                        "entityType": "registrant",
                                        "dataSource": "database",
                                        "documentType": "vc"
                                    },
                                    {
                                        "id": "f82cbe72-6695-42a8-b9de-652ff8e705ae",
                                        "tag": "sign_by_issuer",
                                        "blockType": "reassigningBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "Registrant"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {},
                                        "issuer": "policyOwner",
                                        "actor": "owner"
                                    },
                                    {
                                        "id": "36a45563-6eae-48d7-96c8-0c5db77c02dc",
                                        "tag": "save_copy_application(hedera)",
                                        "blockType": "sendToGuardianBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "Registrant"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {},
                                        "options": [],
                                        "dataSource": "hedera",
                                        "documentType": "vc",
                                        "topic": "Project",
                                        "entityType": "registrant(Approved)",
                                        "topicOwner": "owner"
                                    },
                                    {
                                        "id": "274df982-6e7c-491a-8db6-8eb0e26d3d38",
                                        "tag": "save_copy_application",
                                        "blockType": "sendToGuardianBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "Registrant"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {},
                                        "options": [
                                            {
                                                "name": "status",
                                                "value": "Approved"
                                            }
                                        ],
                                        "dataType": "",
                                        "entityType": "registrant(Approved)",
                                        "forceNew": true,
                                        "dataSource": "database",
                                        "documentType": "vc"
                                    },
                                    {
                                        "id": "f7ef10c9-95de-4d02-9a38-3b08995abe3e",
                                        "tag": "registrants_page",
                                        "blockType": "interfaceContainerBlock",
                                        "defaultActive": true,
                                        "children": [
                                            {
                                                "id": "c4cb948d-654e-467b-94fc-5a4f7eff28c6",
                                                "tag": "devices_page",
                                                "blockType": "interfaceContainerBlock",
                                                "defaultActive": true,
                                                "children": [
                                                    {
                                                        "id": "b3d11e4b-4e5f-457e-9072-661d9e81cd3f",
                                                        "tag": "devices_grid",
                                                        "blockType": "interfaceDocumentsSourceBlock",
                                                        "defaultActive": true,
                                                        "children": [
                                                            {
                                                                "id": "0d03ac0f-a88b-45cb-a0d8-2e61b9b0bcd2",
                                                                "tag": "devices_source",
                                                                "blockType": "documentsSourceAddon",
                                                                "defaultActive": false,
                                                                "children": [],
                                                                "permissions": [
                                                                    "Registrant"
                                                                ],
                                                                "onErrorAction": "no-action",
                                                                "filters": [
                                                                    {
                                                                        "value": "Approved",
                                                                        "field": "option.status",
                                                                        "type": "not_equal"
                                                                    },
                                                                    {
                                                                        "value": "device",
                                                                        "field": "type",
                                                                        "type": "equal"
                                                                    }
                                                                ],
                                                                "schema": "#ca220a1e-1622-4ef1-ba10-468eff2b97af&1.0.0",
                                                                "dataType": "vc-documents",
                                                                "onlyOwnDocuments": true
                                                            },
                                                            {
                                                                "id": "cdc2ebc7-e7cc-4111-a936-cf06c48a0e91",
                                                                "tag": "devices_source(approved)",
                                                                "blockType": "documentsSourceAddon",
                                                                "defaultActive": false,
                                                                "children": [],
                                                                "permissions": [
                                                                    "Registrant"
                                                                ],
                                                                "onErrorAction": "no-action",
                                                                "filters": [
                                                                    {
                                                                        "value": "Approved",
                                                                        "field": "option.status",
                                                                        "type": "equal"
                                                                    },
                                                                    {
                                                                        "value": "device(Approved)",
                                                                        "field": "type",
                                                                        "type": "equal"
                                                                    }
                                                                ],
                                                                "dataType": "vc-documents",
                                                                "schema": "#ca220a1e-1622-4ef1-ba10-468eff2b97af&1.0.0",
                                                                "onlyOwnDocuments": true
                                                            }
                                                        ],
                                                        "permissions": [
                                                            "Registrant"
                                                        ],
                                                        "onErrorAction": "no-action",
                                                        "uiMetaData": {
                                                            "fields": [
                                                                {
                                                                    "title": "Device Name",
                                                                    "name": "document.credentialSubject.0.field4.field0",
                                                                    "type": "text"
                                                                },
                                                                {
                                                                    "title": "Address",
                                                                    "name": "document.credentialSubject.0.field4.field1",
                                                                    "type": "text"
                                                                },
                                                                {
                                                                    "title": "Longitude",
                                                                    "name": "document.credentialSubject.0.field4.field4",
                                                                    "type": "text"
                                                                },
                                                                {
                                                                    "title": "Latitude",
                                                                    "name": "document.credentialSubject.0.field4.field5",
                                                                    "type": "text"
                                                                },
                                                                {
                                                                    "title": "Capacity (kW)",
                                                                    "name": "document.credentialSubject.0.field4.field7",
                                                                    "type": "text"
                                                                },
                                                                {
                                                                    "title": "Issue Request",
                                                                    "name": "option.status",
                                                                    "type": "text",
                                                                    "bindGroup": "devices_source",
                                                                    "width": "150px"
                                                                },
                                                                {
                                                                    "title": "Issue Request",
                                                                    "name": "",
                                                                    "type": "block",
                                                                    "action": "",
                                                                    "url": "",
                                                                    "dialogContent": "",
                                                                    "dialogClass": "",
                                                                    "dialogType": "",
                                                                    "bindBlock": "create_issue_request_form",
                                                                    "width": "150px",
                                                                    "bindGroup": "devices_source(approved)"
                                                                },
                                                                {
                                                                    "name": "document",
                                                                    "title": "Document",
                                                                    "tooltip": "",
                                                                    "type": "button",
                                                                    "action": "dialog",
                                                                    "content": "View Document",
                                                                    "uiClass": "link",
                                                                    "dialogContent": "VC",
                                                                    "dialogClass": "",
                                                                    "dialogType": "json"
                                                                }
                                                            ]
                                                        },
                                                        "dependencies": [
                                                            "create_device",
                                                            "create_issue_request",
                                                            "save_device_status(approved)",
                                                            "save_device_status(reject)"
                                                        ]
                                                    },
                                                    {
                                                        "id": "807061c4-2aad-4fa1-8666-232e735f02cb",
                                                        "tag": "new_device",
                                                        "blockType": "interfaceStepBlock",
                                                        "defaultActive": true,
                                                        "children": [
                                                            {
                                                                "id": "b1551968-23e5-4c1c-8953-53e7867a08ea",
                                                                "tag": "create_device_form",
                                                                "blockType": "requestVcDocumentBlock",
                                                                "defaultActive": true,
                                                                "children": [
                                                                    {
                                                                        "id": "8412cd52-e675-474a-8b40-527e5e5329fd",
                                                                        "tag": "current_registrant",
                                                                        "blockType": "documentsSourceAddon",
                                                                        "defaultActive": false,
                                                                        "children": [],
                                                                        "permissions": [
                                                                            "Registrant"
                                                                        ],
                                                                        "onErrorAction": "no-action",
                                                                        "filters": [
                                                                            {
                                                                                "value": "registrant(Approved)",
                                                                                "field": "type",
                                                                                "type": "equal"
                                                                            }
                                                                        ],
                                                                        "onlyOwnDocuments": true,
                                                                        "schema": "#049308d8-d519-427c-bfae-8c77e7671da5&1.0.0",
                                                                        "dataType": "vc-documents"
                                                                    }
                                                                ],
                                                                "permissions": [
                                                                    "Registrant"
                                                                ],
                                                                "onErrorAction": "no-action",
                                                                "uiMetaData": {
                                                                    "type": "dialog",
                                                                    "content": "Create New Device",
                                                                    "dialogContent": "Device Registration"
                                                                },
                                                                "presetFields": [
                                                                    {
                                                                        "name": "field0",
                                                                        "title": "Registrant Id",
                                                                        "value": "id",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field1",
                                                                        "title": "Date",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field2",
                                                                        "title": "Is the Registrant also the owner of the Device? (provide evidence) ",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field3",
                                                                        "title": "Registrant Details",
                                                                        "value": "field2",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field4",
                                                                        "title": "Production Device Details",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field5",
                                                                        "title": "Energy Sources",
                                                                        "readonly": false
                                                                    }
                                                                ],
                                                                "idType": "DID",
                                                                "schema": "#ca220a1e-1622-4ef1-ba10-468eff2b97af&1.0.0",
                                                                "preset": true,
                                                                "presetSchema": "#049308d8-d519-427c-bfae-8c77e7671da5&1.0.0"
                                                            },
                                                            {
                                                                "id": "af746648-3b74-4400-aba1-473aaf39a52e",
                                                                "tag": "save_device(hedera)",
                                                                "blockType": "sendToGuardianBlock",
                                                                "defaultActive": false,
                                                                "children": [],
                                                                "permissions": [
                                                                    "Registrant"
                                                                ],
                                                                "onErrorAction": "no-action",
                                                                "uiMetaData": {},
                                                                "options": [],
                                                                "dataType": "",
                                                                "topic": "Project",
                                                                "entityType": "device",
                                                                "dataSource": "hedera",
                                                                "documentType": "vc"
                                                            },
                                                            {
                                                                "id": "f0abcf28-f793-4d25-826c-43cec8ba9b57",
                                                                "tag": "create_device",
                                                                "blockType": "sendToGuardianBlock",
                                                                "defaultActive": false,
                                                                "children": [],
                                                                "permissions": [
                                                                    "Registrant"
                                                                ],
                                                                "onErrorAction": "no-action",
                                                                "uiMetaData": {},
                                                                "options": [
                                                                    {
                                                                        "name": "status",
                                                                        "value": "Waiting for approval"
                                                                    }
                                                                ],
                                                                "entityType": "device",
                                                                "dataType": "",
                                                                "dataSource": "database",
                                                                "documentType": "vc"
                                                            }
                                                        ],
                                                        "permissions": [
                                                            "Registrant"
                                                        ],
                                                        "onErrorAction": "no-action",
                                                        "uiMetaData": {
                                                            "type": "blank"
                                                        },
                                                        "cyclic": true
                                                    },
                                                    {
                                                        "id": "cdb3d064-7174-4fff-bd3d-054c8e651649",
                                                        "tag": "new_issue_request",
                                                        "blockType": "interfaceStepBlock",
                                                        "defaultActive": false,
                                                        "children": [
                                                            {
                                                                "id": "924d5826-77fc-41c8-b308-fe1813ad3544",
                                                                "tag": "create_issue_request_form",
                                                                "blockType": "requestVcDocumentBlock",
                                                                "defaultActive": true,
                                                                "children": [],
                                                                "permissions": [
                                                                    "Registrant"
                                                                ],
                                                                "onErrorAction": "no-action",
                                                                "uiMetaData": {
                                                                    "type": "dialog",
                                                                    "content": "Create Issue Request",
                                                                    "dialogContent": "New Issue Request",
                                                                    "buttonClass": "link"
                                                                },
                                                                "presetFields": [
                                                                    {
                                                                        "name": "field0",
                                                                        "title": "Registrant Id",
                                                                        "value": "field0",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field1",
                                                                        "title": "Production Device/Production Group Id",
                                                                        "value": "id",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field2",
                                                                        "title": "Registrant Details",
                                                                        "value": "field3",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field3",
                                                                        "title": "Production Device/Production Group",
                                                                        "value": "field4",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field4",
                                                                        "title": "Labelling scheme(s)",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field5",
                                                                        "title": "Last registration date",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field6",
                                                                        "title": "Production Period Start Date",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field7",
                                                                        "title": "Total kWh Produced in this period",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field8",
                                                                        "title": "Production Period End Date",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field9",
                                                                        "title": "Percentage of eligible total applied for",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field10",
                                                                        "title": "Type a: Settlement Metering data",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field11",
                                                                        "title": "Type b: Non-settlement Metering data",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field12",
                                                                        "title": "Type c: Measured Volume Transfer documentation",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field13",
                                                                        "title": "Type d: Other",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field14",
                                                                        "title": "Is the production of this electricity counted towards a national, sub-national or regulatory target?",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field15",
                                                                        "title": "Is any of this production subject to a public consumption obligation?",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field16",
                                                                        "title": "Do you retain the right to obtain emissions reduction certificates or carbon offsets for the energy nominated in this Issue Request?",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field17",
                                                                        "title": "I-REC Participant name",
                                                                        "value": "username",
                                                                        "readonly": false
                                                                    },
                                                                    {
                                                                        "name": "field18",
                                                                        "title": "Account number",
                                                                        "value": "hederaAccountId",
                                                                        "readonly": false
                                                                    }
                                                                ],
                                                                "idType": "UUID",
                                                                "schema": "#fb069289-5bdd-4bba-972a-68b33eca3671&1.0.0",
                                                                "preset": true,
                                                                "presetSchema": "#ca220a1e-1622-4ef1-ba10-468eff2b97af&1.0.0"
                                                            },
                                                            {
                                                                "id": "63aa0736-9fa7-4892-823a-4ccb9aacaf7d",
                                                                "tag": "save_issue(hedera)",
                                                                "blockType": "sendToGuardianBlock",
                                                                "defaultActive": false,
                                                                "children": [],
                                                                "permissions": [
                                                                    "Registrant"
                                                                ],
                                                                "onErrorAction": "no-action",
                                                                "uiMetaData": {},
                                                                "options": [],
                                                                "dataType": "",
                                                                "topic": "Project",
                                                                "entityType": "issue_request",
                                                                "dataSource": "hedera",
                                                                "documentType": "vc"
                                                            },
                                                            {
                                                                "id": "1be4a600-f9b4-47e8-9182-cf4cdde0ff29",
                                                                "tag": "create_issue_request",
                                                                "blockType": "sendToGuardianBlock",
                                                                "defaultActive": false,
                                                                "children": [],
                                                                "permissions": [
                                                                    "Registrant"
                                                                ],
                                                                "onErrorAction": "no-action",
                                                                "uiMetaData": {},
                                                                "options": [
                                                                    {
                                                                        "name": "status",
                                                                        "value": "Waiting for approval"
                                                                    }
                                                                ],
                                                                "dataType": "",
                                                                "entityType": "issue_request",
                                                                "dataSource": "database",
                                                                "documentType": "vc"
                                                            }
                                                        ],
                                                        "permissions": [
                                                            "Registrant"
                                                        ],
                                                        "onErrorAction": "no-action",
                                                        "uiMetaData": {
                                                            "type": "blank"
                                                        },
                                                        "cyclic": true
                                                    }
                                                ],
                                                "permissions": [
                                                    "Registrant"
                                                ],
                                                "onErrorAction": "no-action",
                                                "uiMetaData": {
                                                    "type": "blank",
                                                    "title": "Devices"
                                                }
                                            },
                                            {
                                                "id": "f47ff7fb-5ab6-4922-8f0b-54a0751bdf23",
                                                "tag": "issue_requests_page",
                                                "blockType": "interfaceContainerBlock",
                                                "defaultActive": true,
                                                "children": [
                                                    {
                                                        "id": "f4a20723-df41-4855-a42f-c5da58468430",
                                                        "tag": "issue_requests_grid",
                                                        "blockType": "interfaceDocumentsSourceBlock",
                                                        "defaultActive": true,
                                                        "children": [
                                                            {
                                                                "id": "890abca7-faec-48fc-8180-ca7f9c9c86af",
                                                                "tag": "issue_requests_source",
                                                                "blockType": "documentsSourceAddon",
                                                                "defaultActive": false,
                                                                "children": [
                                                                    {
                                                                        "id": "f178fae2-5301-41f6-90ef-1064fa6ed0d8",
                                                                        "tag": "issue_by_device",
                                                                        "blockType": "filtersAddon",
                                                                        "defaultActive": true,
                                                                        "children": [
                                                                            {
                                                                                "id": "ad49b2e1-b70d-428e-bb60-035dd73ebb5c",
                                                                                "tag": "devices_source_from_filters",
                                                                                "blockType": "documentsSourceAddon",
                                                                                "defaultActive": false,
                                                                                "children": [],
                                                                                "permissions": [
                                                                                    "Registrant"
                                                                                ],
                                                                                "onErrorAction": "no-action",
                                                                                "filters": [
                                                                                    {
                                                                                        "value": "Approved",
                                                                                        "field": "option.status",
                                                                                        "type": "equal"
                                                                                    },
                                                                                    {
                                                                                        "value": "device",
                                                                                        "field": "type",
                                                                                        "type": "equal"
                                                                                    }
                                                                                ],
                                                                                "dataType": "vc-documents",
                                                                                "schema": "#ca220a1e-1622-4ef1-ba10-468eff2b97af&1.0.0",
                                                                                "onlyOwnDocuments": true
                                                                            }
                                                                        ],
                                                                        "permissions": [
                                                                            "Registrant"
                                                                        ],
                                                                        "onErrorAction": "no-action",
                                                                        "uiMetaData": {
                                                                            "options": [],
                                                                            "content": "Device"
                                                                        },
                                                                        "type": "dropdown",
                                                                        "field": "document.credentialSubject.0.ref",
                                                                        "optionName": "document.credentialSubject.0.field3.field0",
                                                                        "optionValue": "document.credentialSubject.0.id"
                                                                    }
                                                                ],
                                                                "permissions": [
                                                                    "Registrant"
                                                                ],
                                                                "onErrorAction": "no-action",
                                                                "filters": [
                                                                    {
                                                                        "value": "issue_request",
                                                                        "field": "type",
                                                                        "type": "equal"
                                                                    }
                                                                ],
                                                                "dataType": "vc-documents",
                                                                "schema": "#fb069289-5bdd-4bba-972a-68b33eca3671&1.0.0",
                                                                "onlyOwnDocuments": true
                                                            }
                                                        ],
                                                        "permissions": [
                                                            "Registrant"
                                                        ],
                                                        "onErrorAction": "no-action",
                                                        "uiMetaData": {
                                                            "fields": [
                                                                {
                                                                    "title": "Production Period Start Date",
                                                                    "name": "document.credentialSubject.0.field6",
                                                                    "type": "text"
                                                                },
                                                                {
                                                                    "title": "Production Period End Date",
                                                                    "name": "document.credentialSubject.0.field8",
                                                                    "type": "text"
                                                                },
                                                                {
                                                                    "title": "Total kWh Produced in this period",
                                                                    "name": "document.credentialSubject.0.field7",
                                                                    "type": "text"
                                                                },
                                                                {
                                                                    "title": "Date",
                                                                    "name": "document.issuanceDate",
                                                                    "type": "text"
                                                                },
                                                                {
                                                                    "name": "option.status",
                                                                    "title": "Status",
                                                                    "type": "text"
                                                                },
                                                                {
                                                                    "name": "document",
                                                                    "title": "Document",
                                                                    "tooltip": "",
                                                                    "type": "button",
                                                                    "action": "dialog",
                                                                    "content": "View Document",
                                                                    "uiClass": "link",
                                                                    "dialogContent": "VC",
                                                                    "dialogClass": "",
                                                                    "dialogType": "json"
                                                                }
                                                            ]
                                                        },
                                                        "dependencies": [
                                                            "create_issue_request",
                                                            "save_issue_status(minted)",
                                                            "save_issue_status(minting)",
                                                            "save_issue_status(reject)"
                                                        ]
                                                    }
                                                ],
                                                "permissions": [
                                                    "Registrant"
                                                ],
                                                "onErrorAction": "no-action",
                                                "uiMetaData": {
                                                    "type": "blank",
                                                    "title": "Issue Requests"
                                                }
                                            },
                                            {
                                                "id": "acf62e74-b3f3-4828-8e35-f7c745294572",
                                                "tag": "token_history_page",
                                                "blockType": "interfaceContainerBlock",
                                                "defaultActive": true,
                                                "children": [
                                                    {
                                                        "id": "1f0869b8-ea2b-437c-9ac9-fa4dc755874b",
                                                        "tag": "token_history_grid",
                                                        "blockType": "interfaceDocumentsSourceBlock",
                                                        "defaultActive": true,
                                                        "children": [
                                                            {
                                                                "id": "bbc1e89e-1ef2-4c89-9bf8-7737bae0862d",
                                                                "tag": "token_history_source",
                                                                "blockType": "documentsSourceAddon",
                                                                "defaultActive": false,
                                                                "children": [
                                                                    {
                                                                        "id": "13c9ed2c-0a61-43ed-a72e-e1d008d03673",
                                                                        "tag": "token_history_source_filter",
                                                                        "blockType": "filtersAddon",
                                                                        "defaultActive": true,
                                                                        "children": [
                                                                            {
                                                                                "id": "148d53d1-cd0c-44da-ac71-ba6cbac5cece",
                                                                                "tag": "devices_source_from_filters2",
                                                                                "blockType": "documentsSourceAddon",
                                                                                "defaultActive": false,
                                                                                "children": [],
                                                                                "permissions": [
                                                                                    "Registrant"
                                                                                ],
                                                                                "onErrorAction": "no-action",
                                                                                "filters": [
                                                                                    {
                                                                                        "value": "Approved",
                                                                                        "field": "option.status",
                                                                                        "type": "equal"
                                                                                    },
                                                                                    {
                                                                                        "value": "device",
                                                                                        "field": "type",
                                                                                        "type": "equal"
                                                                                    }
                                                                                ],
                                                                                "dataType": "vc-documents",
                                                                                "schema": "#ca220a1e-1622-4ef1-ba10-468eff2b97af&1.0.0",
                                                                                "onlyOwnDocuments": true
                                                                            }
                                                                        ],
                                                                        "permissions": [
                                                                            "Registrant"
                                                                        ],
                                                                        "onErrorAction": "no-action",
                                                                        "uiMetaData": {
                                                                            "options": [],
                                                                            "content": "Device"
                                                                        },
                                                                        "type": "dropdown",
                                                                        "optionName": "document.credentialSubject.0.field3.field0",
                                                                        "optionValue": "document.credentialSubject.0.id",
                                                                        "field": "document.verifiableCredential.0.credentialSubject.0.field1"
                                                                    }
                                                                ],
                                                                "permissions": [
                                                                    "Registrant"
                                                                ],
                                                                "onErrorAction": "no-action",
                                                                "filters": [],
                                                                "dataType": "vp-documents",
                                                                "onlyOwnDocuments": false
                                                            }
                                                        ],
                                                        "permissions": [
                                                            "Registrant"
                                                        ],
                                                        "onErrorAction": "no-action",
                                                        "uiMetaData": {
                                                            "fields": [
                                                                {
                                                                    "title": "Date",
                                                                    "name": "document.verifiableCredential.1.credentialSubject.0.date",
                                                                    "tooltip": "",
                                                                    "type": "text"
                                                                },
                                                                {
                                                                    "title": "Token Id",
                                                                    "name": "document.verifiableCredential.1.credentialSubject.0.tokenId",
                                                                    "tooltip": "",
                                                                    "type": "text"
                                                                },
                                                                {
                                                                    "title": "Serials",
                                                                    "name": "document.verifiableCredential.1.credentialSubject.0.serials",
                                                                    "tooltip": "",
                                                                    "type": "text"
                                                                }
                                                            ]
                                                        }
                                                    }
                                                ],
                                                "permissions": [
                                                    "Registrant"
                                                ],
                                                "onErrorAction": "no-action",
                                                "uiMetaData": {
                                                    "type": "blank",
                                                    "title": "Token History"
                                                }
                                            }
                                        ],
                                        "permissions": [
                                            "Registrant"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {
                                            "type": "tabs"
                                        }
                                    },
                                    {
                                        "id": "4f1d3a20-4a19-4957-89d3-0e5847fa867d",
                                        "tag": "save_application_status(reject)",
                                        "blockType": "sendToGuardianBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "Registrant"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {},
                                        "options": [
                                            {
                                                "name": "status",
                                                "value": "Rejected"
                                            }
                                        ],
                                        "dataType": "",
                                        "entityType": "registrant",
                                        "dataSource": "database",
                                        "documentType": "vc"
                                    },
                                    {
                                        "id": "0b71ab18-c5e0-409c-88cc-c92f42bbe31e",
                                        "tag": "application_rejected",
                                        "blockType": "informationBlock",
                                        "defaultActive": true,
                                        "children": [],
                                        "permissions": [
                                            "Registrant"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {
                                            "title": "Rejected",
                                            "description": "Your application was rejected",
                                            "type": "text"
                                        },
                                        "stopPropagation": true
                                    }
                                ],
                                "permissions": [
                                    "Registrant"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {
                                    "type": "blank"
                                }
                            }
                        ],
                        "permissions": [
                            "Registrant"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {
                            "type": "blank"
                        }
                    },
                    {
                        "id": "dde28c1a-d2ac-488c-8930-fffdc4633409",
                        "tag": "evident_workflow",
                        "blockType": "interfaceContainerBlock",
                        "defaultActive": true,
                        "children": [
                            {
                                "id": "551a0f55-5b24-4e09-9ea7-8a7667356b34",
                                "tag": "approve_application_page",
                                "blockType": "interfaceContainerBlock",
                                "defaultActive": true,
                                "children": [
                                    {
                                        "id": "f5b2c737-001f-4c91-85e1-f73fc5c5f504",
                                        "tag": "registrants_grid",
                                        "blockType": "interfaceDocumentsSourceBlock",
                                        "defaultActive": true,
                                        "children": [
                                            {
                                                "id": "33295f2e-387b-4692-82e7-c396be00e349",
                                                "tag": "registrants_source(need_approve)",
                                                "blockType": "documentsSourceAddon",
                                                "defaultActive": false,
                                                "children": [],
                                                "permissions": [
                                                    "OWNER"
                                                ],
                                                "onErrorAction": "no-action",
                                                "filters": [
                                                    {
                                                        "value": "Waiting for approval",
                                                        "field": "option.status",
                                                        "type": "equal"
                                                    },
                                                    {
                                                        "value": "registrant",
                                                        "field": "type",
                                                        "type": "equal"
                                                    }
                                                ],
                                                "dataType": "vc-documents",
                                                "schema": "#049308d8-d519-427c-bfae-8c77e7671da5&1.0.0"
                                            },
                                            {
                                                "id": "55809fd0-61b4-4f61-aeab-b55b87e4c61c",
                                                "tag": "registrants_source(approved)",
                                                "blockType": "documentsSourceAddon",
                                                "defaultActive": false,
                                                "children": [],
                                                "permissions": [
                                                    "OWNER"
                                                ],
                                                "onErrorAction": "no-action",
                                                "filters": [
                                                    {
                                                        "value": "Waiting for approval",
                                                        "field": "option.status",
                                                        "type": "not_equal"
                                                    },
                                                    {
                                                        "value": "registrant",
                                                        "field": "type",
                                                        "type": "equal"
                                                    }
                                                ],
                                                "dataType": "vc-documents",
                                                "schema": "#049308d8-d519-427c-bfae-8c77e7671da5&1.0.0"
                                            }
                                        ],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {
                                            "fields": [
                                                {
                                                    "title": "Legal Name",
                                                    "name": "document.credentialSubject.0.field1.field0",
                                                    "type": "text"
                                                },
                                                {
                                                    "title": "Organization Name",
                                                    "name": "document.credentialSubject.0.field2.field0",
                                                    "type": "text"
                                                },
                                                {
                                                    "title": "Operation",
                                                    "name": "option.status",
                                                    "type": "text",
                                                    "width": "250px",
                                                    "bindGroup": "registrants_source(approved)",
                                                    "action": "",
                                                    "url": "",
                                                    "dialogContent": "",
                                                    "dialogClass": "",
                                                    "dialogType": "",
                                                    "bindBlock": ""
                                                },
                                                {
                                                    "title": "Operation",
                                                    "name": "option.status",
                                                    "tooltip": "",
                                                    "type": "block",
                                                    "action": "",
                                                    "url": "",
                                                    "dialogContent": "",
                                                    "dialogClass": "",
                                                    "dialogType": "",
                                                    "bindBlock": "approve_registrant_btn",
                                                    "width": "250px",
                                                    "bindGroup": "registrants_source(need_approve)"
                                                },
                                                {
                                                    "name": "document",
                                                    "title": "Document",
                                                    "tooltip": "",
                                                    "type": "button",
                                                    "action": "dialog",
                                                    "content": "View Document",
                                                    "uiClass": "link",
                                                    "dialogContent": "VC",
                                                    "dialogClass": "",
                                                    "dialogType": "json"
                                                }
                                            ]
                                        },
                                        "dependencies": [
                                            "save_application_status(approve)",
                                            "save_application_status(reject)"
                                        ]
                                    },
                                    {
                                        "id": "29ad0986-0b78-46ac-9b20-21327b64b5f8",
                                        "tag": "approve_registrant_btn",
                                        "blockType": "interfaceActionBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {
                                            "options": [
                                                {
                                                    "title": "",
                                                    "name": "Approve",
                                                    "tooltip": "",
                                                    "type": "text",
                                                    "value": "Approved",
                                                    "uiClass": "btn-approve",
                                                    "bindBlock": "save_application_status(approve)"
                                                },
                                                {
                                                    "title": "",
                                                    "name": "Reject",
                                                    "tooltip": "",
                                                    "type": "text",
                                                    "value": "Rejected",
                                                    "uiClass": "btn-reject",
                                                    "bindBlock": "save_application_status(reject)"
                                                }
                                            ]
                                        },
                                        "type": "selector",
                                        "field": "option.status"
                                    }
                                ],
                                "permissions": [
                                    "OWNER"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {
                                    "type": "blank",
                                    "title": "Applications"
                                }
                            },
                            {
                                "id": "b839fbf9-8242-42f1-bbf6-09af70186715",
                                "tag": "approve_device_page",
                                "blockType": "interfaceContainerBlock",
                                "defaultActive": true,
                                "children": [
                                    {
                                        "id": "0caad883-3411-4d09-b924-ad3b348c9901",
                                        "tag": "approve_devices_grid",
                                        "blockType": "interfaceDocumentsSourceBlock",
                                        "defaultActive": true,
                                        "children": [
                                            {
                                                "id": "97ca41de-29a7-4e8d-abec-eb251273c4c2",
                                                "tag": "approve_devices_source(need_approve)",
                                                "blockType": "documentsSourceAddon",
                                                "defaultActive": false,
                                                "children": [],
                                                "permissions": [
                                                    "OWNER"
                                                ],
                                                "onErrorAction": "no-action",
                                                "filters": [
                                                    {
                                                        "value": "Waiting for approval",
                                                        "field": "option.status",
                                                        "type": "equal"
                                                    },
                                                    {
                                                        "value": "device",
                                                        "field": "type",
                                                        "type": "equal"
                                                    }
                                                ],
                                                "dataType": "vc-documents",
                                                "schema": "#ca220a1e-1622-4ef1-ba10-468eff2b97af&1.0.0"
                                            },
                                            {
                                                "id": "c557a726-8ad4-494d-b6be-920446bbb252",
                                                "tag": "approve_devices_source(approved)",
                                                "blockType": "documentsSourceAddon",
                                                "defaultActive": false,
                                                "children": [],
                                                "permissions": [
                                                    "OWNER"
                                                ],
                                                "onErrorAction": "no-action",
                                                "filters": [
                                                    {
                                                        "value": "Waiting for approval",
                                                        "field": "option.status",
                                                        "type": "not_equal"
                                                    },
                                                    {
                                                        "value": "device",
                                                        "field": "type",
                                                        "type": "equal"
                                                    }
                                                ],
                                                "dataType": "vc-documents",
                                                "schema": "#ca220a1e-1622-4ef1-ba10-468eff2b97af&1.0.0"
                                            }
                                        ],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {
                                            "fields": [
                                                {
                                                    "title": "Organization Name",
                                                    "name": "document.credentialSubject.0.field3.field0",
                                                    "type": "text"
                                                },
                                                {
                                                    "title": "Device Name",
                                                    "name": "document.credentialSubject.0.field4.field0",
                                                    "type": "text"
                                                },
                                                {
                                                    "title": "Address",
                                                    "name": "document.credentialSubject.0.field4.field1",
                                                    "type": "text"
                                                },
                                                {
                                                    "title": "Longitude",
                                                    "name": "document.credentialSubject.0.field4.field4",
                                                    "type": "text"
                                                },
                                                {
                                                    "title": "Latitude",
                                                    "name": "document.credentialSubject.0.field4.field5",
                                                    "type": "text"
                                                },
                                                {
                                                    "title": "Capacity (kW)",
                                                    "name": "document.credentialSubject.0.field4.field7",
                                                    "type": "text"
                                                },
                                                {
                                                    "name": "option.status",
                                                    "title": "Operation",
                                                    "type": "text",
                                                    "width": "250px",
                                                    "bindGroup": "approve_devices_source(approved)",
                                                    "action": "",
                                                    "url": "",
                                                    "dialogContent": "",
                                                    "dialogClass": "",
                                                    "dialogType": "",
                                                    "bindBlock": ""
                                                },
                                                {
                                                    "title": "Operation",
                                                    "name": "option.status",
                                                    "tooltip": "",
                                                    "type": "block",
                                                    "action": "",
                                                    "url": "",
                                                    "dialogContent": "",
                                                    "dialogClass": "",
                                                    "dialogType": "",
                                                    "bindBlock": "approve_device_btn",
                                                    "width": "250px",
                                                    "bindGroup": "approve_devices_source(need_approve)"
                                                },
                                                {
                                                    "name": "document",
                                                    "title": "Document",
                                                    "tooltip": "",
                                                    "type": "button",
                                                    "action": "dialog",
                                                    "content": "View Document",
                                                    "uiClass": "link",
                                                    "dialogContent": "VC",
                                                    "dialogClass": "",
                                                    "dialogType": "json"
                                                }
                                            ]
                                        },
                                        "dependencies": [
                                            "create_device",
                                            "save_device_status(approved)",
                                            "save_device_status(reject)"
                                        ]
                                    },
                                    {
                                        "id": "97314ec6-efa0-4aa4-8888-4ad1c00bf290",
                                        "tag": "approve_device_btn",
                                        "blockType": "interfaceActionBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {
                                            "options": [
                                                {
                                                    "title": "",
                                                    "name": "Approve",
                                                    "tooltip": "",
                                                    "type": "text",
                                                    "value": "Approved",
                                                    "uiClass": "btn-approve",
                                                    "bindBlock": "save_device_status(approved)"
                                                },
                                                {
                                                    "title": "",
                                                    "name": "Reject",
                                                    "tooltip": "",
                                                    "type": "text",
                                                    "value": "Rejected",
                                                    "uiClass": "btn-reject",
                                                    "bindBlock": "save_device_status(reject)"
                                                }
                                            ]
                                        },
                                        "type": "selector",
                                        "field": "option.status"
                                    },
                                    {
                                        "id": "2ce44de5-17c7-44fa-881b-daf3c72629f8",
                                        "tag": "save_device_status(approved)",
                                        "blockType": "sendToGuardianBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {},
                                        "options": [
                                            {
                                                "name": "status",
                                                "value": "Approved"
                                            }
                                        ],
                                        "stopPropagation": false,
                                        "dataType": "",
                                        "entityType": "device",
                                        "dataSource": "database",
                                        "documentType": "vc"
                                    },
                                    {
                                        "id": "2f3dced4-04f9-49fb-81b8-ada92064dcae",
                                        "tag": "sign_device_by_issuer",
                                        "blockType": "reassigningBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {},
                                        "actor": "",
                                        "issuer": "policyOwner"
                                    },
                                    {
                                        "id": "242d938f-4d8d-4b7b-9bf7-1b71d45e4a18",
                                        "tag": "save_copy_device(hedera)",
                                        "blockType": "sendToGuardianBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {},
                                        "options": [],
                                        "dataSource": "hedera",
                                        "documentType": "vc",
                                        "topic": "Project",
                                        "entityType": "device(Approved)",
                                        "topicOwner": "owner"
                                    },
                                    {
                                        "id": "35610541-14f8-49bf-9aec-a6b8a3f59c3d",
                                        "tag": "save_copy_device",
                                        "blockType": "sendToGuardianBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {},
                                        "options": [
                                            {
                                                "name": "status",
                                                "value": "Approved"
                                            }
                                        ],
                                        "entityType": "device(Approved)",
                                        "dataType": "",
                                        "stopPropagation": true,
                                        "forceNew": true,
                                        "dataSource": "database",
                                        "documentType": "vc"
                                    },
                                    {
                                        "id": "b57e1090-c13e-4cd7-ba31-ad375ffd1494",
                                        "tag": "save_device_status(reject)",
                                        "blockType": "sendToGuardianBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {},
                                        "options": [
                                            {
                                                "name": "status",
                                                "value": "Rejected"
                                            }
                                        ],
                                        "stopPropagation": true,
                                        "dataType": "",
                                        "entityType": "device",
                                        "dataSource": "database",
                                        "documentType": "vc"
                                    }
                                ],
                                "permissions": [
                                    "OWNER"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {
                                    "type": "blank",
                                    "title": "Devices"
                                }
                            },
                            {
                                "id": "5a5334b1-f9b9-489d-8d86-6d9af6d77a03",
                                "tag": "approve_issue_requests_page",
                                "blockType": "interfaceContainerBlock",
                                "defaultActive": true,
                                "children": [
                                    {
                                        "id": "a6b2ed95-7ce2-4212-b64a-647aea6df91c",
                                        "tag": "issue_requests_grid(evident)",
                                        "blockType": "interfaceDocumentsSourceBlock",
                                        "defaultActive": true,
                                        "children": [
                                            {
                                                "id": "2c59784d-8ba9-4deb-9d98-d772605aabde",
                                                "tag": "issue_requests_source(need_approve)",
                                                "blockType": "documentsSourceAddon",
                                                "defaultActive": false,
                                                "children": [],
                                                "permissions": [
                                                    "OWNER"
                                                ],
                                                "onErrorAction": "no-action",
                                                "filters": [
                                                    {
                                                        "value": "Waiting for approval",
                                                        "field": "option.status",
                                                        "type": "equal"
                                                    },
                                                    {
                                                        "value": "issue_request",
                                                        "field": "type",
                                                        "type": "equal"
                                                    }
                                                ],
                                                "dataType": "vc-documents",
                                                "schema": "#fb069289-5bdd-4bba-972a-68b33eca3671&1.0.0"
                                            },
                                            {
                                                "id": "6a665b70-b53a-4d27-b9be-3a0bb452ddd3",
                                                "tag": "issue_requests_source(approved)",
                                                "blockType": "documentsSourceAddon",
                                                "defaultActive": false,
                                                "children": [],
                                                "permissions": [
                                                    "OWNER"
                                                ],
                                                "onErrorAction": "no-action",
                                                "filters": [
                                                    {
                                                        "value": "Waiting for approval",
                                                        "field": "option.status",
                                                        "type": "not_equal"
                                                    },
                                                    {
                                                        "value": "issue_request",
                                                        "field": "type",
                                                        "type": "equal"
                                                    }
                                                ],
                                                "dataType": "vc-documents",
                                                "schema": "#fb069289-5bdd-4bba-972a-68b33eca3671&1.0.0"
                                            }
                                        ],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {
                                            "fields": [
                                                {
                                                    "title": "Organization Name",
                                                    "name": "document.credentialSubject.0.field2.field0",
                                                    "type": "text"
                                                },
                                                {
                                                    "title": "Production Period Start Date",
                                                    "name": "document.credentialSubject.0.field6",
                                                    "type": "text"
                                                },
                                                {
                                                    "title": "Production Period End Date",
                                                    "name": "document.credentialSubject.0.field8",
                                                    "type": "text"
                                                },
                                                {
                                                    "title": "Total kWh Produced in this period",
                                                    "name": "document.credentialSubject.0.field7",
                                                    "type": "text"
                                                },
                                                {
                                                    "title": "Date",
                                                    "name": "document.issuanceDate",
                                                    "type": "text"
                                                },
                                                {
                                                    "name": "option.status",
                                                    "title": "Operation",
                                                    "type": "text",
                                                    "width": "250px",
                                                    "bindGroup": "issue_requests_source(approved)",
                                                    "action": "",
                                                    "url": "",
                                                    "dialogContent": "",
                                                    "dialogClass": "",
                                                    "dialogType": "",
                                                    "bindBlock": ""
                                                },
                                                {
                                                    "title": "Operation",
                                                    "name": "option.status",
                                                    "tooltip": "",
                                                    "type": "block",
                                                    "action": "",
                                                    "url": "",
                                                    "dialogContent": "",
                                                    "dialogClass": "",
                                                    "dialogType": "",
                                                    "bindBlock": "approve_issue_requests_btn",
                                                    "width": "250px",
                                                    "bindGroup": "issue_requests_source(need_approve)"
                                                },
                                                {
                                                    "name": "document",
                                                    "title": "Document",
                                                    "tooltip": "",
                                                    "type": "button",
                                                    "action": "dialog",
                                                    "content": "View Document",
                                                    "uiClass": "link",
                                                    "dialogContent": "VC",
                                                    "dialogClass": "",
                                                    "dialogType": "json"
                                                }
                                            ]
                                        },
                                        "dependencies": [
                                            "create_issue_request",
                                            "save_issue_status(minted)",
                                            "save_issue_status(minting)",
                                            "save_issue_status(reject)"
                                        ]
                                    },
                                    {
                                        "id": "82482ff6-e790-4cde-868f-1d59edcd2a9c",
                                        "tag": "approve_issue_requests_btn",
                                        "blockType": "interfaceActionBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {
                                            "options": [
                                                {
                                                    "title": "",
                                                    "name": "Approve",
                                                    "tooltip": "",
                                                    "type": "text",
                                                    "value": "Approved",
                                                    "uiClass": "btn-approve",
                                                    "bindBlock": "save_issue_status(approved)"
                                                },
                                                {
                                                    "title": "",
                                                    "name": "Reject",
                                                    "tooltip": "",
                                                    "type": "text",
                                                    "value": "Rejected",
                                                    "uiClass": "btn-reject",
                                                    "bindBlock": "save_issue_status(reject)"
                                                }
                                            ]
                                        },
                                        "type": "selector",
                                        "field": "option.status"
                                    },
                                    {
                                        "id": "1e3888a4-bbd0-43bf-9ae5-6eda5385ef78",
                                        "tag": "mint_events",
                                        "blockType": "interfaceContainerBlock",
                                        "defaultActive": false,
                                        "children": [
                                            {
                                                "id": "62530dea-346a-488a-8790-bc8eec5a92ae",
                                                "tag": "save_issue_status(approved)",
                                                "blockType": "sendToGuardianBlock",
                                                "defaultActive": false,
                                                "children": [],
                                                "permissions": [
                                                    "OWNER"
                                                ],
                                                "onErrorAction": "no-action",
                                                "uiMetaData": {},
                                                "options": [
                                                    {
                                                        "name": "status",
                                                        "value": "Approved"
                                                    }
                                                ],
                                                "entityType": "issue_request",
                                                "dataType": "",
                                                "dataSource": "database",
                                                "documentType": "vc"
                                            },
                                            {
                                                "id": "43822cf2-4499-48b6-b878-bab44a2a79eb",
                                                "tag": "sign_issue_by_issuer",
                                                "blockType": "calculateContainerBlock",
                                                "defaultActive": false,
                                                "children": [],
                                                "permissions": [
                                                    "OWNER"
                                                ],
                                                "onErrorAction": "no-action",
                                                "inputFields": [
                                                    {
                                                        "name": "field0",
                                                        "title": "Registrant Id",
                                                        "value": "field0"
                                                    },
                                                    {
                                                        "name": "field1",
                                                        "title": "Production Device/Production Group Id",
                                                        "value": "field1"
                                                    },
                                                    {
                                                        "name": "field2",
                                                        "title": "Registrant Details",
                                                        "value": "field2"
                                                    },
                                                    {
                                                        "name": "field3",
                                                        "title": "Production Device/Production Group",
                                                        "value": "field3"
                                                    },
                                                    {
                                                        "name": "field4",
                                                        "title": "Labelling scheme(s)",
                                                        "value": "field4"
                                                    },
                                                    {
                                                        "name": "field5",
                                                        "title": "Last registration date",
                                                        "value": "field5"
                                                    },
                                                    {
                                                        "name": "field6",
                                                        "title": "Production Period Start Date",
                                                        "value": "field6"
                                                    },
                                                    {
                                                        "name": "field7",
                                                        "title": "Total kWh Produced in this period",
                                                        "value": "field7"
                                                    },
                                                    {
                                                        "name": "field8",
                                                        "title": "Production Period End Date",
                                                        "value": "field8"
                                                    },
                                                    {
                                                        "name": "field9",
                                                        "title": "Percentage of eligible total applied for",
                                                        "value": "field9"
                                                    },
                                                    {
                                                        "name": "field10",
                                                        "title": "Type a: Settlement Metering data",
                                                        "value": "field10"
                                                    },
                                                    {
                                                        "name": "field11",
                                                        "title": "Type b: Non-settlement Metering data",
                                                        "value": "field11"
                                                    },
                                                    {
                                                        "name": "field12",
                                                        "title": "Type c: Measured Volume Transfer documentation",
                                                        "value": "field12"
                                                    },
                                                    {
                                                        "name": "field13",
                                                        "title": "Type d: Other",
                                                        "value": "field13"
                                                    },
                                                    {
                                                        "name": "field14",
                                                        "title": "Is the production of this electricity counted towards a national, sub-national or regulatory target?",
                                                        "value": "field14"
                                                    },
                                                    {
                                                        "name": "field15",
                                                        "title": "Is any of this production subject to a public consumption obligation?",
                                                        "value": "field15"
                                                    },
                                                    {
                                                        "name": "field16",
                                                        "title": "Do you retain the right to obtain emissions reduction certificates or carbon offsets for the energy nominated in this Issue Request?",
                                                        "value": "field16"
                                                    },
                                                    {
                                                        "name": "field17",
                                                        "title": "I-REC Participant name",
                                                        "value": "field17"
                                                    },
                                                    {
                                                        "name": "field18",
                                                        "title": "Account number",
                                                        "value": "field18"
                                                    }
                                                ],
                                                "outputFields": [
                                                    {
                                                        "name": "field0",
                                                        "title": "Registrant Id",
                                                        "value": "field0"
                                                    },
                                                    {
                                                        "name": "field1",
                                                        "title": "Production Device/Production Group Id",
                                                        "value": "field1"
                                                    },
                                                    {
                                                        "name": "field2",
                                                        "title": "Registrant Details",
                                                        "value": "field2"
                                                    },
                                                    {
                                                        "name": "field3",
                                                        "title": "Production Device/Production Group",
                                                        "value": "field3"
                                                    },
                                                    {
                                                        "name": "field4",
                                                        "title": "Labelling scheme(s)",
                                                        "value": "field4"
                                                    },
                                                    {
                                                        "name": "field5",
                                                        "title": "Last registration date",
                                                        "value": "field5"
                                                    },
                                                    {
                                                        "name": "field6",
                                                        "title": "Production Period Start Date",
                                                        "value": "field6"
                                                    },
                                                    {
                                                        "name": "field7",
                                                        "title": "Total kWh Produced in this period",
                                                        "value": "field7"
                                                    },
                                                    {
                                                        "name": "field8",
                                                        "title": "Production Period End Date",
                                                        "value": "field8"
                                                    },
                                                    {
                                                        "name": "field9",
                                                        "title": "Percentage of eligible total applied for",
                                                        "value": "field9"
                                                    },
                                                    {
                                                        "name": "field10",
                                                        "title": "Type a: Settlement Metering data",
                                                        "value": "field10"
                                                    },
                                                    {
                                                        "name": "field11",
                                                        "title": "Type b: Non-settlement Metering data",
                                                        "value": "field11"
                                                    },
                                                    {
                                                        "name": "field12",
                                                        "title": "Type c: Measured Volume Transfer documentation",
                                                        "value": "field12"
                                                    },
                                                    {
                                                        "name": "field13",
                                                        "title": "Type d: Other",
                                                        "value": "field13"
                                                    },
                                                    {
                                                        "name": "field14",
                                                        "title": "Is the production of this electricity counted towards a national, sub-national or regulatory target?",
                                                        "value": "field14"
                                                    },
                                                    {
                                                        "name": "field15",
                                                        "title": "Is any of this production subject to a public consumption obligation?",
                                                        "value": "field15"
                                                    },
                                                    {
                                                        "name": "field16",
                                                        "title": "Do you retain the right to obtain emissions reduction certificates or carbon offsets for the energy nominated in this Issue Request?",
                                                        "value": "field16"
                                                    },
                                                    {
                                                        "name": "field17",
                                                        "title": "I-REC Participant name",
                                                        "value": "field17"
                                                    },
                                                    {
                                                        "name": "field18",
                                                        "title": "Account number",
                                                        "value": "field18"
                                                    }
                                                ],
                                                "inputSchema": "#fb069289-5bdd-4bba-972a-68b33eca3671&1.0.0",
                                                "outputSchema": "#fb069289-5bdd-4bba-972a-68b33eca3671&1.0.0"
                                            },
                                            {
                                                "id": "39e9f22c-4e8b-45ba-8dc8-6777d2f8aa22",
                                                "tag": "save_copy_issue(hedera)",
                                                "blockType": "sendToGuardianBlock",
                                                "defaultActive": false,
                                                "children": [],
                                                "permissions": [
                                                    "OWNER"
                                                ],
                                                "onErrorAction": "no-action",
                                                "uiMetaData": {},
                                                "options": [],
                                                "dataSource": "hedera",
                                                "documentType": "vc",
                                                "topic": "Project",
                                                "topicOwner": "owner"
                                            },
                                            {
                                                "id": "ca5ca910-3667-43c3-9640-13b1b7094fa4",
                                                "tag": "save_copy_issue",
                                                "blockType": "sendToGuardianBlock",
                                                "defaultActive": false,
                                                "children": [],
                                                "permissions": [
                                                    "OWNER"
                                                ],
                                                "onErrorAction": "no-action",
                                                "uiMetaData": {},
                                                "options": [
                                                    {
                                                        "name": "status",
                                                        "value": "Minting"
                                                    }
                                                ],
                                                "entityType": "issue_request(Approved)",
                                                "dataType": "",
                                                "forceNew": true,
                                                "dataSource": "database",
                                                "documentType": "vc"
                                            },
                                            {
                                                "id": "f234c5d8-7c13-425b-9c17-3345030aa72f",
                                                "tag": "mint_token",
                                                "blockType": "mintDocumentBlock",
                                                "defaultActive": false,
                                                "children": [],
                                                "permissions": [
                                                    "OWNER"
                                                ],
                                                "onErrorAction": "no-action",
                                                "uiMetaData": {},
                                                "tokenId": "0.0.34804363",
                                                "rule": "field7"
                                            },
                                            {
                                                "id": "d7fcf0bb-e3b7-4c00-96b2-75a0acc6f1ce",
                                                "tag": "save_issue_status(minted)",
                                                "blockType": "sendToGuardianBlock",
                                                "defaultActive": false,
                                                "children": [],
                                                "permissions": [
                                                    "OWNER"
                                                ],
                                                "onErrorAction": "no-action",
                                                "uiMetaData": {},
                                                "options": [
                                                    {
                                                        "name": "status",
                                                        "value": "Minted"
                                                    }
                                                ],
                                                "entityType": "issue_request(Approved)",
                                                "dataType": "",
                                                "dataSource": "database",
                                                "documentType": "vc"
                                            }
                                        ],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {
                                            "type": "blank"
                                        }
                                    },
                                    {
                                        "id": "e3c8cf82-4b74-4639-a35d-3f58597559aa",
                                        "tag": "save_issue_status(reject)",
                                        "blockType": "sendToGuardianBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {},
                                        "options": [
                                            {
                                                "name": "status",
                                                "value": "Rejected"
                                            }
                                        ],
                                        "entityType": "issue_request",
                                        "dataType": "",
                                        "stopPropagation": true,
                                        "dataSource": "database",
                                        "documentType": "vc"
                                    }
                                ],
                                "permissions": [
                                    "OWNER"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {
                                    "type": "blank",
                                    "title": "Issue Requests"
                                }
                            },
                            {
                                "id": "60a8942a-bfba-46a9-a376-33704fd6eb37",
                                "tag": "VP",
                                "blockType": "interfaceContainerBlock",
                                "defaultActive": true,
                                "children": [
                                    {
                                        "id": "1f5f6542-84ff-4add-aa55-53f0184b6f9c",
                                        "tag": "vp_grid",
                                        "blockType": "interfaceDocumentsSourceBlock",
                                        "defaultActive": true,
                                        "children": [
                                            {
                                                "id": "41c5240c-49e8-4965-8aef-bd722b5a5bde",
                                                "tag": "vp_source",
                                                "blockType": "documentsSourceAddon",
                                                "defaultActive": false,
                                                "children": [],
                                                "permissions": [
                                                    "OWNER"
                                                ],
                                                "onErrorAction": "no-action",
                                                "filters": [],
                                                "dataType": "vp-documents"
                                            }
                                        ],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {
                                            "fields": [
                                                {
                                                    "title": "HASH",
                                                    "name": "hash",
                                                    "tooltip": "",
                                                    "type": "text"
                                                },
                                                {
                                                    "title": "Date",
                                                    "name": "document.verifiableCredential.1.credentialSubject.0.date",
                                                    "tooltip": "",
                                                    "type": "text"
                                                },
                                                {
                                                    "title": "Token Id",
                                                    "name": "document.verifiableCredential.1.credentialSubject.0.tokenId",
                                                    "tooltip": "",
                                                    "type": "text"
                                                },
                                                {
                                                    "title": "Serials",
                                                    "name": "document.verifiableCredential.1.credentialSubject.0.serials",
                                                    "tooltip": "",
                                                    "type": "text"
                                                },
                                                {
                                                    "title": "TrustChain",
                                                    "name": "hash",
                                                    "tooltip": "",
                                                    "type": "button",
                                                    "action": "link",
                                                    "url": "",
                                                    "dialogContent": "",
                                                    "dialogClass": "",
                                                    "dialogType": "",
                                                    "bindBlock": "trustChainBlock",
                                                    "content": "View TrustChain",
                                                    "width": "150px"
                                                }
                                            ]
                                        }
                                    }
                                ],
                                "permissions": [
                                    "OWNER"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {
                                    "type": "blank",
                                    "title": "Token History"
                                }
                            },
                            {
                                "id": "84e23b1b-4a4e-4a73-bc75-5fc2d6bcd40d",
                                "tag": "trust_chain",
                                "blockType": "interfaceContainerBlock",
                                "defaultActive": true,
                                "children": [
                                    {
                                        "id": "4791aaad-94a8-49fb-aa96-b3a1bc57e584",
                                        "tag": "trustChainBlock",
                                        "blockType": "reportBlock",
                                        "defaultActive": true,
                                        "children": [
                                            {
                                                "id": "d8d61fd7-eb2f-4f96-9006-64ac60327192",
                                                "tag": "MintTokenItem",
                                                "blockType": "reportItemBlock",
                                                "defaultActive": false,
                                                "children": [],
                                                "permissions": [
                                                    "OWNER"
                                                ],
                                                "onErrorAction": "no-action",
                                                "filters": [
                                                    {
                                                        "type": "equal",
                                                        "typeValue": "variable",
                                                        "field": "document.id",
                                                        "value": "actionId"
                                                    }
                                                ],
                                                "variables": [],
                                                "visible": true,
                                                "iconType": "COMMON",
                                                "title": "Token",
                                                "description": "Token[s] minted."
                                            },
                                            {
                                                "id": "b3998bcc-bf24-49c3-b7f9-67086b397863",
                                                "tag": "issue_report(approved)",
                                                "blockType": "reportItemBlock",
                                                "defaultActive": false,
                                                "children": [],
                                                "permissions": [
                                                    "OWNER"
                                                ],
                                                "onErrorAction": "no-action",
                                                "filters": [
                                                    {
                                                        "typeValue": "value",
                                                        "field": "type",
                                                        "type": "equal",
                                                        "value": "issue_request(Approved)"
                                                    },
                                                    {
                                                        "type": "equal",
                                                        "typeValue": "variable",
                                                        "field": "document.id",
                                                        "value": "documentId"
                                                    }
                                                ],
                                                "variables": [
                                                    {
                                                        "value": "document.credentialSubject.0.id",
                                                        "name": "issueId"
                                                    },
                                                    {
                                                        "name": "registrantId",
                                                        "value": "document.credentialSubject.0.field0"
                                                    },
                                                    {
                                                        "name": "deviceId",
                                                        "value": "document.credentialSubject.0.field1"
                                                    }
                                                ],
                                                "visible": true,
                                                "iconType": "COMMON",
                                                "title": "Issue Request Review",
                                                "description": "Issue Request processed."
                                            },
                                            {
                                                "id": "ff24f4fe-2a53-4355-8e1a-922fa6201f32",
                                                "tag": "issue_report(submit)",
                                                "blockType": "reportItemBlock",
                                                "defaultActive": false,
                                                "children": [],
                                                "permissions": [
                                                    "OWNER"
                                                ],
                                                "onErrorAction": "no-action",
                                                "filters": [
                                                    {
                                                        "typeValue": "value",
                                                        "field": "type",
                                                        "type": "equal",
                                                        "value": "issue_request"
                                                    },
                                                    {
                                                        "type": "equal",
                                                        "typeValue": "variable",
                                                        "field": "document.credentialSubject.0.id",
                                                        "value": "issueId"
                                                    }
                                                ],
                                                "variables": [],
                                                "visible": true,
                                                "iconType": "COMMON",
                                                "description": "Registrant submitted Issue Request to Issuer.",
                                                "title": "Issue Request"
                                            },
                                            {
                                                "id": "4d882b68-a570-4c1b-bdd2-e8e5773c442a",
                                                "tag": "device_report(approved)",
                                                "blockType": "reportItemBlock",
                                                "defaultActive": false,
                                                "children": [],
                                                "permissions": [
                                                    "OWNER"
                                                ],
                                                "onErrorAction": "no-action",
                                                "filters": [
                                                    {
                                                        "typeValue": "value",
                                                        "type": "equal",
                                                        "field": "type",
                                                        "value": "device(Approved)"
                                                    },
                                                    {
                                                        "field": "document.credentialSubject.0.id",
                                                        "value": "deviceId",
                                                        "type": "equal",
                                                        "typeValue": "variable"
                                                    }
                                                ],
                                                "variables": [],
                                                "visible": true,
                                                "iconType": "COMMON",
                                                "description": "Device registration request processed.",
                                                "title": "Device Review"
                                            },
                                            {
                                                "id": "5b8f5afe-7fbe-44c1-912f-5b9962b96528",
                                                "tag": "device_report(submit)",
                                                "blockType": "reportItemBlock",
                                                "defaultActive": false,
                                                "children": [],
                                                "permissions": [
                                                    "OWNER"
                                                ],
                                                "onErrorAction": "no-action",
                                                "filters": [
                                                    {
                                                        "value": "device",
                                                        "field": "type",
                                                        "type": "equal",
                                                        "typeValue": "value"
                                                    },
                                                    {
                                                        "field": "document.credentialSubject.0.id",
                                                        "value": "deviceId",
                                                        "type": "equal",
                                                        "typeValue": "variable"
                                                    }
                                                ],
                                                "variables": [],
                                                "visible": true,
                                                "iconType": "COMMON",
                                                "title": "Device Registration",
                                                "description": "Production Facility/Device registration request submitted to Issuer."
                                            },
                                            {
                                                "id": "ef279ecd-abaa-425e-bb67-1f47a062c326",
                                                "tag": "registrant_report(approved)",
                                                "blockType": "reportItemBlock",
                                                "defaultActive": false,
                                                "children": [],
                                                "permissions": [
                                                    "OWNER"
                                                ],
                                                "onErrorAction": "no-action",
                                                "filters": [
                                                    {
                                                        "type": "equal",
                                                        "typeValue": "value",
                                                        "field": "type",
                                                        "value": "registrant(Approved)"
                                                    },
                                                    {
                                                        "field": "document.credentialSubject.0.id",
                                                        "value": "registrantId",
                                                        "type": "equal",
                                                        "typeValue": "variable"
                                                    }
                                                ],
                                                "variables": [],
                                                "visible": true,
                                                "iconType": "COMMON",
                                                "description": "Application/KYC processed.",
                                                "title": "Application Review"
                                            },
                                            {
                                                "id": "e7fad57c-6d8b-4ed8-8ece-bdaf2044d4d4",
                                                "tag": "registrant_report(submit)",
                                                "blockType": "reportItemBlock",
                                                "defaultActive": false,
                                                "children": [],
                                                "permissions": [
                                                    "OWNER"
                                                ],
                                                "onErrorAction": "no-action",
                                                "filters": [
                                                    {
                                                        "value": "registrant",
                                                        "field": "type",
                                                        "type": "equal",
                                                        "typeValue": "value"
                                                    },
                                                    {
                                                        "field": "document.credentialSubject.0.id",
                                                        "value": "registrantId",
                                                        "type": "equal",
                                                        "typeValue": "variable"
                                                    }
                                                ],
                                                "variables": [],
                                                "visible": true,
                                                "iconType": "COMMON",
                                                "description": "Application submitted to Issuer.",
                                                "title": "Registrant Application"
                                            }
                                        ],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action"
                                    }
                                ],
                                "permissions": [
                                    "OWNER"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {
                                    "type": "blank",
                                    "title": "TrustChain"
                                }
                            }
                        ],
                        "permissions": [
                            "OWNER"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {
                            "type": "tabs"
                        }
                    }
                ]
            },
            "status": "PUBLISH",
            "creator": "did:hedera:testnet:F9Nhh3jSvVX6sErMuy95WkEr2fqCuWzZFsoq8YWRQdvD;hedera:testnet:tid=0.0.34751333",
            "owner": "did:hedera:testnet:F9Nhh3jSvVX6sErMuy95WkEr2fqCuWzZFsoq8YWRQdvD;hedera:testnet:tid=0.0.34751333",
            "policyRoles": [
                "Registrant"
            ],
            "policyTopics": [
                {
                    "name": "Project",
                    "description": "Project",
                    "type": "any",
                    "static": false
                }
            ],
            "topicId": "0.0.34804358",
            "instanceTopicId": "0.0.34804466",
            "policyTag": "Tag_1652463578256",
            "messageId": "1652464053.603998000",
            "createDate": "2022-05-13T17:40:11.584Z"
        }
    ],
    "isValid": true,
    "errors": {
        "blocks": [
            {
                "id": "5de4c484-e9fa-4e4e-a3b0-70d945441a34",
                "name": "interfaceContainerBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "18639325-e036-4773-9eaa-6ccbb965b19d",
                "name": "policyRolesBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "c769991c-af8d-4292-989c-a697cd047f73",
                "name": "interfaceContainerBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "1ba36c5a-78ac-4081-80f4-7ac8693df3e1",
                "name": "interfaceStepBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "f2c1674d-443f-435f-839f-4325e6ca0698",
                "name": "requestVcDocumentBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "0292bfb4-ebdf-4ff7-a927-ce9fb58925d0",
                "name": "sendToGuardianBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "fed49259-8ce2-4330-910b-02ee7719b499",
                "name": "sendToGuardianBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "47dcda17-a066-4713-8b37-3a7e53f30be1",
                "name": "informationBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "27cecf69-1fd4-47d9-b42d-93218e9d1023",
                "name": "sendToGuardianBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "9e5c60b1-18e3-4770-9771-da9af49811c4",
                "name": "reassigningBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "ee7d2cfa-ec36-46dc-accc-0cad35f270d0",
                "name": "sendToGuardianBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "47a2c964-23dc-41ce-ae4f-cb4886c7a076",
                "name": "sendToGuardianBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "4ba98a84-ac13-4f74-b2ec-4cb5be6efae7",
                "name": "interfaceContainerBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "a4584ad6-fc88-485c-99d4-368b5be76527",
                "name": "interfaceContainerBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "53e0e097-a9df-4d9a-95e7-8c5ca0acf205",
                "name": "interfaceDocumentsSourceBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "a92ef034-74f8-4e80-a7bb-bd40217ce784",
                "name": "documentsSourceAddon",
                "errors": [],
                "isValid": true
            },
            {
                "id": "44f94b84-d19c-4874-adba-e337c63c889c",
                "name": "documentsSourceAddon",
                "errors": [],
                "isValid": true
            },
            {
                "id": "9851be69-140e-458a-b9fa-86610abf8944",
                "name": "interfaceStepBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "86c88ac1-6f89-4e76-9f2b-28ecfb8ae984",
                "name": "requestVcDocumentBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "9929592e-3661-405e-b194-9f0fc25cbec8",
                "name": "documentsSourceAddon",
                "errors": [],
                "isValid": true
            },
            {
                "id": "a798348d-7882-4264-81ca-97d37d60aa43",
                "name": "sendToGuardianBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "229e0f65-05c0-4af3-b882-cc0638da7654",
                "name": "sendToGuardianBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "f28a4529-e402-44e7-9fe6-6c2342babe7e",
                "name": "interfaceStepBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "76449598-fdef-4b78-8836-ed986e55aa75",
                "name": "requestVcDocumentBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "60c1ae67-5b4d-4c4b-926f-6afd56e5968f",
                "name": "sendToGuardianBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "38157ad3-c5e8-4e83-a127-5fc463144b5e",
                "name": "sendToGuardianBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "5d97928a-7ad0-4d12-8a24-0887d2c462fa",
                "name": "interfaceContainerBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "5842e60f-ffcf-4cde-bb7c-d0a7d564b58b",
                "name": "interfaceDocumentsSourceBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "148d8640-91b6-4453-84a0-88410554e760",
                "name": "documentsSourceAddon",
                "errors": [],
                "isValid": true
            },
            {
                "id": "de8f42d5-6901-441f-9d6f-f7d10ae9fa0f",
                "name": "filtersAddon",
                "errors": [],
                "isValid": true
            },
            {
                "id": "8063ccbb-3328-490f-ae92-fd773e372e08",
                "name": "documentsSourceAddon",
                "errors": [],
                "isValid": true
            },
            {
                "id": "3da2bbb7-0c4a-4ec9-8c38-b217af2da35b",
                "name": "interfaceContainerBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "2eaa8a53-0379-4479-a53f-7b397b9b41d8",
                "name": "interfaceDocumentsSourceBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "a9abb318-30b3-4b53-bd19-292047b0935b",
                "name": "documentsSourceAddon",
                "errors": [],
                "isValid": true
            },
            {
                "id": "962714b7-8bb5-4958-841a-6b370cfe1192",
                "name": "filtersAddon",
                "errors": [],
                "isValid": true
            },
            {
                "id": "8b5a74e6-fb37-432d-9223-e89065dca7e5",
                "name": "documentsSourceAddon",
                "errors": [],
                "isValid": true
            },
            {
                "id": "ba6926b1-be6d-46a0-8986-c155b9865331",
                "name": "sendToGuardianBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "3941044d-d593-4246-b7f7-20e53057e711",
                "name": "informationBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "550b6cc0-35b5-4e81-bfbb-496ffc78e621",
                "name": "interfaceContainerBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "d1edace7-9ec6-4bc0-9bf0-acaded28fe10",
                "name": "interfaceContainerBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "869280f7-626a-4e5e-8c88-6d2d14ddbc88",
                "name": "interfaceDocumentsSourceBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "283a4eee-01fe-4501-b6df-33cae2c2fd68",
                "name": "documentsSourceAddon",
                "errors": [],
                "isValid": true
            },
            {
                "id": "c4a0dc23-d30c-44f2-95c1-bb46be8cfedb",
                "name": "documentsSourceAddon",
                "errors": [],
                "isValid": true
            },
            {
                "id": "92365a5c-d7bc-4985-b425-cf1340a4f1c7",
                "name": "interfaceActionBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "584752e1-d0bb-4b21-b183-3690207bbdb2",
                "name": "interfaceContainerBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "888cc08a-9348-41cf-a8fd-365401acf40e",
                "name": "interfaceDocumentsSourceBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "8b0438fd-32e3-4666-bdee-54ec071789d3",
                "name": "documentsSourceAddon",
                "errors": [],
                "isValid": true
            },
            {
                "id": "bda94def-d1ba-4fa1-b03a-7c7035a12df5",
                "name": "documentsSourceAddon",
                "errors": [],
                "isValid": true
            },
            {
                "id": "5404a5bf-32d6-483e-8cce-f3ed344eaab4",
                "name": "interfaceActionBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "0495a898-4ae3-4ee1-bf89-1b7bdec3d11b",
                "name": "sendToGuardianBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "038c7fbc-38cc-4bc5-9600-77594723819e",
                "name": "reassigningBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "9ebf31d2-4ff2-4048-b610-7db47b425e0e",
                "name": "sendToGuardianBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "e0fa120a-48d0-4e29-a5aa-c5645e997ea2",
                "name": "sendToGuardianBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "0e082400-1b0f-4229-830f-1e03b5767e17",
                "name": "sendToGuardianBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "0df2fd8c-1614-4a07-94b1-870e2638e78d",
                "name": "interfaceContainerBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "5197e08f-0cbe-4ded-a0c0-4657a8ee1c3f",
                "name": "interfaceDocumentsSourceBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "499c9c18-2375-4a40-a460-92b8d8f92e96",
                "name": "documentsSourceAddon",
                "errors": [],
                "isValid": true
            },
            {
                "id": "6d352c31-5602-486c-bd35-ef35de6b87ee",
                "name": "documentsSourceAddon",
                "errors": [],
                "isValid": true
            },
            {
                "id": "02f54956-6dd8-4755-aa52-b08674774be9",
                "name": "interfaceActionBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "c272b91f-b2b9-4e52-bd80-c84505d77770",
                "name": "interfaceContainerBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "dca3ca61-0c75-4530-be9e-847e5db8c251",
                "name": "sendToGuardianBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "7055730e-0f81-426d-ad3a-032e2d4fc54f",
                "name": "calculateContainerBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "739a2a05-ec36-4b1c-b27e-368219e8dd7f",
                "name": "sendToGuardianBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "cad6e6c9-2408-40a8-9c9f-ab19682d8998",
                "name": "sendToGuardianBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "6ca507d0-7512-4578-85c5-a85744e8f0ac",
                "name": "mintDocumentBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "14ff06fa-9c76-4468-b873-c59d751b0029",
                "name": "sendToGuardianBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "54e33f31-76b0-4e7d-ac60-af515c9c22be",
                "name": "sendToGuardianBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "872d5b8f-a8c6-4e94-a24a-ab3f35762e8c",
                "name": "interfaceContainerBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "0bdac0af-6539-4395-b365-1e8187580a46",
                "name": "interfaceDocumentsSourceBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "d64e68d9-f396-4817-bc38-89def589f582",
                "name": "documentsSourceAddon",
                "errors": [],
                "isValid": true
            },
            {
                "id": "837286ed-4931-4245-98b5-2365b2aa1b5f",
                "name": "interfaceContainerBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "7bc21e88-af74-48d7-8722-859e06dcdc2c",
                "name": "reportBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "61cec38a-734e-4dbf-a93f-213be5d3e0a2",
                "name": "reportItemBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "191975eb-42b2-4454-97c4-ae6a37d9b62c",
                "name": "reportItemBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "6c9d4aca-ee28-4b66-81d0-db6feec7b458",
                "name": "reportItemBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "01d36d6f-da44-416c-87af-82512f920795",
                "name": "reportItemBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "9e404222-5247-4923-9a1e-293fad6619f8",
                "name": "reportItemBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "9da21b8a-3018-4b91-8b34-b293d9d4ec53",
                "name": "reportItemBlock",
                "errors": [],
                "isValid": true
            },
            {
                "id": "d01cb7b3-1b8f-46ba-9e06-0c34cedfeb2e",
                "name": "reportItemBlock",
                "errors": [],
                "isValid": true
            }
        ]
    }
}
```
{% endswagger-response %}
{% endswagger %}

### Tokens

#### Get Tokens

{% swagger method="get" path="" baseUrl="/tokens" summary="Getting Tokens Details" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    
        "id": "627e97ea0f12a18fef5f1d58",
        "tokenId": "0.0.34804363",
        "tokenName": "iRec Token",
        "tokenSymbol": "iRec",
        "tokenType": "non-fungible",
        "decimals": 0,
        "policies": [
            "iRec_2_1650456840748_1652463611568 (1.0.0)"
        ],
        "associated": false,
        "balance": null,
        "hBarBalance": null,
        "frozen": null,
        "kyc": null
}
```
{% endswagger-response %}
{% endswagger %}

#### Associate

{% swagger method="put" path="" baseUrl="/tokens/{token_Id}/associate" summary="Associating the Token" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}
{% endswagger %}

#### Grant KYC

{% swagger method="put" path="{userUsername}/grantKYC" baseUrl="/tokens/{tokenId}/" summary="Granting KYC" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    "tokenId": "0.0.34804363",
    "policies": null,
    "associated": true,
    "balance": "0",
    "hBarBalance": "29.49376516 ℏ",
    "frozen": false,
    "kyc": true
}
```
{% endswagger-response %}
{% endswagger %}

### Blocks

#### Choose Role uuid

{% swagger method="get" path="" baseUrl="/policies/{{policyId}}/tag/choose_role" summary="Choosing Role" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    "id": "4bee425d-dfba-451a-b47d-ac945aeddc3e"
}
```
{% endswagger-response %}
{% endswagger %}

#### Choose Role

{% swagger method="post" path="" baseUrl="/policies/{{policyId}}/blocks/{{chooseRoleBlockUUID}}" summary="Choosing role as Registrant" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    "id": "6282755493e1d09322c4ed13",
    "uuid": "759df7c0-b4e9-4adf-9c63-62939c62d1f4",
    "name": "iRec_2_1650456840748_1652716884953",
    "version": "2.0.2",
    "description": "iRec Description",
    "topicDescription": "iRec Description",
    "config": {
        "blockType": "interfaceContainerBlock",
        "permissions": [
            "ANY_ROLE"
        ],
        "id": "a94e8570-0d0e-4214-9b2b-5695bc46fbb2",
        "onErrorAction": "no-action",
        "uiMetaData": {
            "type": "blank"
        },
        "children": [
            {
                "id": "4bee425d-dfba-451a-b47d-ac945aeddc3e",
                "tag": "choose_role",
                "blockType": "policyRolesBlock",
                "defaultActive": true,
                "children": [],
                "permissions": [
                    "NO_ROLE"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {
                    "title": "Registration",
                    "description": "Choose a role"
                },
                "roles": [
                    "Registrant"
                ]
            },
            {
                "id": "1e4cfa36-fe35-4e31-ae5b-1d979c65f031",
                "tag": "registrants_workflow",
                "blockType": "interfaceContainerBlock",
                "defaultActive": true,
                "children": [
                    {
                        "id": "4148dd76-cdab-471e-8e88-a7a912e819c1",
                        "tag": "registrants_workflow_steps",
                        "blockType": "interfaceStepBlock",
                        "defaultActive": true,
                        "children": [
                            {
                                "id": "c6a4db28-6a4f-4137-9b42-530783443147",
                                "tag": "create_application",
                                "blockType": "requestVcDocumentBlock",
                                "defaultActive": true,
                                "children": [],
                                "permissions": [
                                    "Registrant"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {
                                    "type": "page",
                                    "title": "Registrant Application"
                                },
                                "presetFields": [],
                                "schema": "#732d99d8-b254-4aa7-8bb4-e78f15212892&1.0.0",
                                "idType": "OWNER"
                            },
                            {
                                "id": "4370496c-560f-48f7-b435-15e5e9fc8a77",
                                "tag": "save_application(hedera)",
                                "blockType": "sendToGuardianBlock",
                                "defaultActive": false,
                                "children": [],
                                "permissions": [
                                    "Registrant"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {},
                                "options": [],
                                "dataType": "",
                                "entityType": "registrant",
                                "topic": "Project",
                                "dataSource": "hedera",
                                "documentType": "vc",
                                "topicOwner": "user"
                            },
                            {
                                "id": "fd4ef1cf-26ce-432e-b425-50d4329e5f5e",
                                "tag": "create_application(db)",
                                "blockType": "sendToGuardianBlock",
                                "defaultActive": false,
                                "children": [],
                                "permissions": [
                                    "Registrant"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {},
                                "options": [
                                    {
                                        "name": "status",
                                        "value": "Waiting for approval"
                                    }
                                ],
                                "dataType": "",
                                "entityType": "registrant",
                                "dataSource": "database",
                                "documentType": "vc"
                            },
                            {
                                "id": "09d2472b-cd30-4339-9a01-57c5c17029d1",
                                "tag": "wait_for_approve",
                                "blockType": "informationBlock",
                                "defaultActive": true,
                                "children": [],
                                "permissions": [
                                    "Registrant"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {
                                    "description": "The page will refresh automatically once the application is approved.",
                                    "type": "text",
                                    "title": "Submitted for Approval"
                                },
                                "stopPropagation": true
                            },
                            {
                                "id": "313042d7-95c0-4ed2-b5ea-bf77fec29ad2",
                                "tag": "save_application_status(approve)",
                                "blockType": "sendToGuardianBlock",
                                "defaultActive": false,
                                "children": [],
                                "permissions": [
                                    "Registrant"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {},
                                "options": [
                                    {
                                        "name": "status",
                                        "value": "Approved"
                                    }
                                ],
                                "dataType": "",
                                "entityType": "registrant",
                                "dataSource": "database",
                                "documentType": "vc"
                            },
                            {
                                "id": "916e7f10-2c65-43b2-86a7-494c78963e87",
                                "tag": "sign_by_issuer",
                                "blockType": "reassigningBlock",
                                "defaultActive": false,
                                "children": [],
                                "permissions": [
                                    "Registrant"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {},
                                "issuer": "policyOwner",
                                "actor": "owner"
                            },
                            {
                                "id": "0a31efea-bfb9-47de-a908-d9201ca8e579",
                                "tag": "save_copy_application(hedera)",
                                "blockType": "sendToGuardianBlock",
                                "defaultActive": false,
                                "children": [],
                                "permissions": [
                                    "Registrant"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {},
                                "options": [],
                                "dataSource": "hedera",
                                "documentType": "vc",
                                "topic": "Project",
                                "entityType": "registrant(Approved)",
                                "topicOwner": "owner"
                            },
                            {
                                "id": "d907660e-9834-42a1-a077-e8e38332b6e4",
                                "tag": "save_copy_application",
                                "blockType": "sendToGuardianBlock",
                                "defaultActive": false,
                                "children": [],
                                "permissions": [
                                    "Registrant"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {},
                                "options": [
                                    {
                                        "name": "status",
                                        "value": "Approved"
                                    }
                                ],
                                "dataType": "",
                                "entityType": "registrant(Approved)",
                                "forceNew": true,
                                "dataSource": "database",
                                "documentType": "vc"
                            },
                            {
                                "id": "fd215b72-33a0-47fd-84fa-d846f3d34040",
                                "tag": "registrants_page",
                                "blockType": "interfaceContainerBlock",
                                "defaultActive": true,
                                "children": [
                                    {
                                        "id": "be83cf5b-c6ca-4065-8eca-1a8aee328a4c",
                                        "tag": "devices_page",
                                        "blockType": "interfaceContainerBlock",
                                        "defaultActive": true,
                                        "children": [
                                            {
                                                "id": "81dcdea7-8a28-49df-8a55-78540e2d501c",
                                                "tag": "devices_grid",
                                                "blockType": "interfaceDocumentsSourceBlock",
                                                "defaultActive": true,
                                                "children": [
                                                    {
                                                        "id": "3fa477e2-e637-4b70-b762-cf52903f26ef",
                                                        "tag": "devices_source",
                                                        "blockType": "documentsSourceAddon",
                                                        "defaultActive": false,
                                                        "children": [],
                                                        "permissions": [
                                                            "Registrant"
                                                        ],
                                                        "onErrorAction": "no-action",
                                                        "filters": [
                                                            {
                                                                "value": "Approved",
                                                                "field": "option.status",
                                                                "type": "not_equal"
                                                            },
                                                            {
                                                                "value": "device",
                                                                "field": "type",
                                                                "type": "equal"
                                                            }
                                                        ],
                                                        "schema": "#0bb392cd-17ee-43e7-b4fd-85fd392dae24&1.0.0",
                                                        "dataType": "vc-documents",
                                                        "onlyOwnDocuments": true
                                                    },
                                                    {
                                                        "id": "d731215b-187d-42d4-8e62-0267d5b0f07a",
                                                        "tag": "devices_source(approved)",
                                                        "blockType": "documentsSourceAddon",
                                                        "defaultActive": false,
                                                        "children": [],
                                                        "permissions": [
                                                            "Registrant"
                                                        ],
                                                        "onErrorAction": "no-action",
                                                        "filters": [
                                                            {
                                                                "value": "Approved",
                                                                "field": "option.status",
                                                                "type": "equal"
                                                            },
                                                            {
                                                                "value": "device(Approved)",
                                                                "field": "type",
                                                                "type": "equal"
                                                            }
                                                        ],
                                                        "dataType": "vc-documents",
                                                        "schema": "#0bb392cd-17ee-43e7-b4fd-85fd392dae24&1.0.0",
                                                        "onlyOwnDocuments": true
                                                    }
                                                ],
                                                "permissions": [
                                                    "Registrant"
                                                ],
                                                "onErrorAction": "no-action",
                                                "uiMetaData": {
                                                    "fields": [
                                                        {
                                                            "title": "Device Name",
                                                            "name": "document.credentialSubject.0.field4.field0",
                                                            "type": "text"
                                                        },
                                                        {
                                                            "title": "Address",
                                                            "name": "document.credentialSubject.0.field4.field1",
                                                            "type": "text"
                                                        },
                                                        {
                                                            "title": "Longitude",
                                                            "name": "document.credentialSubject.0.field4.field4",
                                                            "type": "text"
                                                        },
                                                        {
                                                            "title": "Latitude",
                                                            "name": "document.credentialSubject.0.field4.field5",
                                                            "type": "text"
                                                        },
                                                        {
                                                            "title": "Capacity (kW)",
                                                            "name": "document.credentialSubject.0.field4.field7",
                                                            "type": "text"
                                                        },
                                                        {
                                                            "title": "Issue Request",
                                                            "name": "option.status",
                                                            "type": "text",
                                                            "bindGroup": "devices_source",
                                                            "width": "150px"
                                                        },
                                                        {
                                                            "title": "Issue Request",
                                                            "name": "",
                                                            "type": "block",
                                                            "action": "",
                                                            "url": "",
                                                            "dialogContent": "",
                                                            "dialogClass": "",
                                                            "dialogType": "",
                                                            "bindBlock": "create_issue_request_form",
                                                            "width": "150px",
                                                            "bindGroup": "devices_source(approved)"
                                                        },
                                                        {
                                                            "name": "document",
                                                            "title": "Document",
                                                            "tooltip": "",
                                                            "type": "button",
                                                            "action": "dialog",
                                                            "content": "View Document",
                                                            "uiClass": "link",
                                                            "dialogContent": "VC",
                                                            "dialogClass": "",
                                                            "dialogType": "json"
                                                        }
                                                    ]
                                                },
                                                "dependencies": [
                                                    "create_device",
                                                    "create_issue_request",
                                                    "save_device_status(approved)",
                                                    "save_device_status(reject)"
                                                ]
                                            },
                                            {
                                                "id": "e2c354d5-9532-4b97-97a4-7c9262e84215",
                                                "tag": "new_device",
                                                "blockType": "interfaceStepBlock",
                                                "defaultActive": true,
                                                "children": [
                                                    {
                                                        "id": "bb8ddf01-e056-4632-8aa1-7c1c8aa5a1ee",
                                                        "tag": "create_device_form",
                                                        "blockType": "requestVcDocumentBlock",
                                                        "defaultActive": true,
                                                        "children": [
                                                            {
                                                                "id": "3b55a17c-1df8-4684-978b-7f09bc18467f",
                                                                "tag": "current_registrant",
                                                                "blockType": "documentsSourceAddon",
                                                                "defaultActive": false,
                                                                "children": [],
                                                                "permissions": [
                                                                    "Registrant"
                                                                ],
                                                                "onErrorAction": "no-action",
                                                                "filters": [
                                                                    {
                                                                        "value": "registrant(Approved)",
                                                                        "field": "type",
                                                                        "type": "equal"
                                                                    }
                                                                ],
                                                                "onlyOwnDocuments": true,
                                                                "schema": "#732d99d8-b254-4aa7-8bb4-e78f15212892&1.0.0",
                                                                "dataType": "vc-documents"
                                                            }
                                                        ],
                                                        "permissions": [
                                                            "Registrant"
                                                        ],
                                                        "onErrorAction": "no-action",
                                                        "uiMetaData": {
                                                            "type": "dialog",
                                                            "content": "Create New Device",
                                                            "dialogContent": "Device Registration"
                                                        },
                                                        "presetFields": [
                                                            {
                                                                "name": "field0",
                                                                "title": "Registrant Id",
                                                                "value": "id",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field1",
                                                                "title": "Date",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field2",
                                                                "title": "Is the Registrant also the owner of the Device? (provide evidence) ",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field3",
                                                                "title": "Registrant Details",
                                                                "value": "field2",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field4",
                                                                "title": "Production Device Details",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field5",
                                                                "title": "Energy Sources",
                                                                "readonly": false
                                                            }
                                                        ],
                                                        "idType": "DID",
                                                        "schema": "#0bb392cd-17ee-43e7-b4fd-85fd392dae24&1.0.0",
                                                        "preset": true,
                                                        "presetSchema": "#732d99d8-b254-4aa7-8bb4-e78f15212892&1.0.0"
                                                    },
                                                    {
                                                        "id": "711119c3-340f-40ef-aadf-0c6425f5d29a",
                                                        "tag": "save_device(hedera)",
                                                        "blockType": "sendToGuardianBlock",
                                                        "defaultActive": false,
                                                        "children": [],
                                                        "permissions": [
                                                            "Registrant"
                                                        ],
                                                        "onErrorAction": "no-action",
                                                        "uiMetaData": {},
                                                        "options": [],
                                                        "dataType": "",
                                                        "topic": "Project",
                                                        "entityType": "device",
                                                        "dataSource": "hedera",
                                                        "documentType": "vc"
                                                    },
                                                    {
                                                        "id": "28400c06-b6fd-4ef9-aa1f-ed33eda0b11d",
                                                        "tag": "create_device",
                                                        "blockType": "sendToGuardianBlock",
                                                        "defaultActive": false,
                                                        "children": [],
                                                        "permissions": [
                                                            "Registrant"
                                                        ],
                                                        "onErrorAction": "no-action",
                                                        "uiMetaData": {},
                                                        "options": [
                                                            {
                                                                "name": "status",
                                                                "value": "Waiting for approval"
                                                            }
                                                        ],
                                                        "entityType": "device",
                                                        "dataType": "",
                                                        "dataSource": "database",
                                                        "documentType": "vc"
                                                    }
                                                ],
                                                "permissions": [
                                                    "Registrant"
                                                ],
                                                "onErrorAction": "no-action",
                                                "uiMetaData": {
                                                    "type": "blank"
                                                },
                                                "cyclic": true
                                            },
                                            {
                                                "id": "3f40645d-ce7a-41c0-8983-f654adf88ba9",
                                                "tag": "new_issue_request",
                                                "blockType": "interfaceStepBlock",
                                                "defaultActive": false,
                                                "children": [
                                                    {
                                                        "id": "81a1c852-b8d6-442d-bbf1-e2547e76935f",
                                                        "tag": "create_issue_request_form",
                                                        "blockType": "requestVcDocumentBlock",
                                                        "defaultActive": true,
                                                        "children": [],
                                                        "permissions": [
                                                            "Registrant"
                                                        ],
                                                        "onErrorAction": "no-action",
                                                        "uiMetaData": {
                                                            "type": "dialog",
                                                            "content": "Create Issue Request",
                                                            "dialogContent": "New Issue Request",
                                                            "buttonClass": "link"
                                                        },
                                                        "presetFields": [
                                                            {
                                                                "name": "field0",
                                                                "title": "Registrant Id",
                                                                "value": "field0",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field1",
                                                                "title": "Production Device/Production Group Id",
                                                                "value": "id",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field2",
                                                                "title": "Registrant Details",
                                                                "value": "field3",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field3",
                                                                "title": "Production Device/Production Group",
                                                                "value": "field4",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field4",
                                                                "title": "Labelling scheme(s)",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field5",
                                                                "title": "Last registration date",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field6",
                                                                "title": "Production Period Start Date",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field7",
                                                                "title": "Total kWh Produced in this period",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field8",
                                                                "title": "Production Period End Date",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field9",
                                                                "title": "Percentage of eligible total applied for",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field10",
                                                                "title": "Type a: Settlement Metering data",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field11",
                                                                "title": "Type b: Non-settlement Metering data",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field12",
                                                                "title": "Type c: Measured Volume Transfer documentation",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field13",
                                                                "title": "Type d: Other",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field14",
                                                                "title": "Is the production of this electricity counted towards a national, sub-national or regulatory target?",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field15",
                                                                "title": "Is any of this production subject to a public consumption obligation?",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field16",
                                                                "title": "Do you retain the right to obtain emissions reduction certificates or carbon offsets for the energy nominated in this Issue Request?",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field17",
                                                                "title": "I-REC Participant name",
                                                                "value": "username",
                                                                "readonly": false
                                                            },
                                                            {
                                                                "name": "field18",
                                                                "title": "Account number",
                                                                "value": "hederaAccountId",
                                                                "readonly": false
                                                            }
                                                        ],
                                                        "idType": "UUID",
                                                        "schema": "#17d892a5-4d98-43e1-aa78-e42ffc9ec64d&1.0.0",
                                                        "preset": true,
                                                        "presetSchema": "#0bb392cd-17ee-43e7-b4fd-85fd392dae24&1.0.0"
                                                    },
                                                    {
                                                        "id": "0081c692-5a1d-4f40-8247-8ab995b3e775",
                                                        "tag": "save_issue(hedera)",
                                                        "blockType": "sendToGuardianBlock",
                                                        "defaultActive": false,
                                                        "children": [],
                                                        "permissions": [
                                                            "Registrant"
                                                        ],
                                                        "onErrorAction": "no-action",
                                                        "uiMetaData": {},
                                                        "options": [],
                                                        "dataType": "",
                                                        "topic": "Project",
                                                        "entityType": "issue_request",
                                                        "dataSource": "hedera",
                                                        "documentType": "vc"
                                                    },
                                                    {
                                                        "id": "0ee66008-3bfc-4c48-ad30-9c28063e06ab",
                                                        "tag": "create_issue_request",
                                                        "blockType": "sendToGuardianBlock",
                                                        "defaultActive": false,
                                                        "children": [],
                                                        "permissions": [
                                                            "Registrant"
                                                        ],
                                                        "onErrorAction": "no-action",
                                                        "uiMetaData": {},
                                                        "options": [
                                                            {
                                                                "name": "status",
                                                                "value": "Waiting for approval"
                                                            }
                                                        ],
                                                        "dataType": "",
                                                        "entityType": "issue_request",
                                                        "dataSource": "database",
                                                        "documentType": "vc"
                                                    }
                                                ],
                                                "permissions": [
                                                    "Registrant"
                                                ],
                                                "onErrorAction": "no-action",
                                                "uiMetaData": {
                                                    "type": "blank"
                                                },
                                                "cyclic": true
                                            }
                                        ],
                                        "permissions": [
                                            "Registrant"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {
                                            "type": "blank",
                                            "title": "Devices"
                                        }
                                    },
                                    {
                                        "id": "5cf0c0cd-1ab3-4383-82d3-dde2d853a902",
                                        "tag": "issue_requests_page",
                                        "blockType": "interfaceContainerBlock",
                                        "defaultActive": true,
                                        "children": [
                                            {
                                                "id": "849d0cff-a21e-45ef-ab42-b90934b76c69",
                                                "tag": "issue_requests_grid",
                                                "blockType": "interfaceDocumentsSourceBlock",
                                                "defaultActive": true,
                                                "children": [
                                                    {
                                                        "id": "625894be-8460-435e-bc41-eddd24ef0c5a",
                                                        "tag": "issue_requests_source",
                                                        "blockType": "documentsSourceAddon",
                                                        "defaultActive": false,
                                                        "children": [
                                                            {
                                                                "id": "60229204-bbc3-497d-8190-080d48036e3e",
                                                                "tag": "issue_by_device",
                                                                "blockType": "filtersAddon",
                                                                "defaultActive": true,
                                                                "children": [
                                                                    {
                                                                        "id": "0fbf0df1-4bd7-4663-8db0-58e61feca937",
                                                                        "tag": "devices_source_from_filters",
                                                                        "blockType": "documentsSourceAddon",
                                                                        "defaultActive": false,
                                                                        "children": [],
                                                                        "permissions": [
                                                                            "Registrant"
                                                                        ],
                                                                        "onErrorAction": "no-action",
                                                                        "filters": [
                                                                            {
                                                                                "value": "Approved",
                                                                                "field": "option.status",
                                                                                "type": "equal"
                                                                            },
                                                                            {
                                                                                "value": "device",
                                                                                "field": "type",
                                                                                "type": "equal"
                                                                            }
                                                                        ],
                                                                        "dataType": "vc-documents",
                                                                        "schema": "#0bb392cd-17ee-43e7-b4fd-85fd392dae24&1.0.0",
                                                                        "onlyOwnDocuments": true
                                                                    }
                                                                ],
                                                                "permissions": [
                                                                    "Registrant"
                                                                ],
                                                                "onErrorAction": "no-action",
                                                                "uiMetaData": {
                                                                    "options": [],
                                                                    "content": "Device"
                                                                },
                                                                "type": "dropdown",
                                                                "field": "document.credentialSubject.0.ref",
                                                                "optionName": "document.credentialSubject.0.field3.field0",
                                                                "optionValue": "document.credentialSubject.0.id"
                                                            }
                                                        ],
                                                        "permissions": [
                                                            "Registrant"
                                                        ],
                                                        "onErrorAction": "no-action",
                                                        "filters": [
                                                            {
                                                                "value": "issue_request",
                                                                "field": "type",
                                                                "type": "equal"
                                                            }
                                                        ],
                                                        "dataType": "vc-documents",
                                                        "schema": "#17d892a5-4d98-43e1-aa78-e42ffc9ec64d&1.0.0",
                                                        "onlyOwnDocuments": true
                                                    }
                                                ],
                                                "permissions": [
                                                    "Registrant"
                                                ],
                                                "onErrorAction": "no-action",
                                                "uiMetaData": {
                                                    "fields": [
                                                        {
                                                            "title": "Production Period Start Date",
                                                            "name": "document.credentialSubject.0.field6",
                                                            "type": "text"
                                                        },
                                                        {
                                                            "title": "Production Period End Date",
                                                            "name": "document.credentialSubject.0.field8",
                                                            "type": "text"
                                                        },
                                                        {
                                                            "title": "Total kWh Produced in this period",
                                                            "name": "document.credentialSubject.0.field7",
                                                            "type": "text"
                                                        },
                                                        {
                                                            "title": "Date",
                                                            "name": "document.issuanceDate",
                                                            "type": "text"
                                                        },
                                                        {
                                                            "name": "option.status",
                                                            "title": "Status",
                                                            "type": "text"
                                                        },
                                                        {
                                                            "name": "document",
                                                            "title": "Document",
                                                            "tooltip": "",
                                                            "type": "button",
                                                            "action": "dialog",
                                                            "content": "View Document",
                                                            "uiClass": "link",
                                                            "dialogContent": "VC",
                                                            "dialogClass": "",
                                                            "dialogType": "json"
                                                        }
                                                    ]
                                                },
                                                "dependencies": [
                                                    "create_issue_request",
                                                    "save_issue_status(minted)",
                                                    "save_issue_status(minting)",
                                                    "save_issue_status(reject)"
                                                ]
                                            }
                                        ],
                                        "permissions": [
                                            "Registrant"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {
                                            "type": "blank",
                                            "title": "Issue Requests"
                                        }
                                    },
                                    {
                                        "id": "d77bce9e-38b2-447d-9070-ede109353d1d",
                                        "tag": "token_history_page",
                                        "blockType": "interfaceContainerBlock",
                                        "defaultActive": true,
                                        "children": [
                                            {
                                                "id": "49c1fd87-8374-4ceb-b441-84b8c581d243",
                                                "tag": "token_history_grid",
                                                "blockType": "interfaceDocumentsSourceBlock",
                                                "defaultActive": true,
                                                "children": [
                                                    {
                                                        "id": "06337d1a-b428-4e15-949c-16c039ea4c54",
                                                        "tag": "token_history_source",
                                                        "blockType": "documentsSourceAddon",
                                                        "defaultActive": false,
                                                        "children": [
                                                            {
                                                                "id": "d24e11d3-2b7b-4c99-9a56-79e8c4a93e2c",
                                                                "tag": "token_history_source_filter",
                                                                "blockType": "filtersAddon",
                                                                "defaultActive": true,
                                                                "children": [
                                                                    {
                                                                        "id": "0a773064-3b43-4b3f-b2f1-59cad2dd8467",
                                                                        "tag": "devices_source_from_filters2",
                                                                        "blockType": "documentsSourceAddon",
                                                                        "defaultActive": false,
                                                                        "children": [],
                                                                        "permissions": [
                                                                            "Registrant"
                                                                        ],
                                                                        "onErrorAction": "no-action",
                                                                        "filters": [
                                                                            {
                                                                                "value": "Approved",
                                                                                "field": "option.status",
                                                                                "type": "equal"
                                                                            },
                                                                            {
                                                                                "value": "device",
                                                                                "field": "type",
                                                                                "type": "equal"
                                                                            }
                                                                        ],
                                                                        "dataType": "vc-documents",
                                                                        "schema": "#0bb392cd-17ee-43e7-b4fd-85fd392dae24&1.0.0",
                                                                        "onlyOwnDocuments": true
                                                                    }
                                                                ],
                                                                "permissions": [
                                                                    "Registrant"
                                                                ],
                                                                "onErrorAction": "no-action",
                                                                "uiMetaData": {
                                                                    "options": [],
                                                                    "content": "Device"
                                                                },
                                                                "type": "dropdown",
                                                                "optionName": "document.credentialSubject.0.field3.field0",
                                                                "optionValue": "document.credentialSubject.0.id",
                                                                "field": "document.verifiableCredential.0.credentialSubject.0.field1"
                                                            }
                                                        ],
                                                        "permissions": [
                                                            "Registrant"
                                                        ],
                                                        "onErrorAction": "no-action",
                                                        "filters": [],
                                                        "dataType": "vp-documents",
                                                        "onlyOwnDocuments": false
                                                    }
                                                ],
                                                "permissions": [
                                                    "Registrant"
                                                ],
                                                "onErrorAction": "no-action",
                                                "uiMetaData": {
                                                    "fields": [
                                                        {
                                                            "title": "Date",
                                                            "name": "document.verifiableCredential.1.credentialSubject.0.date",
                                                            "tooltip": "",
                                                            "type": "text"
                                                        },
                                                        {
                                                            "title": "Token Id",
                                                            "name": "document.verifiableCredential.1.credentialSubject.0.tokenId",
                                                            "tooltip": "",
                                                            "type": "text"
                                                        },
                                                        {
                                                            "title": "Serials",
                                                            "name": "document.verifiableCredential.1.credentialSubject.0.serials",
                                                            "tooltip": "",
                                                            "type": "text"
                                                        }
                                                    ]
                                                }
                                            }
                                        ],
                                        "permissions": [
                                            "Registrant"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {
                                            "type": "blank",
                                            "title": "Token History"
                                        }
                                    }
                                ],
                                "permissions": [
                                    "Registrant"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {
                                    "type": "tabs"
                                }
                            },
                            {
                                "id": "b50e5c11-54ab-4212-8eb7-a2ee54fe4df9",
                                "tag": "save_application_status(reject)",
                                "blockType": "sendToGuardianBlock",
                                "defaultActive": false,
                                "children": [],
                                "permissions": [
                                    "Registrant"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {},
                                "options": [
                                    {
                                        "name": "status",
                                        "value": "Rejected"
                                    }
                                ],
                                "dataType": "",
                                "entityType": "registrant",
                                "dataSource": "database",
                                "documentType": "vc"
                            },
                            {
                                "id": "54de67e7-ca43-4e8f-b2a6-2d52170bae0d",
                                "tag": "application_rejected",
                                "blockType": "informationBlock",
                                "defaultActive": true,
                                "children": [],
                                "permissions": [
                                    "Registrant"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {
                                    "title": "Rejected",
                                    "description": "Your application was rejected",
                                    "type": "text"
                                },
                                "stopPropagation": true
                            }
                        ],
                        "permissions": [
                            "Registrant"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {
                            "type": "blank"
                        }
                    }
                ],
                "permissions": [
                    "Registrant"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {
                    "type": "blank"
                }
            },
            {
                "id": "35a2c9a9-8f7c-4d61-a8d3-0d7b815883eb",
                "tag": "evident_workflow",
                "blockType": "interfaceContainerBlock",
                "defaultActive": true,
                "children": [
                    {
                        "id": "12288e3d-68a6-4e6c-bc34-683620041ce1",
                        "tag": "approve_application_page",
                        "blockType": "interfaceContainerBlock",
                        "defaultActive": true,
                        "children": [
                            {
                                "id": "f46af5f5-e0f2-4ede-bcd2-8e1a55bd1fca",
                                "tag": "registrants_grid",
                                "blockType": "interfaceDocumentsSourceBlock",
                                "defaultActive": true,
                                "children": [
                                    {
                                        "id": "bb1b84e4-3524-4849-a646-cca3623b0d75",
                                        "tag": "registrants_source(need_approve)",
                                        "blockType": "documentsSourceAddon",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "filters": [
                                            {
                                                "value": "Waiting for approval",
                                                "field": "option.status",
                                                "type": "equal"
                                            },
                                            {
                                                "value": "registrant",
                                                "field": "type",
                                                "type": "equal"
                                            }
                                        ],
                                        "dataType": "vc-documents",
                                        "schema": "#732d99d8-b254-4aa7-8bb4-e78f15212892&1.0.0"
                                    },
                                    {
                                        "id": "1adf6b92-a184-43f4-99ab-3113fee26fa1",
                                        "tag": "registrants_source(approved)",
                                        "blockType": "documentsSourceAddon",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "filters": [
                                            {
                                                "value": "Waiting for approval",
                                                "field": "option.status",
                                                "type": "not_equal"
                                            },
                                            {
                                                "value": "registrant",
                                                "field": "type",
                                                "type": "equal"
                                            }
                                        ],
                                        "dataType": "vc-documents",
                                        "schema": "#732d99d8-b254-4aa7-8bb4-e78f15212892&1.0.0"
                                    }
                                ],
                                "permissions": [
                                    "OWNER"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {
                                    "fields": [
                                        {
                                            "title": "Legal Name",
                                            "name": "document.credentialSubject.0.field1.field0",
                                            "type": "text"
                                        },
                                        {
                                            "title": "Organization Name",
                                            "name": "document.credentialSubject.0.field2.field0",
                                            "type": "text"
                                        },
                                        {
                                            "title": "Operation",
                                            "name": "option.status",
                                            "type": "text",
                                            "width": "250px",
                                            "bindGroup": "registrants_source(approved)",
                                            "action": "",
                                            "url": "",
                                            "dialogContent": "",
                                            "dialogClass": "",
                                            "dialogType": "",
                                            "bindBlock": ""
                                        },
                                        {
                                            "title": "Operation",
                                            "name": "option.status",
                                            "tooltip": "",
                                            "type": "block",
                                            "action": "",
                                            "url": "",
                                            "dialogContent": "",
                                            "dialogClass": "",
                                            "dialogType": "",
                                            "bindBlock": "approve_registrant_btn",
                                            "width": "250px",
                                            "bindGroup": "registrants_source(need_approve)"
                                        },
                                        {
                                            "name": "document",
                                            "title": "Document",
                                            "tooltip": "",
                                            "type": "button",
                                            "action": "dialog",
                                            "content": "View Document",
                                            "uiClass": "link",
                                            "dialogContent": "VC",
                                            "dialogClass": "",
                                            "dialogType": "json"
                                        }
                                    ]
                                },
                                "dependencies": [
                                    "save_application_status(approve)",
                                    "save_application_status(reject)"
                                ]
                            },
                            {
                                "id": "c2eef66b-ec9f-42c5-99b2-430625c49e88",
                                "tag": "approve_registrant_btn",
                                "blockType": "interfaceActionBlock",
                                "defaultActive": false,
                                "children": [],
                                "permissions": [
                                    "OWNER"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {
                                    "options": [
                                        {
                                            "title": "",
                                            "name": "Approve",
                                            "tooltip": "",
                                            "type": "text",
                                            "value": "Approved",
                                            "uiClass": "btn-approve",
                                            "bindBlock": "save_application_status(approve)"
                                        },
                                        {
                                            "title": "",
                                            "name": "Reject",
                                            "tooltip": "",
                                            "type": "text",
                                            "value": "Rejected",
                                            "uiClass": "btn-reject",
                                            "bindBlock": "save_application_status(reject)"
                                        }
                                    ]
                                },
                                "type": "selector",
                                "field": "option.status"
                            }
                        ],
                        "permissions": [
                            "OWNER"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {
                            "type": "blank",
                            "title": "Applications"
                        }
                    },
                    {
                        "id": "96e1f20a-6e3e-46a7-9dcf-49f8cf4f7b59",
                        "tag": "approve_device_page",
                        "blockType": "interfaceContainerBlock",
                        "defaultActive": true,
                        "children": [
                            {
                                "id": "5d570f5b-a533-4481-8602-bb8355b50b46",
                                "tag": "approve_devices_grid",
                                "blockType": "interfaceDocumentsSourceBlock",
                                "defaultActive": true,
                                "children": [
                                    {
                                        "id": "fa2732a1-1e98-4852-91b7-43ec49c1c10c",
                                        "tag": "approve_devices_source(need_approve)",
                                        "blockType": "documentsSourceAddon",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "filters": [
                                            {
                                                "value": "Waiting for approval",
                                                "field": "option.status",
                                                "type": "equal"
                                            },
                                            {
                                                "value": "device",
                                                "field": "type",
                                                "type": "equal"
                                            }
                                        ],
                                        "dataType": "vc-documents",
                                        "schema": "#0bb392cd-17ee-43e7-b4fd-85fd392dae24&1.0.0"
                                    },
                                    {
                                        "id": "4a8cf9d1-6df8-45eb-9e7d-99c6455283c8",
                                        "tag": "approve_devices_source(approved)",
                                        "blockType": "documentsSourceAddon",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "filters": [
                                            {
                                                "value": "Waiting for approval",
                                                "field": "option.status",
                                                "type": "not_equal"
                                            },
                                            {
                                                "value": "device",
                                                "field": "type",
                                                "type": "equal"
                                            }
                                        ],
                                        "dataType": "vc-documents",
                                        "schema": "#0bb392cd-17ee-43e7-b4fd-85fd392dae24&1.0.0"
                                    }
                                ],
                                "permissions": [
                                    "OWNER"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {
                                    "fields": [
                                        {
                                            "title": "Organization Name",
                                            "name": "document.credentialSubject.0.field3.field0",
                                            "type": "text"
                                        },
                                        {
                                            "title": "Device Name",
                                            "name": "document.credentialSubject.0.field4.field0",
                                            "type": "text"
                                        },
                                        {
                                            "title": "Address",
                                            "name": "document.credentialSubject.0.field4.field1",
                                            "type": "text"
                                        },
                                        {
                                            "title": "Longitude",
                                            "name": "document.credentialSubject.0.field4.field4",
                                            "type": "text"
                                        },
                                        {
                                            "title": "Latitude",
                                            "name": "document.credentialSubject.0.field4.field5",
                                            "type": "text"
                                        },
                                        {
                                            "title": "Capacity (kW)",
                                            "name": "document.credentialSubject.0.field4.field7",
                                            "type": "text"
                                        },
                                        {
                                            "name": "option.status",
                                            "title": "Operation",
                                            "type": "text",
                                            "width": "250px",
                                            "bindGroup": "approve_devices_source(approved)",
                                            "action": "",
                                            "url": "",
                                            "dialogContent": "",
                                            "dialogClass": "",
                                            "dialogType": "",
                                            "bindBlock": ""
                                        },
                                        {
                                            "title": "Operation",
                                            "name": "option.status",
                                            "tooltip": "",
                                            "type": "block",
                                            "action": "",
                                            "url": "",
                                            "dialogContent": "",
                                            "dialogClass": "",
                                            "dialogType": "",
                                            "bindBlock": "approve_device_btn",
                                            "width": "250px",
                                            "bindGroup": "approve_devices_source(need_approve)"
                                        },
                                        {
                                            "name": "document",
                                            "title": "Document",
                                            "tooltip": "",
                                            "type": "button",
                                            "action": "dialog",
                                            "content": "View Document",
                                            "uiClass": "link",
                                            "dialogContent": "VC",
                                            "dialogClass": "",
                                            "dialogType": "json"
                                        }
                                    ]
                                },
                                "dependencies": [
                                    "create_device",
                                    "save_device_status(approved)",
                                    "save_device_status(reject)"
                                ]
                            },
                            {
                                "id": "12b8bd1d-8429-4917-90f4-cdfcced32d46",
                                "tag": "approve_device_btn",
                                "blockType": "interfaceActionBlock",
                                "defaultActive": false,
                                "children": [],
                                "permissions": [
                                    "OWNER"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {
                                    "options": [
                                        {
                                            "title": "",
                                            "name": "Approve",
                                            "tooltip": "",
                                            "type": "text",
                                            "value": "Approved",
                                            "uiClass": "btn-approve",
                                            "bindBlock": "save_device_status(approved)"
                                        },
                                        {
                                            "title": "",
                                            "name": "Reject",
                                            "tooltip": "",
                                            "type": "text",
                                            "value": "Rejected",
                                            "uiClass": "btn-reject",
                                            "bindBlock": "save_device_status(reject)"
                                        }
                                    ]
                                },
                                "type": "selector",
                                "field": "option.status"
                            },
                            {
                                "id": "ba063b00-e9b4-400c-b509-804d572397e2",
                                "tag": "save_device_status(approved)",
                                "blockType": "sendToGuardianBlock",
                                "defaultActive": false,
                                "children": [],
                                "permissions": [
                                    "OWNER"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {},
                                "options": [
                                    {
                                        "name": "status",
                                        "value": "Approved"
                                    }
                                ],
                                "stopPropagation": false,
                                "dataType": "",
                                "entityType": "device",
                                "dataSource": "database",
                                "documentType": "vc"
                            },
                            {
                                "id": "369549d1-9d85-4b15-90b5-6ed153ffdd91",
                                "tag": "sign_device_by_issuer",
                                "blockType": "reassigningBlock",
                                "defaultActive": false,
                                "children": [],
                                "permissions": [
                                    "OWNER"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {},
                                "actor": "",
                                "issuer": "policyOwner"
                            },
                            {
                                "id": "a4e3cd8b-92d2-4c22-bfbb-92bd496d0d75",
                                "tag": "save_copy_device(hedera)",
                                "blockType": "sendToGuardianBlock",
                                "defaultActive": false,
                                "children": [],
                                "permissions": [
                                    "OWNER"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {},
                                "options": [],
                                "dataSource": "hedera",
                                "documentType": "vc",
                                "topic": "Project",
                                "entityType": "device(Approved)",
                                "topicOwner": "owner"
                            },
                            {
                                "id": "a36c2d1c-9572-4cb8-8b63-8994cc0697bd",
                                "tag": "save_copy_device",
                                "blockType": "sendToGuardianBlock",
                                "defaultActive": false,
                                "children": [],
                                "permissions": [
                                    "OWNER"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {},
                                "options": [
                                    {
                                        "name": "status",
                                        "value": "Approved"
                                    }
                                ],
                                "entityType": "device(Approved)",
                                "dataType": "",
                                "stopPropagation": true,
                                "forceNew": true,
                                "dataSource": "database",
                                "documentType": "vc"
                            },
                            {
                                "id": "4e506ada-30ea-4976-b8b4-f6347b4e8464",
                                "tag": "save_device_status(reject)",
                                "blockType": "sendToGuardianBlock",
                                "defaultActive": false,
                                "children": [],
                                "permissions": [
                                    "OWNER"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {},
                                "options": [
                                    {
                                        "name": "status",
                                        "value": "Rejected"
                                    }
                                ],
                                "stopPropagation": true,
                                "dataType": "",
                                "entityType": "device",
                                "dataSource": "database",
                                "documentType": "vc"
                            }
                        ],
                        "permissions": [
                            "OWNER"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {
                            "type": "blank",
                            "title": "Devices"
                        }
                    },
                    {
                        "id": "250e8b46-463d-4382-bff3-0d28e353ef62",
                        "tag": "approve_issue_requests_page",
                        "blockType": "interfaceContainerBlock",
                        "defaultActive": true,
                        "children": [
                            {
                                "id": "965abb1d-f2c4-4839-9bbe-97b166e6a563",
                                "tag": "issue_requests_grid(evident)",
                                "blockType": "interfaceDocumentsSourceBlock",
                                "defaultActive": true,
                                "children": [
                                    {
                                        "id": "42bed28d-a657-479c-aac0-72fd3a15ccf0",
                                        "tag": "issue_requests_source(need_approve)",
                                        "blockType": "documentsSourceAddon",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "filters": [
                                            {
                                                "value": "Waiting for approval",
                                                "field": "option.status",
                                                "type": "equal"
                                            },
                                            {
                                                "value": "issue_request",
                                                "field": "type",
                                                "type": "equal"
                                            }
                                        ],
                                        "dataType": "vc-documents",
                                        "schema": "#17d892a5-4d98-43e1-aa78-e42ffc9ec64d&1.0.0"
                                    },
                                    {
                                        "id": "1e98a1a2-8885-4148-a55d-1e0139787f83",
                                        "tag": "issue_requests_source(approved)",
                                        "blockType": "documentsSourceAddon",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "filters": [
                                            {
                                                "value": "Waiting for approval",
                                                "field": "option.status",
                                                "type": "not_equal"
                                            },
                                            {
                                                "value": "issue_request",
                                                "field": "type",
                                                "type": "equal"
                                            }
                                        ],
                                        "dataType": "vc-documents",
                                        "schema": "#17d892a5-4d98-43e1-aa78-e42ffc9ec64d&1.0.0"
                                    }
                                ],
                                "permissions": [
                                    "OWNER"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {
                                    "fields": [
                                        {
                                            "title": "Organization Name",
                                            "name": "document.credentialSubject.0.field2.field0",
                                            "type": "text"
                                        },
                                        {
                                            "title": "Production Period Start Date",
                                            "name": "document.credentialSubject.0.field6",
                                            "type": "text"
                                        },
                                        {
                                            "title": "Production Period End Date",
                                            "name": "document.credentialSubject.0.field8",
                                            "type": "text"
                                        },
                                        {
                                            "title": "Total kWh Produced in this period",
                                            "name": "document.credentialSubject.0.field7",
                                            "type": "text"
                                        },
                                        {
                                            "title": "Date",
                                            "name": "document.issuanceDate",
                                            "type": "text"
                                        },
                                        {
                                            "name": "option.status",
                                            "title": "Operation",
                                            "type": "text",
                                            "width": "250px",
                                            "bindGroup": "issue_requests_source(approved)",
                                            "action": "",
                                            "url": "",
                                            "dialogContent": "",
                                            "dialogClass": "",
                                            "dialogType": "",
                                            "bindBlock": ""
                                        },
                                        {
                                            "title": "Operation",
                                            "name": "option.status",
                                            "tooltip": "",
                                            "type": "block",
                                            "action": "",
                                            "url": "",
                                            "dialogContent": "",
                                            "dialogClass": "",
                                            "dialogType": "",
                                            "bindBlock": "approve_issue_requests_btn",
                                            "width": "250px",
                                            "bindGroup": "issue_requests_source(need_approve)"
                                        },
                                        {
                                            "name": "document",
                                            "title": "Document",
                                            "tooltip": "",
                                            "type": "button",
                                            "action": "dialog",
                                            "content": "View Document",
                                            "uiClass": "link",
                                            "dialogContent": "VC",
                                            "dialogClass": "",
                                            "dialogType": "json"
                                        }
                                    ]
                                },
                                "dependencies": [
                                    "create_issue_request",
                                    "save_issue_status(minted)",
                                    "save_issue_status(minting)",
                                    "save_issue_status(reject)"
                                ]
                            },
                            {
                                "id": "5216642b-1df2-4bc2-93a8-2c019885d53b",
                                "tag": "approve_issue_requests_btn",
                                "blockType": "interfaceActionBlock",
                                "defaultActive": false,
                                "children": [],
                                "permissions": [
                                    "OWNER"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {
                                    "options": [
                                        {
                                            "title": "",
                                            "name": "Approve",
                                            "tooltip": "",
                                            "type": "text",
                                            "value": "Approved",
                                            "uiClass": "btn-approve",
                                            "bindBlock": "save_issue_status(approved)"
                                        },
                                        {
                                            "title": "",
                                            "name": "Reject",
                                            "tooltip": "",
                                            "type": "text",
                                            "value": "Rejected",
                                            "uiClass": "btn-reject",
                                            "bindBlock": "save_issue_status(reject)"
                                        }
                                    ]
                                },
                                "type": "selector",
                                "field": "option.status"
                            },
                            {
                                "id": "e78af134-673c-4ab1-91b4-a7d3f859a1e1",
                                "tag": "mint_events",
                                "blockType": "interfaceContainerBlock",
                                "defaultActive": false,
                                "children": [
                                    {
                                        "id": "07d04683-db3e-43df-899c-e7a9e2527af6",
                                        "tag": "save_issue_status(approved)",
                                        "blockType": "sendToGuardianBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {},
                                        "options": [
                                            {
                                                "name": "status",
                                                "value": "Approved"
                                            }
                                        ],
                                        "entityType": "issue_request",
                                        "dataType": "",
                                        "dataSource": "database",
                                        "documentType": "vc"
                                    },
                                    {
                                        "id": "8f1b240f-e03f-434a-b84d-b385c59d0857",
                                        "tag": "sign_issue_by_issuer",
                                        "blockType": "calculateContainerBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "inputFields": [
                                            {
                                                "name": "field0",
                                                "title": "Registrant Id",
                                                "value": "field0"
                                            },
                                            {
                                                "name": "field1",
                                                "title": "Production Device/Production Group Id",
                                                "value": "field1"
                                            },
                                            {
                                                "name": "field2",
                                                "title": "Registrant Details",
                                                "value": "field2"
                                            },
                                            {
                                                "name": "field3",
                                                "title": "Production Device/Production Group",
                                                "value": "field3"
                                            },
                                            {
                                                "name": "field4",
                                                "title": "Labelling scheme(s)",
                                                "value": "field4"
                                            },
                                            {
                                                "name": "field5",
                                                "title": "Last registration date",
                                                "value": "field5"
                                            },
                                            {
                                                "name": "field6",
                                                "title": "Production Period Start Date",
                                                "value": "field6"
                                            },
                                            {
                                                "name": "field7",
                                                "title": "Total kWh Produced in this period",
                                                "value": "field7"
                                            },
                                            {
                                                "name": "field8",
                                                "title": "Production Period End Date",
                                                "value": "field8"
                                            },
                                            {
                                                "name": "field9",
                                                "title": "Percentage of eligible total applied for",
                                                "value": "field9"
                                            },
                                            {
                                                "name": "field10",
                                                "title": "Type a: Settlement Metering data",
                                                "value": "field10"
                                            },
                                            {
                                                "name": "field11",
                                                "title": "Type b: Non-settlement Metering data",
                                                "value": "field11"
                                            },
                                            {
                                                "name": "field12",
                                                "title": "Type c: Measured Volume Transfer documentation",
                                                "value": "field12"
                                            },
                                            {
                                                "name": "field13",
                                                "title": "Type d: Other",
                                                "value": "field13"
                                            },
                                            {
                                                "name": "field14",
                                                "title": "Is the production of this electricity counted towards a national, sub-national or regulatory target?",
                                                "value": "field14"
                                            },
                                            {
                                                "name": "field15",
                                                "title": "Is any of this production subject to a public consumption obligation?",
                                                "value": "field15"
                                            },
                                            {
                                                "name": "field16",
                                                "title": "Do you retain the right to obtain emissions reduction certificates or carbon offsets for the energy nominated in this Issue Request?",
                                                "value": "field16"
                                            },
                                            {
                                                "name": "field17",
                                                "title": "I-REC Participant name",
                                                "value": "field17"
                                            },
                                            {
                                                "name": "field18",
                                                "title": "Account number",
                                                "value": "field18"
                                            }
                                        ],
                                        "outputFields": [
                                            {
                                                "name": "field0",
                                                "title": "Registrant Id",
                                                "value": "field0"
                                            },
                                            {
                                                "name": "field1",
                                                "title": "Production Device/Production Group Id",
                                                "value": "field1"
                                            },
                                            {
                                                "name": "field2",
                                                "title": "Registrant Details",
                                                "value": "field2"
                                            },
                                            {
                                                "name": "field3",
                                                "title": "Production Device/Production Group",
                                                "value": "field3"
                                            },
                                            {
                                                "name": "field4",
                                                "title": "Labelling scheme(s)",
                                                "value": "field4"
                                            },
                                            {
                                                "name": "field5",
                                                "title": "Last registration date",
                                                "value": "field5"
                                            },
                                            {
                                                "name": "field6",
                                                "title": "Production Period Start Date",
                                                "value": "field6"
                                            },
                                            {
                                                "name": "field7",
                                                "title": "Total kWh Produced in this period",
                                                "value": "field7"
                                            },
                                            {
                                                "name": "field8",
                                                "title": "Production Period End Date",
                                                "value": "field8"
                                            },
                                            {
                                                "name": "field9",
                                                "title": "Percentage of eligible total applied for",
                                                "value": "field9"
                                            },
                                            {
                                                "name": "field10",
                                                "title": "Type a: Settlement Metering data",
                                                "value": "field10"
                                            },
                                            {
                                                "name": "field11",
                                                "title": "Type b: Non-settlement Metering data",
                                                "value": "field11"
                                            },
                                            {
                                                "name": "field12",
                                                "title": "Type c: Measured Volume Transfer documentation",
                                                "value": "field12"
                                            },
                                            {
                                                "name": "field13",
                                                "title": "Type d: Other",
                                                "value": "field13"
                                            },
                                            {
                                                "name": "field14",
                                                "title": "Is the production of this electricity counted towards a national, sub-national or regulatory target?",
                                                "value": "field14"
                                            },
                                            {
                                                "name": "field15",
                                                "title": "Is any of this production subject to a public consumption obligation?",
                                                "value": "field15"
                                            },
                                            {
                                                "name": "field16",
                                                "title": "Do you retain the right to obtain emissions reduction certificates or carbon offsets for the energy nominated in this Issue Request?",
                                                "value": "field16"
                                            },
                                            {
                                                "name": "field17",
                                                "title": "I-REC Participant name",
                                                "value": "field17"
                                            },
                                            {
                                                "name": "field18",
                                                "title": "Account number",
                                                "value": "field18"
                                            }
                                        ],
                                        "inputSchema": "#17d892a5-4d98-43e1-aa78-e42ffc9ec64d&1.0.0",
                                        "outputSchema": "#17d892a5-4d98-43e1-aa78-e42ffc9ec64d&1.0.0"
                                    },
                                    {
                                        "id": "ca5480c9-09eb-439c-9a10-c0c8f94ebb48",
                                        "tag": "save_copy_issue(hedera)",
                                        "blockType": "sendToGuardianBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {},
                                        "options": [],
                                        "dataSource": "hedera",
                                        "documentType": "vc",
                                        "topic": "Project",
                                        "topicOwner": "owner"
                                    },
                                    {
                                        "id": "ea14d0fc-3a5d-44c6-b10b-924cc9747f6e",
                                        "tag": "save_copy_issue",
                                        "blockType": "sendToGuardianBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {},
                                        "options": [
                                            {
                                                "name": "status",
                                                "value": "Minting"
                                            }
                                        ],
                                        "entityType": "issue_request(Approved)",
                                        "dataType": "",
                                        "forceNew": true,
                                        "dataSource": "database",
                                        "documentType": "vc"
                                    },
                                    {
                                        "id": "37c31f88-2a51-4260-944f-12429d0094bb",
                                        "tag": "mint_token",
                                        "blockType": "mintDocumentBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {},
                                        "tokenId": "0.0.34824585",
                                        "rule": "field7"
                                    },
                                    {
                                        "id": "acccb5c8-30bf-422f-addb-6fa3e63e30a6",
                                        "tag": "save_issue_status(minted)",
                                        "blockType": "sendToGuardianBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "uiMetaData": {},
                                        "options": [
                                            {
                                                "name": "status",
                                                "value": "Minted"
                                            }
                                        ],
                                        "entityType": "issue_request(Approved)",
                                        "dataType": "",
                                        "dataSource": "database",
                                        "documentType": "vc"
                                    }
                                ],
                                "permissions": [
                                    "OWNER"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {
                                    "type": "blank"
                                }
                            },
                            {
                                "id": "1b1fd6e3-ee03-40d0-b2f7-98fe8b5443e0",
                                "tag": "save_issue_status(reject)",
                                "blockType": "sendToGuardianBlock",
                                "defaultActive": false,
                                "children": [],
                                "permissions": [
                                    "OWNER"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {},
                                "options": [
                                    {
                                        "name": "status",
                                        "value": "Rejected"
                                    }
                                ],
                                "entityType": "issue_request",
                                "dataType": "",
                                "stopPropagation": true,
                                "dataSource": "database",
                                "documentType": "vc"
                            }
                        ],
                        "permissions": [
                            "OWNER"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {
                            "type": "blank",
                            "title": "Issue Requests"
                        }
                    },
                    {
                        "id": "eb1825cc-e364-4af3-9fb7-a346050e271c",
                        "tag": "VP",
                        "blockType": "interfaceContainerBlock",
                        "defaultActive": true,
                        "children": [
                            {
                                "id": "d6701c82-6426-4556-b0f4-d0e574611d87",
                                "tag": "vp_grid",
                                "blockType": "interfaceDocumentsSourceBlock",
                                "defaultActive": true,
                                "children": [
                                    {
                                        "id": "dc7e3e56-1fee-4d05-8592-d8578c7cdc29",
                                        "tag": "vp_source",
                                        "blockType": "documentsSourceAddon",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "filters": [],
                                        "dataType": "vp-documents"
                                    }
                                ],
                                "permissions": [
                                    "OWNER"
                                ],
                                "onErrorAction": "no-action",
                                "uiMetaData": {
                                    "fields": [
                                        {
                                            "title": "HASH",
                                            "name": "hash",
                                            "tooltip": "",
                                            "type": "text"
                                        },
                                        {
                                            "title": "Date",
                                            "name": "document.verifiableCredential.1.credentialSubject.0.date",
                                            "tooltip": "",
                                            "type": "text"
                                        },
                                        {
                                            "title": "Token Id",
                                            "name": "document.verifiableCredential.1.credentialSubject.0.tokenId",
                                            "tooltip": "",
                                            "type": "text"
                                        },
                                        {
                                            "title": "Serials",
                                            "name": "document.verifiableCredential.1.credentialSubject.0.serials",
                                            "tooltip": "",
                                            "type": "text"
                                        },
                                        {
                                            "title": "TrustChain",
                                            "name": "hash",
                                            "tooltip": "",
                                            "type": "button",
                                            "action": "link",
                                            "url": "",
                                            "dialogContent": "",
                                            "dialogClass": "",
                                            "dialogType": "",
                                            "bindBlock": "trustChainBlock",
                                            "content": "View TrustChain",
                                            "width": "150px"
                                        }
                                    ]
                                }
                            }
                        ],
                        "permissions": [
                            "OWNER"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {
                            "type": "blank",
                            "title": "Token History"
                        }
                    },
                    {
                        "id": "415dcbaf-8f1c-4be1-97ae-2aa7ab94add5",
                        "tag": "trust_chain",
                        "blockType": "interfaceContainerBlock",
                        "defaultActive": true,
                        "children": [
                            {
                                "id": "fefdd1de-fece-498d-a558-ee0be5c6e2d8",
                                "tag": "trustChainBlock",
                                "blockType": "reportBlock",
                                "defaultActive": true,
                                "children": [
                                    {
                                        "id": "a5f59886-79ff-47ec-9556-d3f58fe5155c",
                                        "tag": "MintTokenItem",
                                        "blockType": "reportItemBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "filters": [
                                            {
                                                "type": "equal",
                                                "typeValue": "variable",
                                                "field": "document.id",
                                                "value": "actionId"
                                            }
                                        ],
                                        "variables": [],
                                        "visible": true,
                                        "iconType": "COMMON",
                                        "title": "Token",
                                        "description": "Token[s] minted."
                                    },
                                    {
                                        "id": "802f59dc-5d98-41e4-8eeb-18ee4e674c1d",
                                        "tag": "issue_report(approved)",
                                        "blockType": "reportItemBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "filters": [
                                            {
                                                "typeValue": "value",
                                                "field": "type",
                                                "type": "equal",
                                                "value": "issue_request(Approved)"
                                            },
                                            {
                                                "type": "equal",
                                                "typeValue": "variable",
                                                "field": "document.id",
                                                "value": "documentId"
                                            }
                                        ],
                                        "variables": [
                                            {
                                                "value": "document.credentialSubject.0.id",
                                                "name": "issueId"
                                            },
                                            {
                                                "name": "registrantId",
                                                "value": "document.credentialSubject.0.field0"
                                            },
                                            {
                                                "name": "deviceId",
                                                "value": "document.credentialSubject.0.field1"
                                            }
                                        ],
                                        "visible": true,
                                        "iconType": "COMMON",
                                        "title": "Issue Request Review",
                                        "description": "Issue Request processed."
                                    },
                                    {
                                        "id": "f1083902-3216-4ad1-81ac-c35b0bf5b567",
                                        "tag": "issue_report(submit)",
                                        "blockType": "reportItemBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "filters": [
                                            {
                                                "typeValue": "value",
                                                "field": "type",
                                                "type": "equal",
                                                "value": "issue_request"
                                            },
                                            {
                                                "type": "equal",
                                                "typeValue": "variable",
                                                "field": "document.credentialSubject.0.id",
                                                "value": "issueId"
                                            }
                                        ],
                                        "variables": [],
                                        "visible": true,
                                        "iconType": "COMMON",
                                        "description": "Registrant submitted Issue Request to Issuer.",
                                        "title": "Issue Request"
                                    },
                                    {
                                        "id": "2b2aef32-1322-4ee5-8ce3-c2a0fc000622",
                                        "tag": "device_report(approved)",
                                        "blockType": "reportItemBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "filters": [
                                            {
                                                "typeValue": "value",
                                                "type": "equal",
                                                "field": "type",
                                                "value": "device(Approved)"
                                            },
                                            {
                                                "field": "document.credentialSubject.0.id",
                                                "value": "deviceId",
                                                "type": "equal",
                                                "typeValue": "variable"
                                            }
                                        ],
                                        "variables": [],
                                        "visible": true,
                                        "iconType": "COMMON",
                                        "description": "Device registration request processed.",
                                        "title": "Device Review"
                                    },
                                    {
                                        "id": "6cd69397-8c98-476b-9b80-484c5eebeb0a",
                                        "tag": "device_report(submit)",
                                        "blockType": "reportItemBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "filters": [
                                            {
                                                "value": "device",
                                                "field": "type",
                                                "type": "equal",
                                                "typeValue": "value"
                                            },
                                            {
                                                "field": "document.credentialSubject.0.id",
                                                "value": "deviceId",
                                                "type": "equal",
                                                "typeValue": "variable"
                                            }
                                        ],
                                        "variables": [],
                                        "visible": true,
                                        "iconType": "COMMON",
                                        "title": "Device Registration",
                                        "description": "Production Facility/Device registration request submitted to Issuer."
                                    },
                                    {
                                        "id": "2aeabc7a-5f87-44b2-8f3c-0efa0301f0a0",
                                        "tag": "registrant_report(approved)",
                                        "blockType": "reportItemBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "filters": [
                                            {
                                                "type": "equal",
                                                "typeValue": "value",
                                                "field": "type",
                                                "value": "registrant(Approved)"
                                            },
                                            {
                                                "field": "document.credentialSubject.0.id",
                                                "value": "registrantId",
                                                "type": "equal",
                                                "typeValue": "variable"
                                            }
                                        ],
                                        "variables": [],
                                        "visible": true,
                                        "iconType": "COMMON",
                                        "description": "Application/KYC processed.",
                                        "title": "Application Review"
                                    },
                                    {
                                        "id": "a93f46ea-cce0-4218-963a-3d5b634abe2a",
                                        "tag": "registrant_report(submit)",
                                        "blockType": "reportItemBlock",
                                        "defaultActive": false,
                                        "children": [],
                                        "permissions": [
                                            "OWNER"
                                        ],
                                        "onErrorAction": "no-action",
                                        "filters": [
                                            {
                                                "value": "registrant",
                                                "field": "type",
                                                "type": "equal",
                                                "typeValue": "value"
                                            },
                                            {
                                                "field": "document.credentialSubject.0.id",
                                                "value": "registrantId",
                                                "type": "equal",
                                                "typeValue": "variable"
                                            }
                                        ],
                                        "variables": [],
                                        "visible": true,
                                        "iconType": "COMMON",
                                        "description": "Application submitted to Issuer.",
                                        "title": "Registrant Application"
                                    }
                                ],
                                "permissions": [
                                    "OWNER"
                                ],
                                "onErrorAction": "no-action"
                            }
                        ],
                        "permissions": [
                            "OWNER"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {
                            "type": "blank",
                            "title": "TrustChain"
                        }
                    }
                ],
                "permissions": [
                    "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {
                    "type": "tabs"
                }
            }
        ]
    },
    "status": "PUBLISH",
    "creator": "did:hedera:testnet:G8S2SYNkuZq8R2MBRuBUagRSb4oucbZipJk8XADwe1T7;hedera:testnet:tid=0.0.34824275",
    "owner": "did:hedera:testnet:G8S2SYNkuZq8R2MBRuBUagRSb4oucbZipJk8XADwe1T7;hedera:testnet:tid=0.0.34824275",
    "policyRoles": [
        "Registrant"
    ],
    "policyTopics": [
        {
            "name": "Project",
            "description": "Project",
            "type": "any",
            "static": false
        }
    ],
    "registeredUsers": {
        "did:hedera:testnet:2naXnVQ86KZySwwWfMzh6Y9Tfj6mCHj5hY8sjLQvxP3B;hedera:testnet:tid=0.0.34824275": "Registrant"
    },
    "topicId": "0.0.34824582",
    "instanceTopicId": "0.0.34824602",
    "policyTag": "Tag_1652716862083",
    "messageId": "1652716935.214194999",
    "createDate": "2022-05-16T16:01:24.955Z"
}
```
{% endswagger-response %}
{% endswagger %}

#### Create Application uuid

{% swagger method="get" path="" baseUrl="/policies/{{policyId}}/tag/create_application" summary="Displaying Application uuid" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    "id": "c6a4db28-6a4f-4137-9b42-530783443147"
}
```
{% endswagger-response %}
{% endswagger %}

### Setting up the User Role

BLOCK : choose\_role

{% swagger method="post" path="" baseUrl="/policies/{policyId}/blocks/{blockId}" summary="User Role" %}
{% swagger-description %}
/policies/626bf178d24497fe1b1e4139/blocks/88ea01cb-35ae-4e4d-87ce-ec93d577cd30
{% endswagger-description %}

{% swagger-parameter in="body" name="role" type="String" required="true" %}
Registrant
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthorized" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="403: Forbidden" description="Forbidden" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```javascript
{
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Error'
}
```
{% endswagger-response %}
{% endswagger %}

### Submitting Registrant Application Form

BLOCK : create\_application

{% swagger method="post" path="" baseUrl="/policies/{policyId}/blocks/{blockId}" summary="Registrant Application form to be submitted" %}
{% swagger-description %}
/policies/626bf178d24497fe1b1e4139/blocks/8ae8f020-42ed-4692-9d93-4d700d467bd0
{% endswagger-description %}

{% swagger-parameter in="body" name="document" %}
&#x20;     "field0":"2022-04-01",

&#x20;     "field1":{

&#x20;        "field0":"Applicant Legal Name",

&#x20;        "field1":"Registered address line 1",

&#x20;        "field2":"Registered address line 2",

&#x20;        "field3":"Registered address line 3",

&#x20;        "field4":"Postal (ZIP) code",

&#x20;        "field5":"Country",

&#x20;        "field6":"Legal Status",

&#x20;        "field7":"Country of company registration/private residence",

&#x20;        "field8":"Corporate registration number/passport number",

&#x20;        "field9":"VAT number",

&#x20;        "field10":"Website URL",

&#x20;        "field11":"Main business (e.g. food retailer)",

&#x20;        "field12":2022,

&#x20;        "field13":1,

&#x20;        "field14":"Name of the Chief Executive Officer/General Manager",

&#x20;        "field15":"Chief Executive Officer/General Manager passport number",

&#x20;        "field16":"Please state in which countries the organization is active",

&#x20;        "field17":"Please list the main (>10%) shareholders",

&#x20;        "field18":1,

&#x20;        "field19":"test@mail.ru",

&#x20;        "type":"4510d95d-ed9d-4785-a5ed-5c1e334611dd",

&#x20;        "@context":\[

&#x20;           "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"

&#x20;        ]

&#x20;     },

&#x20;     "field2":{

&#x20;        "field0":"Organization Name",

&#x20;        "field1":"Address line 1",

&#x20;        "field2":"Address line 2",

&#x20;        "field3":"Address line 3",

&#x20;        "field4":"Postal code",

&#x20;        "field5":"Country",

&#x20;        "field6":"Contact person",

&#x20;        "field7":"test@mail.ru",

&#x20;        "field8":"Telephone",

&#x20;        "field9":"Fax",

&#x20;        "field10":"Existing I-REC Registry organization(s) to become subsidiary",

&#x20;        "type":"56ce048d-8e24-4aec-b76d-802688f651e8",

&#x20;        "@context":\[

&#x20;           "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"

&#x20;        ]

&#x20;     },

&#x20;     "field3":{

&#x20;        "field0":"Family Name (surname)",

&#x20;        "field1":"Other (Given) Names",

&#x20;        "field2":"Title",

&#x20;        "field3":"test@mail.ru",

&#x20;        "field4":"Telephone",

&#x20;        "field5":"Fax",

&#x20;        "type":"fb8c1458-e86f-444a-a408-665149bda777",

&#x20;        "@context":\[

&#x20;           "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"

&#x20;        ]

&#x20;     },

&#x20;     "type":"762694d6-8fbb-4377-ae3e-ef400bbc3ea5&1.0.0",

&#x20;     "@context":\[

&#x20;        "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"

&#x20;     ]
{% endswagger-parameter %}

{% swagger-parameter in="body" name="ref" %}
null
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthorized" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="403: Forbidden" description="Forbidden" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```javascript
{
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Error'
}
```
{% endswagger-response %}
{% endswagger %}

### Root Authority (Get Registrant Application to Approve)

#### Make GET request and get data\[i] and change option.status = “Approved”

BLOCK : registrants\_grid

{% swagger method="get" path="" baseUrl="/policies/{policyId}/blocks/{blockId}" summary="Getting Registrant Application for approval" %}
{% swagger-description %}
/policies/626c0490d24497fe1b1e415d/blocks/2f237418-9ed5-4a1e-a2ea-c7f978554784
{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
   "data":[
      {
         "id":"626c056cd24497fe1b1e4163",
         "owner":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",
         "hash":"GkX1mNd5wxWKCdkBYC6PBGHm9jmkNzsjb9ycqcP4jgPb",
         "document":{
            "id":"9d537f1d-c906-4013-9ac6-c6a0fd211e4a",
            "type":[
               "VerifiableCredential"
            ],
            "issuer":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",
            "issuanceDate":"2022-04-29T15:33:48.168Z",
            "@context":[
               "https://www.w3.org/2018/credentials/v1"
            ],
            "credentialSubject":[
               {
                  "field0":"2022-04-08",
                  "field1":{
                     "field0":"Applicant Legal Name",
                     "field1":"Registered address line 1",
                     "field2":"Registered address line 2",
                     "field3":"Registered address line 3",
                     "field4":"Postal (ZIP) code",
                     "field5":"Country",
                     "field6":"Legal Status",
                     "field7":"Country of company registration/private residence",
                     "field8":"Corporate registration number/passport number",
                     "field9":"VAT number",
                     "field10":"Website URL",
                     "field11":"Main business (e.g. food retailer)",
                     "field12":1,
                     "field13":1,
                     "field14":"Name of the Chief Executive Officer/General Manager",
                     "field15":"Chief Executive Officer/General Manager passport number",
                     "field16":"Please state in which countries the organization is active",
                     "field17":"Please list the main (>10%) shareholders",
                     "field18":1,
                     "field19":"test@mail.ru",
                     "type":"f7bd122d-4220-4d9d-abb2-fa9366e79975",
                     "@context":[
                        "https://ipfs.io/ipfs/bafkreiess6ak6lwlhar55ezckdwo6y7ki3wlyzyl3a7tadda2zuqaxwmbm"
                     ]
                  },
                  "field2":{
                     "field0":"Organization Name",
                     "field1":"Address line 1",
                     "field2":"Address line 2",
                     "field3":"Address line 3",
                     "field4":"Postal code",
                     "field5":"Country",
                     "field6":"Contact person",
                     "field7":"test@mail.ru",
                     "field8":"Telephone",
                     "field9":"Fax",
                     "field10":"Existing I-REC Registry organization(s) to become subsidiary",
                     "type":"a68073e6-bf56-43e3-99c4-5b433c983654",
                     "@context":[
                        "https://ipfs.io/ipfs/bafkreiess6ak6lwlhar55ezckdwo6y7ki3wlyzyl3a7tadda2zuqaxwmbm"
                     ]
                  },
                  "field3":{
                     "field0":"Family Name (surname)",
                     "field1":"Other (Given) Names",
                     "field2":"Title",
                     "field3":"test@mail.ru",
                     "field4":"Telephone",
                     "field5":"Fax",
                     "type":"9dca2898-d548-48a4-beec-fefd308f93cf",
                     "@context":[
                        "https://ipfs.io/ipfs/bafkreiess6ak6lwlhar55ezckdwo6y7ki3wlyzyl3a7tadda2zuqaxwmbm"
                     ]
                  },
                  "policyId":"626c0490d24497fe1b1e415d",
                  "@context":[
                     "https://ipfs.io/ipfs/bafkreiess6ak6lwlhar55ezckdwo6y7ki3wlyzyl3a7tadda2zuqaxwmbm"
                  ],
                  "id":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",
                  "type":"7b652d73-5978-45b4-992e-cc3ce732e27a&1.0.0"
               }
            ],
            "proof":{
               "type":"Ed25519Signature2018",
               "created":"2022-04-29T15:33:48Z",
               "verificationMethod":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316#did-root-key",
               "proofPurpose":"assertionMethod",
               "jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..GaOyMZ9dR5J0-iu6SICVNlWifON3DT0ytz2z_eCHeOSRY5oQ7Jb3219G7aUrztIEppMcfzG6teO-YvuNPiAfBw"
            }
         },
         "createDate":"2022-04-29T15:34:04.021Z",
         "updateDate":"2022-04-29T15:34:04.021Z",
         "hederaStatus":"ISSUE",
         "signature":0,
         "type":"registrant",
         "policyId":"626c0490d24497fe1b1e415d",
         "tag":"create_application(db)",
         "option":{
            "status":"Waiting for approval"
         },
         "schema":"#7b652d73-5978-45b4-992e-cc3ce732e27a&1.0.0",
         "messageId":"1651246443.516813000",
         "topicId":"0.0.34352381",
         "relationships":[
            
         ],
         "__sourceTag__":"registrants_source(need_approve)"
      }
   ],
   "blocks":[
      
   ],
   "commonAddons":[
      {
         "id":"c0dbe6b1-6963-4010-9dc4-c676679376dd",
         "blockType":"documentsSourceAddon"
      },
      {
         "id":"540a115b-a94e-4d16-af46-e4b817f07b98",
         "blockType":"documentsSourceAddon"
      }
   ],
   "fields":[
      {
         "title":"Legal Name",
         "name":"document.credentialSubject.0.field1.field0",
         "type":"text"
      },
      {
         "title":"Organization Name",
         "name":"document.credentialSubject.0.field2.field0",
         "type":"text"
      },
      {
         "title":"Operation",
         "name":"option.status",
         "type":"text",
         "width":"250px",
         "bindGroup":"registrants_source(approved)",
         "action":"",
         "url":"",
         "dialogContent":"",
         "dialogClass":"",
         "dialogType":"",
         "bindBlock":""
      },
      {
         "title":"Operation",
         "name":"option.status",
         "tooltip":"",
         "type":"block",
         "action":"",
         "url":"",
         "dialogContent":"",
         "dialogClass":"",
         "dialogType":"",
         "bindBlock":"approve_registrant_btn",
         "width":"250px",
         "bindGroup":"registrants_source(need_approve)"
      },
      {
         "name":"document",
         "title":"Document",
         "tooltip":"",
         "type":"button",
         "action":"dialog",
         "content":"View Document",
         "uiClass":"link",
         "dialogContent":"VC",
         "dialogClass":"",
         "dialogType":"json"
      }
   ]
}

```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthorized" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="403: Forbidden" description="Forbidden" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```javascript
{
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Error'
}
```
{% endswagger-response %}
{% endswagger %}

### Root Authority (Approve Registrant Application)

BLOCK : approve\_registrant\_btn

{% swagger method="post" path="" baseUrl="/policies/{policyId}/blocks/{blockId}" summary="Approving Registrant Application" %}
{% swagger-description %}
/policies/626bf178d24497fe1b1e4139/blocks/7f091726-126e-4bc7-8e2e-9cd7bb220ed0
{% endswagger-description %}

{% swagger-parameter in="body" name="id" %}
626bf6ddd24497fe1b1e413f
{% endswagger-parameter %}

{% swagger-parameter in="body" name="owner" %}
did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316
{% endswagger-parameter %}

{% swagger-parameter in="body" name="hash" %}
25J2gLm7phAEFu5yyQtVa8WqjUd8pDaxX1n6CtKR91rQ
{% endswagger-parameter %}

{% swagger-parameter in="body" name="document" %}
&#x20;     "id":"ebdc5776-e756-4cda-8e10-04c04adc535b",

&#x20;     "type":\[

&#x20;        "VerifiableCredential"

&#x20;     ],

&#x20;     "issuer":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",

&#x20;     "issuanceDate":"2022-04-29T14:31:39.500Z",

&#x20;     "@context":\[

&#x20;        "https://www.w3.org/2018/credentials/v1"

&#x20;     ],

&#x20;     "credentialSubject":\[

&#x20;        {

&#x20;           "field0":"2022-04-01",

&#x20;           "field1":{

&#x20;              "field0":"Applicant Legal Name",

&#x20;              "field1":"Registered address line 1",

&#x20;              "field2":"Registered address line 2",

&#x20;              "field3":"Registered address line 3",

&#x20;              "field4":"Postal (ZIP) code",

&#x20;              "field5":"Country",

&#x20;              "field6":"Legal Status",

&#x20;              "field7":"Country of company registration/private residence",

&#x20;              "field8":"Corporate registration number/passport number",

&#x20;              "field9":"VAT number",

&#x20;              "field10":"Website URL",

&#x20;              "field11":"Main business (e.g. food retailer)",

&#x20;              "field12":2022,

&#x20;              "field13":1,

&#x20;              "field14":"Name of the Chief Executive Officer/General Manager",

&#x20;              "field15":"Chief Executive Officer/General Manager passport number",

&#x20;              "field16":"Please state in which countries the organization is active",

&#x20;              "field17":"Please list the main (>10%) shareholders",

&#x20;              "field18":1,

&#x20;              "field19":"test@mail.ru",

&#x20;              "type":"4510d95d-ed9d-4785-a5ed-5c1e334611dd",

&#x20;              "@context":\[

&#x20;                 "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"

&#x20;              ]

&#x20;           },

&#x20;           "field2":{

&#x20;              "field0":"Organization Name",

&#x20;              "field1":"Address line 1",

&#x20;              "field2":"Address line 2",

&#x20;              "field3":"Address line 3",

&#x20;              "field4":"Postal code",

&#x20;              "field5":"Country",

&#x20;              "field6":"Contact person",

&#x20;              "field7":"test@mail.ru",

&#x20;              "field8":"Telephone",

&#x20;              "field9":"Fax",

&#x20;              "field10":"Existing I-REC Registry organization(s) to become subsidiary",

&#x20;              "type":"56ce048d-8e24-4aec-b76d-802688f651e8",

&#x20;              "@context":\[

&#x20;                 "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"

&#x20;              ]

&#x20;           },

&#x20;           "field3":{

&#x20;              "field0":"Family Name (surname)",

&#x20;              "field1":"Other (Given) Names",

&#x20;              "field2":"Title",

&#x20;              "field3":"test@mail.ru",

&#x20;              "field4":"Telephone",

&#x20;              "field5":"Fax",

&#x20;              "type":"fb8c1458-e86f-444a-a408-665149bda777",

&#x20;              "@context":\[

&#x20;                 "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"

&#x20;              ]

&#x20;           },

&#x20;           "policyId":"626bf178d24497fe1b1e4139",

&#x20;           "@context":\[

&#x20;              "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"

&#x20;           ],

&#x20;           "id":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",

&#x20;           "type":"762694d6-8fbb-4377-ae3e-ef400bbc3ea5&1.0.0"

&#x20;        }

&#x20;     ],

&#x20;     "proof":{

&#x20;        "type":"Ed25519Signature2018",

&#x20;        "created":"2022-04-29T14:31:39Z",

&#x20;        "verificationMethod":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316#did-root-key",

&#x20;        "proofPurpose":"assertionMethod",

&#x20;        "jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..I1EzRS7Ct-CaDMaNYuMKi\_GseppZm9jtIJMZbilchmWlV7W3mNsapSSche8UzAWYfKnhwjQuwvlMr0c8HlVEBQ"

&#x20;     }
{% endswagger-parameter %}

{% swagger-parameter in="body" name="createDate" %}
2022-04-29T14:31:57.918Z
{% endswagger-parameter %}

{% swagger-parameter in="body" name="updateDate" %}
2022-04-29T14:31:57.918Z
{% endswagger-parameter %}

{% swagger-parameter in="body" name="hederaStatus" %}
ISSUE
{% endswagger-parameter %}

{% swagger-parameter in="body" name="signature" %}
0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="type" %}
registrant
{% endswagger-parameter %}

{% swagger-parameter in="body" name="policyID" %}
626bf178d24497fe1b1e4139
{% endswagger-parameter %}

{% swagger-parameter in="body" name="tag" %}
create_application(db)
{% endswagger-parameter %}

{% swagger-parameter in="body" name="option" %}
{

&#x20;     "status":"Approved"

&#x20;  },
{% endswagger-parameter %}

{% swagger-parameter in="body" name="schema" %}
\#762694d6-8fbb-4377-ae3e-ef400bbc3ea5&1.0.0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="messageId" %}
1651242715.948867898
{% endswagger-parameter %}

{% swagger-parameter in="body" name="topidId" %}
0.0.34350746
{% endswagger-parameter %}

{% swagger-parameter in="body" name="relationships" %}
null
{% endswagger-parameter %}

{% swagger-parameter in="body" name="__sourceTag__" %}
registrants_source(need_approve)
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthorized" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="403: Forbidden" description="Forbidden" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```javascript
{
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Error'
}
```
{% endswagger-response %}
{% endswagger %}

### User (CREATE DEVICE)

BLOCK : create\_device\_form

{% swagger method="post" path="" baseUrl="/policies/{policyId}/blocks/{blockId}" summary="Creating Device" %}
{% swagger-description %}
/policies/626bf178d24497fe1b1e4139/blocks/3db29027-8753-4e7f-af40-ca31b72ce95c
{% endswagger-description %}

{% swagger-parameter in="body" name="document" %}
"field0":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",

&#x20;     "field1":"2022-04-08",

&#x20;     "field2":"Is the Registrant also the owner of the Device? (provide evidence)",

&#x20;     "field3":{

&#x20;        "field0":"Organization Name",

&#x20;        "field1":"Address line 1",

&#x20;        "field2":"Address line 2",

&#x20;        "field3":"Address line 3",

&#x20;        "field4":"Postal code",

&#x20;        "field5":"Country",

&#x20;        "field6":"Contact person",

&#x20;        "field7":"test@mail.ru",

&#x20;        "field8":"Telephone",

&#x20;        "field9":"Fax",

&#x20;        "field10":"Existing I-REC Registry organization(s) to become subsidiary",

&#x20;        "type":"56ce048d-8e24-4aec-b76d-802688f651e8",

&#x20;        "@context":\[

&#x20;           "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;        ]

&#x20;     },

&#x20;     "field4":{

&#x20;        "field0":"Device Name",

&#x20;        "field1":"Address",

&#x20;        "field2":"Postal code",

&#x20;        "field3":"Country",

&#x20;        "field4":"Longitude",

&#x20;        "field5":"Latitude",

&#x20;        "field6":"TSO’s ID for measurement point",

&#x20;        "field7":1,

&#x20;        "field8":1,

&#x20;        "field9":"2022-04-29",

&#x20;        "field10":"Owner of the network to which the Production Device is connected and the voltage of that connection",

&#x20;        "field11":"If the Production Device is not connected directly to the grid, specify the circumstances, and additional relevant meter registration numbers",

&#x20;        "field12":"Expected form of volume evidence",

&#x20;        "field13":"If other please specify",

&#x20;        "type":"fd49e6e4-58d7-425a-9518-9a2c4a178b15",

&#x20;        "@context":\[

&#x20;           "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;        ]

&#x20;     },

&#x20;     "field5":{

&#x20;        "field0":"Energy Source (Input) – see Appendix 2",

&#x20;        "field1":"Technology – see Appendix 2",

&#x20;        "field2":true,

&#x20;        "field3":"If yes give details",

&#x20;        "field4":true,

&#x20;        "field5":"If yes give details",

&#x20;        "field6":"Please give details of how the site can import electricity by means other than through the meter(s) specified above",

&#x20;        "field7":"Please give details (including registration id) of any carbon offset or energy tracking scheme for which the Production Device is registered. State ‘None’ if that is the case",

&#x20;        "field8":"Please identify any labeling schemes for which the Device is accredited",

&#x20;        "field9":true,

&#x20;        "field10":"If public (government) funding has been received when did/will it finish?",

&#x20;        "field11":"2022-04-29",

&#x20;        "field12":"Preferred I-REC Device Verifier",

&#x20;        "type":"d7a15512-bb46-4826-864d-1e37bf7b321f",

&#x20;        "@context":\[

&#x20;           "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;        ]

&#x20;     },

&#x20;     "type":"4713cc2e-4036-49b6-ba19-6475ed590c33&1.0.0",

&#x20;     "@context":\[

&#x20;        "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;     ]
{% endswagger-parameter %}

{% swagger-parameter in="body" name="ref" %}
&#x20;     "id":"626bf76ad24497fe1b1e4140",

&#x20;     "owner":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",

&#x20;     "hash":"BQTRbH4qtRfAXWW8T7EAa5vEncnNEEnaj8CT2ax7YJBs",

&#x20;     "document":{

&#x20;        "id":"849228e1-4c7d-4bf4-8eb4-df1f3c24429b",

&#x20;        "type":\[

&#x20;           "VerifiableCredential"

&#x20;        ],

&#x20;        "issuer":"did:hedera:testnet:A7cP5xLNaF5LPtXkDUTsP6fATh4uarAjCujnZ3qR2vcw;hedera:testnet:tid=0.0.34349531",

&#x20;        "issuanceDate":"2022-04-29T14:34:10.327Z",

&#x20;        "@context":\[

&#x20;           "https://www.w3.org/2018/credentials/v1"

&#x20;        ],

&#x20;        "credentialSubject":\[

&#x20;           {

&#x20;              "field0":"2022-04-01",

&#x20;              "field1":{

&#x20;                 "field0":"Applicant Legal Name",

&#x20;                 "field1":"Registered address line 1",

&#x20;                 "field2":"Registered address line 2",

&#x20;                 "field3":"Registered address line 3",

&#x20;                 "field4":"Postal (ZIP) code",

&#x20;                 "field5":"Country",

&#x20;                 "field6":"Legal Status",

&#x20;                 "field7":"Country of company registration/private residence",

&#x20;                 "field8":"Corporate registration number/passport number",

&#x20;                 "field9":"VAT number",

&#x20;                 "field10":"Website URL",

&#x20;                 "field11":"Main business (e.g. food retailer)",

&#x20;                 "field12":2022,

&#x20;                 "field13":1,

&#x20;                 "field14":"Name of the Chief Executive Officer/General Manager",

&#x20;                 "field15":"Chief Executive Officer/General Manager passport number",

&#x20;                 "field16":"Please state in which countries the organization is active",

&#x20;                 "field17":"Please list the main (>10%) shareholders",

&#x20;                 "field18":1,

&#x20;                 "field19":"test@mail.ru",

&#x20;                 "type":"4510d95d-ed9d-4785-a5ed-5c1e334611dd",

&#x20;                 "@context":\[

&#x20;                    "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"

&#x20;                 ]

&#x20;              },

&#x20;              "field2":{

&#x20;                 "field0":"Organization Name",

&#x20;                 "field1":"Address line 1",

&#x20;                 "field2":"Address line 2",

&#x20;                 "field3":"Address line 3",

&#x20;                 "field4":"Postal code",

&#x20;                 "field5":"Country",

&#x20;                 "field6":"Contact person",

&#x20;                 "field7":"test@mail.ru",

&#x20;                 "field8":"Telephone",

&#x20;                 "field9":"Fax",

&#x20;                 "field10":"Existing I-REC Registry organization(s) to become subsidiary",

&#x20;                 "type":"56ce048d-8e24-4aec-b76d-802688f651e8",

&#x20;                 "@context":\[

&#x20;                    "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"

&#x20;                 ]

&#x20;              },

&#x20;              "field3":{

&#x20;                 "field0":"Family Name (surname)",

&#x20;                 "field1":"Other (Given) Names",

&#x20;                 "field2":"Title",

&#x20;                 "field3":"test@mail.ru",

&#x20;                 "field4":"Telephone",

&#x20;                 "field5":"Fax",

&#x20;                 "type":"fb8c1458-e86f-444a-a408-665149bda777",

&#x20;                 "@context":\[

&#x20;                    "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"

&#x20;                 ]

&#x20;              },

&#x20;              "policyId":"626bf178d24497fe1b1e4139",

&#x20;              "@context":\[

&#x20;                 "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"

&#x20;              ],

&#x20;              "id":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",

&#x20;              "type":"762694d6-8fbb-4377-ae3e-ef400bbc3ea5&1.0.0"

&#x20;           }

&#x20;        ],

&#x20;        "proof":{

&#x20;           "type":"Ed25519Signature2018",

&#x20;           "created":"2022-04-29T14:34:10Z",

&#x20;           "verificationMethod":"did:hedera:testnet:A7cP5xLNaF5LPtXkDUTsP6fATh4uarAjCujnZ3qR2vcw;hedera:testnet:tid=0.0.34349531#did-root-key",

&#x20;           "proofPurpose":"assertionMethod",

&#x20;           "jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..rjry6W0iAoXzRx7Upb6hxeu0LbxjuNwDULq2p4IIQsOFwY5h4zxBCOVZIGmwIJ\_xY2a0V0-pyX1xTwTUV8aPDQ"

&#x20;        }

&#x20;     },

&#x20;     "createDate":"2022-04-29T14:34:18.048Z",

&#x20;     "updateDate":"2022-04-29T14:34:18.048Z",

&#x20;     "hederaStatus":"ISSUE",

&#x20;     "signature":0,

&#x20;     "type":"registrant(Approved)",

&#x20;     "policyId":"626bf178d24497fe1b1e4139",

&#x20;     "tag":"save\_copy\_application",

&#x20;     "option":{

&#x20;        "status":"Approved"

&#x20;     },

&#x20;     "schema":"#762694d6-8fbb-4377-ae3e-ef400bbc3ea5&1.0.0",

&#x20;     "messageId":"1651242856.179215415",

&#x20;     "topicId":"0.0.34350746",

&#x20;     "relationships":\[

&#x20;        "1651242715.948867898"

&#x20;     ],

&#x20;     "\_\_sourceTag\_\_":"current\_registrant"

&#x20;  }
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthorized" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="403: Forbidden" description="Forbidden" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```javascript
{
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Error'
}
```
{% endswagger-response %}
{% endswagger %}

### Root Authority (Get Device to Approve)

#### Make GET request and get data\[i] and change option.status = “Approved”:

BLOCK : approve\_devices\_grid

{% swagger method="get" path="" baseUrl="/policies/{policyId}/blocks/{blockId}" summary="Submitting Device for Approval" %}
{% swagger-description %}
/policies/626c0490d24497fe1b1e415d/blocks/2d99bfd9-38d3-4777-abda-f1ea5cecb613
{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
   "data":[
      {
         "id":"626c056cd24497fe1b1e4163",
         "owner":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",
         "hash":"GkX1mNd5wxWKCdkBYC6PBGHm9jmkNzsjb9ycqcP4jgPb",
         "document":{
            "id":"9d537f1d-c906-4013-9ac6-c6a0fd211e4a",
            "type":[
               "VerifiableCredential"
            ],
            "issuer":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",
            "issuanceDate":"2022-04-29T15:33:48.168Z",
            "@context":[
               "https://www.w3.org/2018/credentials/v1"
            ],
            "credentialSubject":[
               {
                  "field0":"2022-04-08",
                  "field1":{
                     "field0":"Applicant Legal Name",
                     "field1":"Registered address line 1",
                     "field2":"Registered address line 2",
                     "field3":"Registered address line 3",
                     "field4":"Postal (ZIP) code",
                     "field5":"Country",
                     "field6":"Legal Status",
                     "field7":"Country of company registration/private residence",
                     "field8":"Corporate registration number/passport number",
                     "field9":"VAT number",
                     "field10":"Website URL",
                     "field11":"Main business (e.g. food retailer)",
                     "field12":1,
                     "field13":1,
                     "field14":"Name of the Chief Executive Officer/General Manager",
                     "field15":"Chief Executive Officer/General Manager passport number",
                     "field16":"Please state in which countries the organization is active",
                     "field17":"Please list the main (>10%) shareholders",
                     "field18":1,
                     "field19":"test@mail.ru",
                     "type":"f7bd122d-4220-4d9d-abb2-fa9366e79975",
                     "@context":[
                        "https://ipfs.io/ipfs/bafkreiess6ak6lwlhar55ezckdwo6y7ki3wlyzyl3a7tadda2zuqaxwmbm"
                     ]
                  },
                  "field2":{
                     "field0":"Organization Name",
                     "field1":"Address line 1",
                     "field2":"Address line 2",
                     "field3":"Address line 3",
                     "field4":"Postal code",
                     "field5":"Country",
                     "field6":"Contact person",
                     "field7":"test@mail.ru",
                     "field8":"Telephone",
                     "field9":"Fax",
                     "field10":"Existing I-REC Registry organization(s) to become subsidiary",
                     "type":"a68073e6-bf56-43e3-99c4-5b433c983654",
                     "@context":[
                        "https://ipfs.io/ipfs/bafkreiess6ak6lwlhar55ezckdwo6y7ki3wlyzyl3a7tadda2zuqaxwmbm"
                     ]
                  },
                  "field3":{
                     "field0":"Family Name (surname)",
                     "field1":"Other (Given) Names",
                     "field2":"Title",
                     "field3":"test@mail.ru",
                     "field4":"Telephone",
                     "field5":"Fax",
                     "type":"9dca2898-d548-48a4-beec-fefd308f93cf",
                     "@context":[
                        "https://ipfs.io/ipfs/bafkreiess6ak6lwlhar55ezckdwo6y7ki3wlyzyl3a7tadda2zuqaxwmbm"
                     ]
                  },
                  "policyId":"626c0490d24497fe1b1e415d",
                  "@context":[
                     "https://ipfs.io/ipfs/bafkreiess6ak6lwlhar55ezckdwo6y7ki3wlyzyl3a7tadda2zuqaxwmbm"
                  ],
                  "id":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",
                  "type":"7b652d73-5978-45b4-992e-cc3ce732e27a&1.0.0"
               }
            ],
            "proof":{
               "type":"Ed25519Signature2018",
               "created":"2022-04-29T15:33:48Z",
               "verificationMethod":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316#did-root-key",
               "proofPurpose":"assertionMethod",
               "jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..GaOyMZ9dR5J0-iu6SICVNlWifON3DT0ytz2z_eCHeOSRY5oQ7Jb3219G7aUrztIEppMcfzG6teO-YvuNPiAfBw"
            }
         },
         "createDate":"2022-04-29T15:34:04.021Z",
         "updateDate":"2022-04-29T15:34:04.021Z",
         "hederaStatus":"ISSUE",
         "signature":0,
         "type":"registrant",
         "policyId":"626c0490d24497fe1b1e415d",
         "tag":"create_application(db)",
         "option":{
            "status":"Waiting for approval"
         },
         "schema":"#7b652d73-5978-45b4-992e-cc3ce732e27a&1.0.0",
         "messageId":"1651246443.516813000",
         "topicId":"0.0.34352381",
         "relationships":[
            
         ],
         "__sourceTag__":"registrants_source(need_approve)"
      }
   ],
   "blocks":[
      
   ],
   "commonAddons":[
      {
         "id":"c0dbe6b1-6963-4010-9dc4-c676679376dd",
         "blockType":"documentsSourceAddon"
      },
      {
         "id":"540a115b-a94e-4d16-af46-e4b817f07b98",
         "blockType":"documentsSourceAddon"
      }
   ],
   "fields":[
      {
         "title":"Legal Name",
         "name":"document.credentialSubject.0.field1.field0",
         "type":"text"
      },
      {
         "title":"Organization Name",
         "name":"document.credentialSubject.0.field2.field0",
         "type":"text"
      },
      {
         "title":"Operation",
         "name":"option.status",
         "type":"text",
         "width":"250px",
         "bindGroup":"registrants_source(approved)",
         "action":"",
         "url":"",
         "dialogContent":"",
         "dialogClass":"",
         "dialogType":"",
         "bindBlock":""
      },
      {
         "title":"Operation",
         "name":"option.status",
         "tooltip":"",
         "type":"block",
         "action":"",
         "url":"",
         "dialogContent":"",
         "dialogClass":"",
         "dialogType":"",
         "bindBlock":"approve_registrant_btn",
         "width":"250px",
         "bindGroup":"registrants_source(need_approve)"
      },
      {
         "name":"document",
         "title":"Document",
         "tooltip":"",
         "type":"button",
         "action":"dialog",
         "content":"View Document",
         "uiClass":"link",
         "dialogContent":"VC",
         "dialogClass":"",
         "dialogType":"json"
      }
   ]
}

```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthorized" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="403: Forbidden" description="Forbidden" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```javascript
{
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Error'
}
```
{% endswagger-response %}
{% endswagger %}

### Root Authority (Approve Device)

{% swagger method="post" path="" baseUrl="/policies/{policyId}/blocks/{blockId}" summary="Device Approval" %}
{% swagger-description %}
/policies/626bf178d24497fe1b1e4139/blocks/918a113d-a88b-4595-806e-823e4fbb8bf6
{% endswagger-description %}

{% swagger-parameter in="body" name="id" %}
626bf826d24497fe1b1e4144
{% endswagger-parameter %}

{% swagger-parameter in="body" name="owner" %}
did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316
{% endswagger-parameter %}

{% swagger-parameter in="body" name="hash" %}
2qUPLPToSW3S33DAyY2wyJe5YPpWNuZKLLhTZRBowCAn
{% endswagger-parameter %}

{% swagger-parameter in="body" name="document" %}
"id":"c48ffb77-58d9-4809-aaa9-ff80950142ea",

&#x20;     "type":\[

&#x20;        "VerifiableCredential"

&#x20;     ],

&#x20;     "issuer":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",

&#x20;     "issuanceDate":"2022-04-29T14:37:18.619Z",

&#x20;     "@context":\[

&#x20;        "https://www.w3.org/2018/credentials/v1"

&#x20;     ],

&#x20;     "credentialSubject":\[

&#x20;        {

&#x20;           "field0":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",

&#x20;           "field1":"2022-04-08",

&#x20;           "field2":"Is the Registrant also the owner of the Device? (provide evidence)",

&#x20;           "field3":{

&#x20;              "field0":"Organization Name",

&#x20;              "field1":"Address line 1",

&#x20;              "field2":"Address line 2",

&#x20;              "field3":"Address line 3",

&#x20;              "field4":"Postal code",

&#x20;              "field5":"Country",

&#x20;              "field6":"Contact person",

&#x20;              "field7":"test@mail.ru",

&#x20;              "field8":"Telephone",

&#x20;              "field9":"Fax",

&#x20;              "field10":"Existing I-REC Registry organization(s) to become subsidiary",

&#x20;              "type":"56ce048d-8e24-4aec-b76d-802688f651e8",

&#x20;              "@context":\[

&#x20;                 "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;              ]

&#x20;           },

&#x20;           "field4":{

&#x20;              "field0":"Device Name",

&#x20;              "field1":"Address",

&#x20;              "field2":"Postal code",

&#x20;              "field3":"Country",

&#x20;              "field4":"Longitude",

&#x20;              "field5":"Latitude",

&#x20;              "field6":"TSO’s ID for measurement point",

&#x20;              "field7":1,

&#x20;              "field8":1,

&#x20;              "field9":"2022-04-29",

&#x20;              "field10":"Owner of the network to which the Production Device is connected and the voltage of that connection",

&#x20;              "field11":"If the Production Device is not connected directly to the grid, specify the circumstances, and additional relevant meter registration numbers",

&#x20;              "field12":"Expected form of volume evidence",

&#x20;              "field13":"If other please specify",

&#x20;              "type":"fd49e6e4-58d7-425a-9518-9a2c4a178b15",

&#x20;              "@context":\[

&#x20;                 "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;              ]

&#x20;           },

&#x20;           "field5":{

&#x20;              "field0":"Energy Source (Input) – see Appendix 2",

&#x20;              "field1":"Technology – see Appendix 2",

&#x20;              "field2":true,

&#x20;              "field3":"If yes give details",

&#x20;              "field4":true,

&#x20;              "field5":"If yes give details",

&#x20;              "field6":"Please give details of how the site can import electricity by means other than through the meter(s) specified above",

&#x20;              "field7":"Please give details (including registration id) of any carbon offset or energy tracking scheme for which the Production Device is registered. State ‘None’ if that is the case",

&#x20;              "field8":"Please identify any labeling schemes for which the Device is accredited",

&#x20;              "field9":true,

&#x20;              "field10":"If public (government) funding has been received when did/will it finish?",

&#x20;              "field11":"2022-04-29",

&#x20;              "field12":"Preferred I-REC Device Verifier",

&#x20;              "type":"d7a15512-bb46-4826-864d-1e37bf7b321f",

&#x20;              "@context":\[

&#x20;                 "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;              ]

&#x20;           },

&#x20;           "ref":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",

&#x20;           "policyId":"626bf178d24497fe1b1e4139",

&#x20;           "@context":\[

&#x20;              "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;           ],

&#x20;           "id":"did:hedera:testnet:2PNs5TABEKMm7WNMSLrFQDSaBqkhppjPqcj9ovkbzkrq;hedera:testnet:tid=0.0.34350724",

&#x20;           "type":"4713cc2e-4036-49b6-ba19-6475ed590c33&1.0.0"

&#x20;        }

&#x20;     ],

&#x20;     "proof":{

&#x20;        "type":"Ed25519Signature2018",

&#x20;        "created":"2022-04-29T14:37:18Z",

&#x20;        "verificationMethod":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316#did-root-key",

&#x20;        "proofPurpose":"assertionMethod",

&#x20;        "jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..fH8UEbWTElaBYZ-mznxFndkZU29h45Px1BL8lwzL73PUpmDeDEc2iJINx6Kmh\_uxcMpm7lhkf9JKQxADEl5-Dg"

&#x20;     }
{% endswagger-parameter %}

{% swagger-parameter in="body" name="createDate" %}
2022-04-29T14:37:26.605Z
{% endswagger-parameter %}

{% swagger-parameter in="body" name="updateDate" %}
2022-04-29T14:37:26.605Z
{% endswagger-parameter %}

{% swagger-parameter in="body" name="hederaStatus" %}
ISSUE
{% endswagger-parameter %}

{% swagger-parameter in="body" name="signature" %}
0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="type" %}
device
{% endswagger-parameter %}

{% swagger-parameter in="body" name="policyId" %}
626bf178d24497fe1b1e4139
{% endswagger-parameter %}

{% swagger-parameter in="body" name="tag" %}
create_device
{% endswagger-parameter %}

{% swagger-parameter in="body" name="option" %}
{

&#x20;     "status":"Approved"

&#x20;  },
{% endswagger-parameter %}

{% swagger-parameter in="body" name="schema" %}
\#4713cc2e-4036-49b6-ba19-6475ed590c33&1.0.0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="messageId" %}
1651243044.613728925
{% endswagger-parameter %}

{% swagger-parameter in="body" name="topicId" %}
0.0.34350746
{% endswagger-parameter %}

{% swagger-parameter in="body" name="relationships" %}
\[

&#x20;     "1651242856.179215415

]
{% endswagger-parameter %}

{% swagger-parameter in="body" name="__sourceTag__" %}
approve_devices_source(need_approve)
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthorized" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="403: Forbidden" description="Forbidden" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```javascript
{
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Error'
}
```
{% endswagger-response %}
{% endswagger %}

### User (CREATE ISSUE)

BLOCK : create\_issue\_request\_form

{% swagger method="post" path="" baseUrl="/policies/{policyId}/blocks/{blockId}" summary="Creating Issue" %}
{% swagger-description %}
/policies/626bf178d24497fe1b1e4139/blocks/8bd8c3da-043a-4ef0-8bb4-10f60bd80832
{% endswagger-description %}

{% swagger-parameter in="body" name="document" %}
&#x20;     "field0":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",

&#x20;     "field1":"did:hedera:testnet:2PNs5TABEKMm7WNMSLrFQDSaBqkhppjPqcj9ovkbzkrq;hedera:testnet:tid=0.0.34350724",

&#x20;     "field2":{

&#x20;        "field0":"Organization Name",

&#x20;        "field1":"Address line 1",

&#x20;        "field2":"Address line 2",

&#x20;        "field3":"Address line 3",

&#x20;        "field4":"Postal code",

&#x20;        "field5":"Country",

&#x20;        "field6":"Contact person",

&#x20;        "field7":"test@mail.ru",

&#x20;        "field8":"Telephone",

&#x20;        "field9":"Fax",

&#x20;        "field10":"Existing I-REC Registry organization(s) to become subsidiary",

&#x20;        "type":"56ce048d-8e24-4aec-b76d-802688f651e8",

&#x20;        "@context":\[

&#x20;           "https://ipfs.io/ipfs/bafkreigth2xnezvhywqijetrzvi6czxvfduyfn5f7cbln7n5u6kds2vypq"

&#x20;        ]

&#x20;     },

&#x20;     "field3":{

&#x20;        "field0":"Device Name",

&#x20;        "field1":"Address",

&#x20;        "field2":"Postal code",

&#x20;        "field3":"Country",

&#x20;        "field4":"Longitude",

&#x20;        "field5":"Latitude",

&#x20;        "field6":"TSO’s ID for measurement point",

&#x20;        "field7":1,

&#x20;        "field8":1,

&#x20;        "field9":"2022-04-29",

&#x20;        "field10":"Owner of the network to which the Production Device is connected and the voltage of that connection",

&#x20;        "field11":"If the Production Device is not connected directly to the grid, specify the circumstances, and additional relevant meter registration numbers",

&#x20;        "field12":"Expected form of volume evidence",

&#x20;        "field13":"If other please specify",

&#x20;        "type":"fd49e6e4-58d7-425a-9518-9a2c4a178b15",

&#x20;        "@context":\[

&#x20;           "https://ipfs.io/ipfs/bafkreigth2xnezvhywqijetrzvi6czxvfduyfn5f7cbln7n5u6kds2vypq"

&#x20;        ]

&#x20;     },

&#x20;     "field4":" labeling scheme(s)",

&#x20;     "field5":"2022-04-29",

&#x20;     "field6":"2022-04-29",

&#x20;     "field7":1,

&#x20;     "field8":"2022-04-29",

&#x20;     "field9":1,

&#x20;     "field10":"Type a: Settlement Metering data",

&#x20;     "field11":"Type b: Non-settlement Metering data",

&#x20;     "field12":"Type c: Measured Volume Transfer documentation",

&#x20;     "field13":"Type d: Other",

&#x20;     "field14":true,

&#x20;     "field15":true,

&#x20;     "field16":true,

&#x20;     "field17":"Installer",

&#x20;     "field18":"0.0.34235315",

&#x20;     "type":"88f6b2ad-5945-4086-b15c-8181654948c8&1.0.0",

&#x20;     "@context":\[

&#x20;        "https://ipfs.io/ipfs/bafkreigth2xnezvhywqijetrzvi6czxvfduyfn5f7cbln7n5u6kds2vypq"

&#x20;     ]
{% endswagger-parameter %}

{% swagger-parameter in="body" name="ref" %}
&#x20;     "id":"626bf95ed24497fe1b1e4145",

&#x20;     "owner":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",

&#x20;     "hash":"Gq2osAVHzB6LpFEDXKQkeVbpcteV7pBDdFhL93SmyPt7",

&#x20;     "document":{

&#x20;        "id":"aebb99c3-a897-4d71-8819-2362a43944ea",

&#x20;        "type":\[

&#x20;           "VerifiableCredential"

&#x20;        ],

&#x20;        "issuer":"did:hedera:testnet:A7cP5xLNaF5LPtXkDUTsP6fATh4uarAjCujnZ3qR2vcw;hedera:testnet:tid=0.0.34349531",

&#x20;        "iszw2suanceDate":"2022-04-29T14:42:27.523Z",

&#x20;        "@context":\[

&#x20;           "https://www.w3.org/2018/credentials/v1"

&#x20;        ],

&#x20;        "credentialSubject":\[

&#x20;           {

&#x20;              "field0":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",

&#x20;              "field1":"2022-04-08",

&#x20;              "field2":"Is the Registrant also the owner of the Device? (provide evidence)",

&#x20;              "field3":{

&#x20;                 "field0":"Organization Name",

&#x20;                 "field1":"Address line 1",

&#x20;                 "field2":"Address line 2",

&#x20;                 "field3":"Address line 3",

&#x20;                 "field4":"Postal code",

&#x20;                 "field5":"Country",

&#x20;                 "field6":"Contact person",

&#x20;                 "field7":"test@mail.ru",

&#x20;                 "field8":"Telephone",

&#x20;                 "field9":"Fax",

&#x20;                 "field10":"Existing I-REC Registry organization(s) to become subsidiary",

&#x20;                 "type":"56ce048d-8e24-4aec-b76d-802688f651e8",

&#x20;                 "@context":\[

&#x20;                    "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;                 ]

&#x20;              },

&#x20;              "field4":{

&#x20;                 "field0":"Device Name",

&#x20;                 "field1":"Address",

&#x20;                 "field2":"Postal code",

&#x20;                 "field3":"Country",

&#x20;                 "field4":"Longitude",

&#x20;                 "field5":"Latitude",

&#x20;                 "field6":"TSO’s ID for measurement point",

&#x20;                 "field7":1,

&#x20;                 "field8":1,

&#x20;                 "field9":"2022-04-29",

&#x20;                 "field10":"Owner of the network to which the Production Device is connected and the voltage of that connection",

&#x20;                 "field11":"If the Production Device is not connected directly to the grid, specify the circumstances, and additional relevant meter registration numbers",

&#x20;                 "field12":"Expected form of volume evidence",

&#x20;                 "field13":"If other please specify",

&#x20;                 "type":"fd49e6e4-58d7-425a-9518-9a2c4a178b15",

&#x20;                 "@context":\[

&#x20;                    "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;                 ]

&#x20;              },

&#x20;              "field5":{

&#x20;                 "field0":"Energy Source (Input) – see Appendix 2",

&#x20;                 "field1":"Technology – see Appendix 2",

&#x20;                 "field2":true,

&#x20;                 "field3":"If yes give details",

&#x20;                 "field4":true,

&#x20;                 "field5":"If yes give details",

&#x20;                 "field6":"Please give details of how the site can import electricity by means other than through the meter(s) specified above",

&#x20;                 "field7":"Please give details (including registration id) of any carbon offset or energy tracking scheme for which the Production Device is registered. State ‘None’ if that is the case",

&#x20;                 "field8":"Please identify any labeling schemes for which the Device is accredited",

&#x20;                 "field9":true,

&#x20;                 "field10":"If public (government) funding has been received when did/will it finish?",

&#x20;                 "field11":"2022-04-29",

&#x20;                 "field12":"Preferred I-REC Device Verifier",

&#x20;                 "type":"d7a15512-bb46-4826-864d-1e37bf7b321f",

&#x20;                 "@context":\[

&#x20;                    "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;                 ]

&#x20;              },

&#x20;              "ref":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",

&#x20;              "policyId":"626bf178d24497fe1b1e4139",

&#x20;              "@context":\[

&#x20;                 "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;              ],

&#x20;              "id":"did:hedera:testnet:2PNs5TABEKMm7WNMSLrFQDSaBqkhppjPqcj9ovkbzkrq;hedera:testnet:tid=0.0.34350724",

&#x20;              "type":"4713cc2e-4036-49b6-ba19-6475ed590c33&1.0.0"

&#x20;           }

&#x20;        ],

&#x20;        "proof":{

&#x20;           "type":"Ed25519Signature2018",

&#x20;           "created":"2022-04-29T14:42:27Z",

&#x20;           "verificationMethod":"did:hedera:testnet:A7cP5xLNaF5LPtXkDUTsP6fATh4uarAjCujnZ3qR2vcw;hedera:testnet:tid=0.0.34349531#did-root-key",

&#x20;           "proofPurpose":"assertionMethod",

&#x20;           "jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..\_o526p84cDF4qa1z5obliK-9WGVxsadhtCIIlq8fnjTiiOlYk54lrBZ4EeOw5xJ7DTMJ2ukLEp3PvTKVqIL3CQ"

&#x20;        }

&#x20;     },

&#x20;     "createDate":"2022-04-29T14:42:38.469Z",

&#x20;     "updateDate":"2022-04-29T14:42:38.469Z",

&#x20;     "hederaStatus":"ISSUE",

&#x20;     "signature":0,

&#x20;     "type":"device(Approved)",

&#x20;     "policyId":"626bf178d24497fe1b1e4139",

&#x20;     "tag":"save\_copy\_device",

&#x20;     "option":{

&#x20;        "status":"Approved"

&#x20;     },

&#x20;     "schema":"#4713cc2e-4036-49b6-ba19-6475ed590c33&1.0.0",

&#x20;     "messageId":"1651243356.729744000",

&#x20;     "topicId":"0.0.34350746",

&#x20;     "relationships":\[

&#x20;        "1651243044.613728925"

&#x20;     ],

&#x20;     "\_\_sourceTag\_\_":"devices\_source(approved)"

&#x20;  }
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthorized" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="403: Forbidden" description="Forbidden" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```javascript
{
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Error'
}
```
{% endswagger-response %}
{% endswagger %}

### Root Authority (GET ISSUE TO APPROVE)

#### Make GET request and get data\[i] and change option.status = “Approved”:

BLOCK issue\_requests\_grid(evident)

{% swagger method="get" path="" baseUrl="/policies/{policyId}/blocks/{blockId}" summary="" %}
{% swagger-description %}
/policies/626c0490d24497fe1b1e415d/blocks/4838bdc7-f141-4c64-a5e0-a40c2b268766
{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
   "data":[
      {
         "id":"626c0a7cd24497fe1b1e416c",
         "owner":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",
         "hash":"44XX8ok6Y9gy6FRaTzQzaewDGPLqArqvAaWKQBrXKNqi",
         "document":{
            "id":"2d20d104-35ad-49f5-8530-7444e3228c13",
            "type":[
               "VerifiableCredential"
            ],
            "issuer":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",
            "issuanceDate":"2022-04-29T15:55:31.487Z",
            "@context":[
               "https://www.w3.org/2018/credentials/v1"
            ],
            "credentialSubject":[
               {
                  "field0":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",
                  "field1":"did:hedera:testnet:HyjFdpTRX2mBpiHuHHWb45hMsGejYCS6Njecy2YBXEfu;hedera:testnet:tid=0.0.34352260",
                  "field2":{
                     "field0":"Organization Name",
                     "field1":"Address line 1",
                     "field2":"Address line 2",
                     "field3":"Address line 3",
                     "field4":"Postal code",
                     "field5":"Country",
                     "field6":"Contact person",
                     "field7":"test@mail.ru",
                     "field8":"Telephone",
                     "field9":"Fax",
                     "field10":"Existing I-REC Registry organization(s) to become subsidiary",
                     "type":"a68073e6-bf56-43e3-99c4-5b433c983654",
                     "@context":[
                        "https://ipfs.io/ipfs/bafkreidnvwylajvvgaza7fxg57fjf5dvdbgvylfkw3tsxjlbiffincxsdq"
                     ]
                  },
                  "field3":{
                     "field0":"Device Name",
                     "field1":"Address",
                     "field2":"Postal code",
                     "field3":"Country",
                     "field4":"Longitude",
                     "field5":"Latitude",
                     "field6":"TSO’s ID for measurement point",
                     "field7":1,
                     "field8":1,
                     "field9":"2022-04-29",
                     "field10":"Owner of the network to which the Production Device is connected and the voltage of that connection",
                     "field11":"If the Production Device is not connected directly to the grid, specify the circumstances, and additional relevant meter registration numbers",
                     "field12":"Expected form of volume evidence",
                     "field13":"If other please specify",
                     "type":"a35f095b-ebc6-4006-a551-1f1d22c329b8",
                     "@context":[
                        "https://ipfs.io/ipfs/bafkreidnvwylajvvgaza7fxg57fjf5dvdbgvylfkw3tsxjlbiffincxsdq"
                     ]
                  },
                  "field4":"labeling scheme(s)",
                  "field5":"2022-04-29",
                  "field6":"2022-04-29",
                  "field7":1,
                  "field8":"2022-04-29",
                  "field9":1,
                  "field10":"Type a: Settlement Metering data",
                  "field11":"Type b: Non-settlement Metering data",
                  "field12":"Type c: Measured Volume Transfer documentation",
                  "field13":"Type d: Other",
                  "field14":true,
                  "field15":true,
                  "field16":true,
                  "field17":"Installer",
                  "field18":"0.0.34235315",
                  "ref":"did:hedera:testnet:HyjFdpTRX2mBpiHuHHWb45hMsGejYCS6Njecy2YBXEfu;hedera:testnet:tid=0.0.34352260",
                  "policyId":"626c0490d24497fe1b1e415d",
                  "@context":[
                     "https://ipfs.io/ipfs/bafkreidnvwylajvvgaza7fxg57fjf5dvdbgvylfkw3tsxjlbiffincxsdq"
                  ],
                  "id":"3d31e722-7a17-4f13-a66d-c21c0042b6d3",
                  "type":"c8a8aae3-2125-4872-9396-ac6b4dba8c2f&1.0.0"
               }
            ],
            "proof":{
               "type":"Ed25519Signature2018",
               "created":"2022-04-29T15:55:31Z",
               "verificationMethod":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316#did-root-key",
               "proofPurpose":"assertionMethod",
               "jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..2MmXAW9khzXExyU2NVfBWTAQxro_eLWO6zxyABGb2nWvdsg5RcjmV-e_8HggxclU9wVECDW337gVFv_hkT0ZBA"
            }
         },
         "createDate":"2022-04-29T15:55:40.477Z",
         "updateDate":"2022-04-29T15:55:40.477Z",
         "hederaStatus":"ISSUE",
         "signature":0,
         "type":"issue_request",
         "policyId":"626c0490d24497fe1b1e415d",
         "tag":"create_issue_request",
         "option":{
            "status":"Waiting for approval"
         },
         "schema":"#c8a8aae3-2125-4872-9396-ac6b4dba8c2f&1.0.0",
         "messageId":"1651247740.133346000",
         "topicId":"0.0.34352381",
         "relationships":[
            "1651247655.671887000"
         ],
         "__sourceTag__":"issue_requests_source(need_approve)"
      }
   ],
   "blocks":[
      
   ],
   "commonAddons":[
      {
         "id":"03aa71e0-8c5c-4685-aac4-250f4bd72206",
         "blockType":"documentsSourceAddon"
      },
      {
         "id":"cdcf0d38-f2a0-4678-95bb-5489d65b3dec",
         "blockType":"documentsSourceAddon"
      }
   ],
   "fields":[
      {
         "title":"Organization Name",
         "name":"document.credentialSubject.0.field2.field0",
         "type":"text"
      },
      {
         "title":"Production Period Start Date",
         "name":"document.credentialSubject.0.field6",
         "type":"text"
      },
      {
         "title":"Production Period End Date",
         "name":"document.credentialSubject.0.field8",
         "type":"text"
      },
      {
         "title":"Total kWh Produced in this period",
         "name":"document.credentialSubject.0.field7",
         "type":"text"
      },
      {
         "title":"Date",
         "name":"document.issuanceDate",
         "type":"text"
      },
      {
         "name":"option.status",
         "title":"Operation",
         "type":"text",
         "width":"250px",
         "bindGroup":"issue_requests_source(approved)",
         "action":"",
         "url":"",
         "dialogContent":"",
         "dialogClass":"",
         "dialogType":"",
         "bindBlock":""
      },
      {
         "title":"Operation",
         "name":"option.status",
         "tooltip":"",
         "type":"block",
         "action":"",
         "url":"",
         "dialogContent":"",
         "dialogClass":"",
         "dialogType":"",
         "bindBlock":"approve_issue_requests_btn",
         "width":"250px",
         "bindGroup":"issue_requests_source(need_approve)"
      },
      {
         "name":"document",
         "title":"Document",
         "tooltip":"",
         "type":"button",
         "action":"dialog",
         "content":"View Document",
         "uiClass":"link",
         "dialogContent":"VC",
         "dialogClass":"",
         "dialogType":"json"
      }
   ]
}

```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthorized" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="403: Forbidden" description="Forbidden" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```javascript
{
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Error'
}
```
{% endswagger-response %}
{% endswagger %}

### Root Authority (Approve Issue)

BLOCK approve\_issue\_requests\_btn

{% swagger method="post" path="" baseUrl="/policies/{policyId}/blocks/{blockId}" summary="Approving Issue" %}
{% swagger-description %}
/policies/626bf178d24497fe1b1e4139/blocks/4185c3b7-f200-4219-a503-17c84fea752f
{% endswagger-description %}

{% swagger-parameter in="body" name="id" %}
626bf9e1d24497fe1b1e4148
{% endswagger-parameter %}

{% swagger-parameter in="body" name="owner" %}
did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316
{% endswagger-parameter %}

{% swagger-parameter in="body" name="hash" %}
9Ny3w8HaH6ukaUnRgKrdWadbRM1by5rgn2nS8MQLJipm
{% endswagger-parameter %}

{% swagger-parameter in="body" name="document" %}
&#x20;

&#x20;     "id":"e676b23e-61b9-4243-98fc-349fd9708d67",

&#x20;     "type":\[

&#x20;        "VerifiableCredential"

&#x20;     ],

&#x20;     "issuer":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",

&#x20;     "issuanceDate":"2022-04-29T14:44:38.373Z",

&#x20;     "@context":\[

&#x20;        "https://www.w3.org/2018/credentials/v1"

&#x20;     ],

&#x20;     "credentialSubject":\[

&#x20;        {

&#x20;           "field0":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",

&#x20;           "field1":"did:hedera:testnet:2PNs5TABEKMm7WNMSLrFQDSaBqkhppjPqcj9ovkbzkrq;hedera:testnet:tid=0.0.34350724",

&#x20;           "field2":{

&#x20;              "field0":"Organization Name",

&#x20;              "field1":"Address line 1",

&#x20;              "field2":"Address line 2",

&#x20;              "field3":"Address line 3",

&#x20;              "field4":"Postal code",

&#x20;              "field5":"Country",

&#x20;              "field6":"Contact person",

&#x20;              "field7":"test@mail.ru",

&#x20;              "field8":"Telephone",

&#x20;              "field9":"Fax",

&#x20;              "field10":"Existing I-REC Registry organization(s) to become subsidiary",

&#x20;              "type":"56ce048d-8e24-4aec-b76d-802688f651e8",

&#x20;              "@context":\[

&#x20;                 "https://ipfs.io/ipfs/bafkreigth2xnezvhywqijetrzvi6czxvfduyfn5f7cbln7n5u6kds2vypq"

&#x20;              ]

&#x20;           },

&#x20;           "field3":{

&#x20;              "field0":"Device Name",

&#x20;              "field1":"Address",

&#x20;              "field2":"Postal code",

&#x20;              "field3":"Country",

&#x20;              "field4":"Longitude",

&#x20;              "field5":"Latitude",

&#x20;              "field6":"TSO’s ID for measurement point",

&#x20;              "field7":1,

&#x20;              "field8":1,

&#x20;              "field9":"2022-04-29",

&#x20;              "field10":"Owner of the network to which the Production Device is connected and the voltage of that connection",

&#x20;              "field11":"If the Production Device is not connected directly to the grid, specify the circumstances, and additional relevant meter registration numbers",

&#x20;              "field12":"Expected form of volume evidence",

&#x20;              "field13":"If other please specify",

&#x20;              "type":"fd49e6e4-58d7-425a-9518-9a2c4a178b15",

&#x20;              "@context":\[

&#x20;                 "https://ipfs.io/ipfs/bafkreigth2xnezvhywqijetrzvi6czxvfduyfn5f7cbln7n5u6kds2vypq"

&#x20;              ]

&#x20;           },

&#x20;           "field4":" labeling scheme(s)",

&#x20;           "field5":"2022-04-29",

&#x20;           "field6":"2022-04-29",

&#x20;           "field7":1,

&#x20;           "field8":"2022-04-29",

&#x20;           "field9":1,

&#x20;           "field10":"Type a: Settlement Metering data",

&#x20;           "field11":"Type b: Non-settlement Metering data",

&#x20;           "field12":"Type c: Measured Volume Transfer documentation",

&#x20;           "field13":"Type d: Other",

&#x20;           "field14":true,

&#x20;           "field15":true,

&#x20;           "field16":true,

&#x20;           "field17":"Installer",

&#x20;           "field18":"0.0.34235315",

&#x20;           "ref":"did:hedera:testnet:2PNs5TABEKMm7WNMSLrFQDSaBqkhppjPqcj9ovkbzkrq;hedera:testnet:tid=0.0.34350724",

&#x20;           "policyId":"626bf178d24497fe1b1e4139",

&#x20;           "@context":\[

&#x20;              "https://ipfs.io/ipfs/bafkreigth2xnezvhywqijetrzvi6czxvfduyfn5f7cbln7n5u6kds2vypq"

&#x20;           ],

&#x20;           "id":"a69c8c0e-6fcd-4c63-b4a6-57b44cff63db",

&#x20;           "type":"88f6b2ad-5945-4086-b15c-8181654948c8&1.0.0"

&#x20;        }

&#x20;     ],

&#x20;     "proof":{

&#x20;        "type":"Ed25519Signature2018",

&#x20;        "created":"2022-04-29T14:44:38Z",

&#x20;        "verificationMethod":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316#did-root-key",

&#x20;        "proofPurpose":"assertionMethod",

&#x20;        "jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..rEWtgLl9X\_t2EdAYZhKE2ITptj9wEnihu1DhDPLoBBVZN7aV-bgedyDYYOLigPxV580gfm6NJztq\_wXFC4noAA"

&#x20;     }

&#x20;  },

&#x20; &#x20;
{% endswagger-parameter %}

{% swagger-parameter in="body" name="createDate" %}
2022-04-29T14:44:49.331Z
{% endswagger-parameter %}

{% swagger-parameter in="body" name="updateDate" %}
2022-04-29T14:44:49.331Z
{% endswagger-parameter %}

{% swagger-parameter in="body" name="hederaStatus" %}
ISSUE
{% endswagger-parameter %}

{% swagger-parameter in="body" name="signature" %}
0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="type" %}
issue_request
{% endswagger-parameter %}

{% swagger-parameter in="body" name="policyId" %}
626bf178d24497fe1b1e4139
{% endswagger-parameter %}

{% swagger-parameter in="body" name="tag" %}
create_issue_request
{% endswagger-parameter %}

{% swagger-parameter in="body" name="option" %}
{

&#x20;     "status":"Approved"

&#x20;  },
{% endswagger-parameter %}

{% swagger-parameter in="body" name="schema" %}
\#88f6b2ad-5945-4086-b15c-8181654948c8&1.0.0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="messageId" %}
1651243487.331059459
{% endswagger-parameter %}

{% swagger-parameter in="body" name="topicId" %}
0.0.34350746
{% endswagger-parameter %}

{% swagger-parameter in="body" name="relationships" %}
\[

&#x20;     "1651243356.729744000"

&#x20;  ],
{% endswagger-parameter %}

{% swagger-parameter in="body" name="__sourceTag__" %}
issue_requests_source(need_approve)
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthorized" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="403: Forbidden" description="Forbidden" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```javascript
{
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Error'
}
```
{% endswagger-response %}
{% endswagger %}

### Root Authority (Get TrustChain)

BLOCK trustChainBlock

{% swagger method="get" path="" baseUrl="/policies/{policyId}/blocks/{blockId}" summary="Displaying TrustChain" %}
{% swagger-description %}
/policies/626bf178d24497fe1b1e4139/blocks/61235b3d-b793-4363-b51d-62df371493cd
{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/PolicyBlockData'
}
```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthorized" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="403: Forbidden" description="Forbidden" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```javascript
{
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Error'
}
```
{% endswagger-response %}
{% endswagger %}
