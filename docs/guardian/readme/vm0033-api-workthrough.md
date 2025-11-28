---
icon: webhook
---

# VM0033 API Workthrough

Below is complete API flow to execute Verra VM0033 Methodology:

### 1. Policy Preparing from Standard Registry (SR) side:

#### 1.1 Login by SR

<figure><img src="../../.gitbook/assets/image (12) (1) (1).png" alt=""><figcaption></figcaption></figure>

To login, the user must request a refresh token:

<mark style="color:green;">`POST`</mark>`http://localhost:4200/api/v1/accounts/login/` with credentials in body:

```json5
   {
      "username":"StandardRegistry",
      "password":"test"
   }
```

Successful response looks like:

```json5
{
   "username": "StandardRegistry",
   "did": "did:hedera:testnet:83JSEFhdaoZ4ougdVtCpAWXbsCP8hcuNpSZeEJ8GSins_0.0.6851752",
   "role": "STANDARD_REGISTRY",
   "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9eyJpZCI6ImY0MGZiMDIzLWNlMzUtNDFmYS1hNzAxLTkyYjdmMmQ1MzQ5MiIsm5hbWUiOiJTdGFuZGFyZFJlZ2lzdHJ5IiwiZXhaXJlQXQiOjE3ODk0ODAxMzU2NTQsImlhdCI6MTc1Nzk0NDEzNX0Lr10b-in9SlAgTvKLwdypOVY8uANlAEJ1zNduHK8OpTxIUS-dBZ39OAZyr4sQRqsJYkxtRAiItYOgS45EvPBP1u-XMAzS2CqeM2lu2N81k53Sy6RQrDmpK_YIDMmRWeWMulJJ5IWtSe3kga4hwbYs0SyTXRkuVfoG-SnAlmTgA",
   "weakPassword": false
}
```

**With the `refreshToken` from the response, you can obtain an access token, which is then used in the `authorization` header for each request:**

<mark style="color:green;">`POST`</mark> `http://localhost:4200/api/v1/accounts/access-token/`

```json5
{
   "refreshToken":"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9. eyJpZCI6Ijc4NWRmODljLTY2OTQtNGIwMC04OWRlLTllZjJkMjZkY2RmZiIsIm5hbWUiOiJTdGFuZGFyZFJlZ2lzdHJ5IiwiZXhwa XJlQXQiOjE3ODk0ODAwNjg5NDAsImlhdCI6MTc1Nzk0NDA2OH0. NdCEXa-29qI79XcKN51P12rqLDsH2CvUUqWrS1OBTaNAetiuwYOkvhpx67RblauILY3VmxHf3kYqxhn93RmD5tjhh8G4AM4KCErGOdknUbhc_wTpM2gha_xkljNw4QP-x5rbPRXpK6f3DhjP21gwTmMpMiF9kVz1r6MikelmWLc"
}
```

Successful response looks like:

```json5
{
   "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IlN0YW5kYXJkUmVnaXN0cnkiLCJkaWQiOiJkaWQ6aGVkZXJhOnRlc3RuZXQ6ODNKU0VGaGRhb1o0b3VnZFZ0Q3BBV1hic0NQOGhjdU5wU1plRUo4R1NpbnNfMC4wLjY4NTE3NTIiLCJyb2xlIjoiU1RBTkRBUkRfUkVHSVNUUlkiLCJleHBpcmVBdCI6MTc4OTQ4MDA2ODk3NiwiaWF0IjoxNzU3OTQ0MDY4fQ.ZESg2mjHRGHehoS-WAGvUJMekWsfqcgVCYxRdLfnuKQ7AyYdypVXguNZzSJnu5fcaP-zOTWH7C_Dhs_w7Jx4BEQOhv7Cjd0_XPI9hluTZ13VzkrkkWkwpavCtCn2YM4OvbIPSVtBvZI4u2unkfhLMTOx17Vf0S-moYq-z9cQv2I"
}
```

#### 1.2 VM0033 Policy Importing

<figure><img src="../../.gitbook/assets/import.png" alt=""><figcaption></figcaption></figure>

**To import a policy, send a request with the policy’s `messageId` in the body:**

<mark style="color:green;">`POST`</mark> `http://localhost:4200/api/v1/policies/import/message/`

with body:

```json5
{
   "messageId":"1755735271.024933000"
} 
```

Successful response looks like:

```json5
{
 "createDate": "2025-09-15T13:48:51.980Z",
 "uuid": "0aa2451e-70e6-49eb-a277-b0217c7699e4",
 "name": "VM0033-v1.0.3_8_14_1755731415625",
 "description": "This methodology outlines procedures for estimating net greenhouse gas (GHG) emission reductions and removals from tidal wetland restoration projects.",
 "status": "DRAFT",
 "creator": "did:hedera:testnet:83JSEFhdaoZ4ougdVtCpAWXbsCP8hcuNpSZeEJ8GSins_0.0.6851752",
 "owner": "did:hedera:testnet:83JSEFhdaoZ4ougdVtCpAWXbsCP8hcuNpSZeEJ8GSins_0.0.6851752",
 "policyRoles": [
     "Project_Proponent",
     "VVB"
 ],
 "policyGroups": [],
 "topicId": "0.0.6851810",
 "instanceTopicId": null,
 "policyTag": "Tag_1757944077340",
 "codeVersion": "1.5.1",
 "tools": [
     {
         "name": "AR Tool 05(3.0.2)",
         "topicId": "0.0.5987758",
         "messageId": "1747119324.564353000"
     },
     {
         "name": "AR Tool 14(5.0.7)",
         "topicId": "0.0.6471034",
         "messageId": "1753864157.889867000"
     }
 ],
 "_id": "68c952870fd12e530dddadf8",
 "userRoles": [
     "Administrator"
 ],
 "userGroups": [],
 "userRole": "Administrator",
 "userGroup": null,
 "tests": [],
 "id": "68c952870fd12e530dddadf8"
}
```

#### 1.3 Policy Publishing

<figure><img src="../../.gitbook/assets/image (4) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

**To publish a policy, use the id field from the previous step in the request:**

<mark style="color:green;">`POST`</mark> `http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/publish/`

with body, field `policyAvailability` optional:

```json5
{
   "policyVersion":"1.2.5",
   "policyAvailability":"private"
}
```

Successful response looks like:

```json5
{
 "isValid": true,
 "errors": {
     "errors": [],
     "blocks": [ 
         there are a list of blocks, one of them for example:           
         {
             "id": "9f25ddec-772c-4d3b-8268-29db09c45f8d",
             "name": "buttonBlock",
             "errors": [],
             "isValid": true
         }
     ],
     "modules": [],
     "tools": [
         there are a list of tools, one of them for example:
         {
             "errors": [],
             "blocks": [
                 {
                     "id": "b7984eab-893a-497f-ba73-3e6d4c0b7ce0",
                     "name": "extractDataBlock",
                     "errors": [],
                     "isValid": true
                 },
                 {
                     "id": "52974f49-497d-403b-9616-829da32590fe",
                     "name": "customLogicBlock",
                     "errors": [],
                     "isValid": true
                 },
                 {
                     "id": "16f57f36-48db-4989-adb1-ddb276fc23f1",
                     "name": "extractDataBlock",
                     "errors": [],
                     "isValid": true
                 }
             ],
             "tools": [],
             "id": "f52b313c-219c-498b-9ff2-05476753483c",
             "isValid": true
         },
     ],
     "isValid": true
 },
 "policies": [
     {
         "createDate": "2025-09-15T13:48:51.980Z",
         "uuid": "0aa2451e-70e6-49eb-a277-b0217c7699e4",
         "name": "VM0033-v1.0.3_8_14_1755731415625",
         "version": "1.2.5",
         "description": "This methodology outlines procedures for estimating net greenhouse gas (GHG) emission reductions and removals from tidal wetland restoration projects.",
         "status": "PUBLISH",
         "creator": "did:hedera:testnet:83JSEFhdaoZ4ougdVtCpAWXbsCP8hcuNpSZeEJ8GSins_0.0.6851752",
         "owner": "did:hedera:testnet:83JSEFhdaoZ4ougdVtCpAWXbsCP8hcuNpSZeEJ8GSins_0.0.6851752",
         "policyRoles": [
             "Project_Proponent",
             "VVB"
         ],
         "policyGroups": [],
         "topicId": "0.0.6851810",
         "instanceTopicId": "0.0.6851818",
         "policyTag": "Tag_1757944077340",
         "messageId": "1757944246.325090000",
         "codeVersion": "1.5.1",
         "tools": [
             {
                 "name": "AR Tool 05(3.0.2)",
                 "topicId": "0.0.5987758",
                 "messageId": "1747119324.564353000"
             },
             {
                 "name": "AR Tool 14(5.0.7)",
                 "topicId": "0.0.6471034",
                 "messageId": "1753864157.889867000"
             }
         ],
         "_id": "68c952870fd12e530dddadf8",
         "userRoles": [
             "Administrator"
         ],
         "userGroups": [],
         "userRole": "Administrator",
         "userGroup": null,
         "tests": [],
         "id": "68c952870fd12e530dddadf8"
     }
  ]
}
```

#### 1.4 Assign Policy to VVB and Project Proponent (PP) Users

<figure><img src="../../.gitbook/assets/image (5) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

**To assign a policy to a user, include the username in the request body, and set the `policyId` field to the id value from the policy importing step:**

<mark style="color:green;">`POST`</mark> `http://localhost:4200/api/v1/permissions/users/{username}/policies/assign/`

For example:

<mark style="color:green;">`POST`</mark> `http://localhost:4200/api/v1/permissions/users/ProjectProponent/policies/assign/`

<mark style="color:green;">`POST`</mark> `http://localhost:4200/api/v1/permissions/users/VVB/policies/assign/`

with body, where in policyId using "id" field from policy importing step:

```json5
{
   "policyIds":["68c952870fd12e530dddadf8"],
   "assign":true
}
```

Successful response looks like:

```json5
   true
```

### 2. Token associate and grant KYC

#### 2.1 Login as SR

#### 2.1.1 Associate Token for PP

**Before associating, obtain the `tokenId` by extracting it from the token linked to the policy:**

<mark style="color:red;">`GET`</mark> `http://localhost:4200/api/v1/tokens`

Successful response looks like:

```json5
   [
      {
         "id":"68c819368a003cc1fb32e9b6",
         "tokenId":"0.0.6851817",
         "tokenName":"VCU",
         "tokenSymbol":"VCU",
         "tokenType":"non-fungible",
         "decimals":0,
         "policyId":null,
         "enableAdmin":true,
         "enableFreeze":true,
         "enableKYC":true,
         "enableWipe":true,
         "associated":false,
         "balance":null,
         "hBarBalance":null,
         "frozen":null,
         "kyc":null,
         "policies":["VM0033-v1.0.3_8_14_1755731415625 (1.2.5)"],
         "policyIds":["68c952870fd12e530dddadf8"],
         "canDelete":false
      }
   ]
```

We need to extract `tokenId` from token, which linked with our policy(`policyId` from step 1.2 equal with `policyIds` in response)

**Send a request with the `tokenId` from the previous response:**

<mark style="color:green;">`PUT`</mark> `http://localhost:4200/api/v1/tokens/0.0.6851817/associate`

Successful response looks like:

```json5
   {
      "tokenName":"VCU",
      "status":true
   }
```

#### 2.3 Login by PP

#### 2.3.1 Grant KYC Token by PP

**To grant a KYC token, send a request with the `tokenId` and the `username`:**

<mark style="color:green;">`PUT`</mark> `http://localhost:4200/api/v1/tokens/0.0.6851817/ProjectProponent/grant-kyc`

Successful response looks like:

```json5
   {
      "id":"68c819368a003cc1fb32e9b6",
      "tokenId":"0.0.6851817",
      "tokenName":"VCU",
      "tokenSymbol":"VCU",
      "tokenType":"non-fungible",
      "decimals":0,
      "policyId":null,
      "enableAdmin":true,
      "enableFreeze":true,
      "enableKYC":true,
      "enableWipe":true,
      "associated":true,
      "balance":"0",
      "hBarBalance":"4.78479825 ℏ",
      "frozen":false,
      "kyc":true
   }
```

### 3 Register PP in policy and create project description

#### 3.1 Login by PP

#### 3.2 Choose PP Role in Policy and Create Project Description

<figure><img src="../../.gitbook/assets/image (6) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

**To choose a role in the policy, send a request with the role name in the body:**

<mark style="color:green;">`POST`</mark> `http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/Choose_Roles/blocks/`

with body:

```json5
   {
      "role":"Project_Proponent"
   }
```

Successful response looks like:

```json5
true
```

**To create a project description in the policy, send a request with the project description details. (The payload example is large and will be attached separately.):**

<figure><img src="../../.gitbook/assets/image (9) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

<mark style="color:green;">`POST`</mark> `http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/add_project_bnt/blocks/`

```json5
body: {
   "document": *payload from file*,
   "ref": null
}
```

Successful response looks like:

```json5
{
"policyId": "68c952870fd12e530dddadf8",
"tag": "add_project_bnt",
"hash": "5ANJA6RqAxm8CE1LD6gXobZF4xh5JqSFoBgDPQ1LYprT",
"document": {
 "id": "urn:uuid:823784f9-b381-4baf-91b7-26f1eeac3313",
 "type": [
   "VerifiableCredential"
 ],
 "issuer": "did:hedera:testnet:DDyFMz36eN1cBEopW79DmCUYx75qK7fsohioqM1X72pn_0.0.6851752",
 "issuanceDate": "2025-09-15T13:52:53.318Z",
 "@context": [
   "https://www.w3.org/2018/credentials/v1",
   "ipfs://bafkreiaumw2eerg4g54l5lqlpl3osnrpw6qrhvfaooiivepuusanby7b5i"
 ],
 "credentialSubject":*there is payload from request*,
 "proof": {
   "type": "Ed25519Signature2018",
   "created": "2025-09-15T13:52:56Z",
   "verificationMethod": "did:hedera:testnet:DDyFMz36eN1cBEopW79DmCUYx75qK7fsohioqM1X72pn_0.0.6851752#did-root-key",
   "proofPurpose": "assertionMethod",
   "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..pq81MSFjH4-c0nEZWSO1TfbxOiP-jOtXEYhuU9JbCsW749jrBUm2Q3lqnHDgELPc9xKFi7rL3wwfuKHrDZl_DQ"
 }
},
"owner": "did:hedera:testnet:DDyFMz36eN1cBEopW79DmCUYx75qK7fsohioqM1X72pn_0.0.6851752",
"group": "4263ca60-ef8a-4fce-946d-e9242dc46278",
"hederaStatus": "NEW",
"signature": 0,
"type": "#d4b36968-9c0d-4a64-9d3f-59dc630bc1d4&1.0.0",
"schema": "#d4b36968-9c0d-4a64-9d3f-59dc630bc1d4&1.0.0",
"accounts": {
 "default": "0.0.6851803"
},
"relationships": null
}
```

**Wait for the request to finish processing:**

<figure><img src="../../.gitbook/assets/image (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

<mark style="color:red;">`GET`</mark> `http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/project_grid_pp_2/blocks`

Waiting while `data.option.status` would be equal "Waiting to be Added":

```json5
{
"id": "599bc800-3413-4606-b770-563fcfdef5fb",
"blockType": "interfaceDocumentsSourceBlock",
"actionType": "local",
"readonly": false,
"data": [
 {
   "createDate": "2025-09-16T12:10:55.134Z",
   "updateDate": "2025-09-16T12:10:55.321Z",
   "_propHash": "a436cf898f1337442cb7794381e292a8",
   "_docHash": "b9c75ab0e3f6c40fa0fd23a3de673e32",
   "hash": "6v8F2e4bLdf6yccg4XVh5BFHsDEm41aC36FnnofEWf3W",
   "hederaStatus": "ISSUE",
   "signature": 0,
   "type": "project",
   "policyId": "68c952870fd12e530dddadf8",
   "tag": "save_project_auto",
   "schema": "#6482c99e-4af8-4cd1-94e6-ee82d2284197&1.0.0",
   "option": {
     "status": "Waiting to be Added"
   },
   "relationships": [
     "1758024619.744335000",
     "1758024539.869960000"
   ],
   "owner": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936",
   "group": "5d49111f-c662-4494-ac71-35c4826f5684",
   "accounts": {
     "default": "0.0.6856932"
   },
   "tokens": null,
   "topicId": "0.0.6856972",
   "messageId": "1758024652.684467000",
   "messageHash": "CQ4LpNhuNA9MGv5HdmaAdLz3oT42wbTsxUE7VNzzEGSL",
   "messageIds": [
     "1758024652.684467000"
   ],
   "document": {
     "id": "urn:uuid:0ee4a666-7b8a-4857-afcc-b048aec177dc",
     "type": [
       "VerifiableCredential"
     ],
     "issuer": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936",
     "issuanceDate": "2025-09-16T12:10:29.158Z",
     "@context": [
       "https://www.w3.org/2018/credentials/v1",
       "ipfs://bafkreig74sj6ovdiro5slbtrvz3nnpqddsh64vtiebdro47k77vxesenmm"
     ],"credentialSubject": *there is huge payload*,
     "proof": {
       "type": "Ed25519Signature2018",
       "created": "2025-09-16T12:10:32Z",
       "verificationMethod": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936#did-root-key",
       "proofPurpose": "assertionMethod",
       "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..-czwVoPGwWiLFbo0xjcAgf9buHVqUdD59HKIJFZa-XbYk_2uSDaskCvQxpDrHlCJrwSe0BL76Gpb6UpQ-G9TCw"
     }
   },
   "documentFileId": "68c953cf7d1632a3d92d63e5",
   "documentFields": [
     "id",
     "credentialSubject.id",
     "credentialSubject.0.id",
     "issuer",
     "credentialSubject.0.field0",
     "credentialSubject.0.project_details.G5",
     "credentialSubject.0.ref",
     "verifiableCredential.0.credentialSubject.0.field0.field0",
     "verifiableCredential.1.credentialSubject.0.amount",
     "credentialSubject.0.tokenId",
     "credentialSubject.0.serials"
   ],
   "_id": "68c953cf7d1632a3d92d63dd",
   "__sourceTag__": "project_grid_pp_2_waiting_to_add_projects",
   "history": [
     {
       "labelValue": "Waiting to be Added",
       "created": "2025-09-16T12:10:55.533Z"
     }
   ],
   "id": "68c953cf7d1632a3d92d63dd"
 }
],
"blocks": [
 {
   "id": "5e1b4ecb-5860-4a53-a734-de96bbf45fe3",
   "uiMetaData": {
     "options": [],
     "title": "",
     "content": "Project Name"
   },
   "blockType": "filtersAddon"
 }
],
"commonAddons": [
 {
   "id": "1bec12bf-486d-4014-994a-ee0937a64ae9",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "1c88d5df-6519-496f-b02f-76de9ce3b0be",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "c1cd6720-6129-4c62-ae8f-4b850bb113b7",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "ad0aa831-b318-4e93-b6fa-eb01fef01f83",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "930d5a57-080e-4289-9fe7-3f71192e200f",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "f41365cf-a1c5-4394-bfda-a0d74e7f9bb1",
   "blockType": "historyAddon"
 }
],
"fields": [
 {
   "title": "Project",
   "name": "document.credentialSubject.0.project_details.G5",
   "tooltip": "",
   "type": "text"
 },
 {
   "title": "Status",
   "name": "option.status",
   "tooltip": "",
   "type": "text",
   "width": "170px"
 },
 {
   "title": "Assign",
   "name": "assignedTo",
   "tooltip": "",
   "type": "block",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "assign_vvb",
   "bindGroup": "project_grid_pp_2_waiting_to_validate_projects",
   "width": "150px"
 },
 {
   "title": "Assign",
   "name": "assignedTo",
   "tooltip": "",
   "type": "text",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "",
   "bindGroup": "project_grid_pp_2_validated_projects",
   "width": "150px"
 },
 {
   "title": "Add Report",
   "name": "report",
   "tooltip": "",
   "type": "block",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "add_report_bnt",
   "bindGroup": "project_grid_pp_2_validated_projects",
   "width": "150px"
 },
 {
   "title": "View Reports",
   "name": "document.credentialSubject.0.id",
   "tooltip": "",
   "type": "button",
   "action": "link",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "report_grid_pp",
   "content": "View Reports",
   "bindGroup": "project_grid_pp_2_validated_projects",
   "width": "150px"
 },
 {
   "title": "Document",
   "name": "document",
   "tooltip": "",
   "type": "button",
   "action": "dialog",
   "url": "",
   "dialogContent": "VC",
   "dialogClass": "",
   "dialogType": "json",
   "bindBlock": "",
   "content": "View Document",
   "uiClass": "link"
 },
 {
   "title": "Revoke",
   "name": "",
   "tooltip": "",
   "type": "block",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "revoke_project_pp_btn",
   "width": "100px",
   "bindGroup": "project_grid_pp_2_waiting_to_add_projects"
 },
 {
   "title": "Revoke",
   "name": "",
   "tooltip": "",
   "type": "block",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "revoke_project_pp_btn",
   "width": "100px",
   "bindGroup": "project_grid_pp_2_waiting_to_validate_projects"
 },
 {
   "title": "Revoke",
   "name": "",
   "tooltip": "",
   "type": "block",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "revoke_project_pp_btn",
   "width": "100px",
   "bindGroup": "project_grid_pp_2_validated_projects_own"
 }
],
"viewHistory": true
}
```

### 4 Register VVB

#### 4.1 Login by VVB

#### 4.2 Choose VVB Role

<figure><img src="../../.gitbook/assets/image (2) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../.gitbook/assets/image (3) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

**To choose a role in the policy, send a request with the role name in the body:**

<mark style="color:green;">`POST`</mark> `http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/Choose_Roles/blocks/`

with body:

```json5
   {
      "role":"VVB"
   }
```

Successful response looks like:

```json5
true
```

**To create a VVB in the policy, send a request with the VVB name in the body:**

<figure><img src="../../.gitbook/assets/image (4) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

`POST http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/create_new_vvb/blocks`

with body:

```json5
{
   "document":
      {
         "field0":"TestingVVBName"
      },
   "ref":null
}
```

Successful response looks like:

```json5
{
"policyId": "68c952870fd12e530dddadf8",
"tag": "create_new_vvb",
"hash": "7vC6FAPkZS1oTySBgef3M7iwWAJViVzMHzc8eBVDKAaP",
"document": {
 "id": "urn:uuid:f56a4268-aeff-4ba5-b61b-f242b2c4c966",
 "type": [
   "VerifiableCredential"
 ],
 "issuer": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936",
 "issuanceDate": "2025-09-16T12:09:21.143Z",
 "@context": [
   "https://www.w3.org/2018/credentials/v1",
   "ipfs://bafkreig74sj6ovdiro5slbtrvz3nnpqddsh64vtiebdro47k77vxesenmm"
 ],
 "credentialSubject": [
   {
     "field0": "TestingVVBName",
     "policyId": "68c952870fd12e530dddadf8",
     "guardianVersion": "3.3.0",
     "@context": [
       "ipfs://bafkreig74sj6ovdiro5slbtrvz3nnpqddsh64vtiebdro47k77vxesenmm"
     ],
     "id": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936",
     "type": "de418a5a-5df8-44f0-aa31-ff834b980836&1.0.0"
   }
 ],
 "proof": {
   "type": "Ed25519Signature2018",
   "created": "2025-09-16T12:09:23Z",
   "verificationMethod": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936#did-root-key",
   "proofPurpose": "assertionMethod",
   "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19.._OZaqFpfxkT1jxWxdlQBqB9WDCgrOm31QyOjBk16LX6lNulMtMvwxtpjDuFTUyK5tv-6QViYId3ZyiadYqwCDg"
 }
},
"owner": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936",
"group": "2c6c93e9-d089-4518-9f66-e548df9e0cac",
"hederaStatus": "NEW",
"signature": 0,
"type": "#de418a5a-5df8-44f0-aa31-ff834b980836&1.0.0",
"schema": "#de418a5a-5df8-44f0-aa31-ff834b980836&1.0.0",
"accounts": {
 "default": "0.0.6856934"
},
"relationships": null
}
```

**Wait until the title is equal to “Waiting for approval”:**

<figure><img src="../../.gitbook/assets/image (5) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

<mark style="color:red;">`GET`</mark>` `` ``http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/new_VVB/blocks `

Waiting while `blocks.uiMetaData.title` would be equal "Waiting for approval":

```json5
{
"id": "9a184131-9eaa-44cf-bc93-b2c18bc141b1",
"blockType": "interfaceStepBlock",
"actionType": "remote",
"readonly": false,
"uiMetaData": {
 "type": "blank"
},
"index": 3,
"blocks": [
 null,
 null,
 null,
 {
   "uiMetaData": {
     "title": "Waiting for approval",
     "description": "Waiting for approval",
     "type": "text"
   },
   "content": "informationBlock",
   "blockType": "informationBlock",
   "id": "5f70b00e-f81d-4abd-b69d-24696943031d"
 },
 null,
 null,
 null,
 null,
 null,
 null,
 null,
 null,
 null,
 null
]
}
```

### 5 Project Flow

#### 5.1 Login by SR

#### 5.2 Add Project

<figure><img src="../../.gitbook/assets/image (6) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

**Get the project reference by saving the response data:**

<mark style="color:red;">`GET`</mark> `http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/project_grid_verra/blocks`

Change the project status from “Waiting to be Added” to “Waiting to Validate”:

<figure><img src="../../.gitbook/assets/image (7) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

```json5
{
"id": "c107ac28-caa5-4cd1-828d-397e292880f7",
"blockType": "interfaceDocumentsSourceBlock",
"actionType": "local",
"readonly": false,
"data": [
 {
   "createDate": "2025-09-16T12:10:55.134Z",
   "updateDate": "2025-09-16T12:10:55.321Z",
   "_propHash": "a436cf898f1337442cb7794381e292a8",
   "_docHash": "b9c75ab0e3f6c40fa0fd23a3de673e32",
   "hash": "6v8F2e4bLdf6yccg4XVh5BFHsDEm41aC36FnnofEWf3W",
   "hederaStatus": "ISSUE",
   "signature": 0,
   "type": "project",
   "policyId": "68c952870fd12e530dddadf8",
   "tag": "save_project_auto",
   "schema": "#6482c99e-4af8-4cd1-94e6-ee82d2284197&1.0.0",
   "option": {
     "status": "Waiting to be Added"
   },
   "relationships": [
     "1758024619.744335000",
     "1758024539.869960000"
   ],
   "owner": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936",
   "group": "5d49111f-c662-4494-ac71-35c4826f5684",
   "accounts": {
     "default": "0.0.6856932"
   },
   "tokens": null,
   "topicId": "0.0.6856972",
   "messageId": "1758024652.684467000",
   "messageHash": "CQ4LpNhuNA9MGv5HdmaAdLz3oT42wbTsxUE7VNzzEGSL",
   "messageIds": [
     "1758024652.684467000"
   ],
   "document": {
     "id": "urn:uuid:0ee4a666-7b8a-4857-afcc-b048aec177dc",
     "type": [
       "VerifiableCredential"
     ],
     "issuer": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936",
     "issuanceDate": "2025-09-16T12:10:29.158Z",
     "@context": [
       "https://www.w3.org/2018/credentials/v1",
       "ipfs://bafkreig74sj6ovdiro5slbtrvz3nnpqddsh64vtiebdro47k77vxesenmm"
     ],
     "credentialSubject": *there is huge payload*,
     "proof": {
       "type": "Ed25519Signature2018",
       "created": "2025-09-16T12:10:32Z",
       "verificationMethod": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936#did-root-key",
       "proofPurpose": "assertionMethod",
       "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..-czwVoPGwWiLFbo0xjcAgf9buHVqUdD59HKIJFZa-XbYk_2uSDaskCvQxpDrHlCJrwSe0BL76Gpb6UpQ-G9TCw"
     }
   },
   "documentFileId": "68c953cf7d1632a3d92d63e5",
   "documentFields": [
     "id",
     "credentialSubject.id",
     "credentialSubject.0.id",
     "issuer",
     "credentialSubject.0.field0",
     "credentialSubject.0.project_details.G5",
     "credentialSubject.0.ref",
     "verifiableCredential.0.credentialSubject.0.field0.field0",
     "verifiableCredential.1.credentialSubject.0.amount",
     "credentialSubject.0.tokenId",
     "credentialSubject.0.serials"
   ],
   "_id": "68c953cf7d1632a3d92d63dd",
   "__sourceTag__": "project_grid_verra_waiting_to_add_projects",
   "id": "68c953cf7d1632a3d92d63dd"
 }
],
"blocks": [
 {
   "id": "451fdcab-bdf3-4e21-a018-9e06b6bb63e8",
   "uiMetaData": {
     "options": [],
     "content": "Project Name"
   },
   "blockType": "filtersAddon"
 }
],
"commonAddons": [
 {
   "id": "3cc1e78e-4a8c-4979-b76d-181edfed61e5",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "31ec045e-430c-47b9-ab61-ccf8cd1b389f",
   "blockType": "documentsSourceAddon"
 }
],
"fields": [
 {
   "title": "Project",
   "name": "document.credentialSubject.0.project_details.G5",
   "tooltip": "",
   "type": "text"
 },
 {
   "title": "Status",
   "name": "option.status",
   "tooltip": "",
   "type": "text",
   "width": "150px"
 },
 {
   "title": "Add",
   "name": "add",
   "tooltip": "",
   "type": "block",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "add_project",
   "bindGroup": "project_grid_verra_waiting_to_add_projects",
   "width": "150px"
 },
 {
   "title": "Document",
   "name": "document",
   "tooltip": "",
   "type": "button",
   "action": "dialog",
   "url": "",
   "dialogContent": "VC",
   "dialogClass": "",
   "dialogType": "json",
   "bindBlock": "",
   "content": "View Document",
   "uiClass": "link",
   "width": "150px"
 }
],
"type": "blank",
"viewHistory": false
}
```

**Send the updated project data in the request:**

<mark style="color:green;">`POST`</mark> `http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/add_project/blocks`

With body:

```json5
{
   "document": *changed project data*,
   "tag": "Option_0"
}
```

#### 5.3 Login by PP

#### 5.4 Assign Project

<figure><img src="../../.gitbook/assets/image (8) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

**Get the project reference by saving the response data:**

<mark style="color:red;">`GET`</mark> `http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/project_grid_pp_2/blocks`

Create and fill the field with the VVB DID:

```json5
{
"id": "599bc800-3413-4606-b770-563fcfdef5fb",
"blockType": "interfaceDocumentsSourceBlock",
"actionType": "local",
"readonly": false,
"data": [
 {
   "createDate": "2025-09-16T12:10:55.134Z",
   "updateDate": "2025-09-16T12:11:19.572Z",
   "_propHash": "145fdf530827acf5761b3050ea701ab7",
   "_docHash": "b9c75ab0e3f6c40fa0fd23a3de673e32",
   "hash": "6v8F2e4bLdf6yccg4XVh5BFHsDEm41aC36FnnofEWf3W",
   "hederaStatus": "ISSUE",
   "signature": 0,
   "type": "project",
   "policyId": "68c952870fd12e530dddadf8",
   "tag": "save_added",
   "schema": "#6482c99e-4af8-4cd1-94e6-ee82d2284197&1.0.0",
   "option": {
     "status": "Waiting to Validate"
   },
   "relationships": [
     "1758024619.744335000",
     "1758024539.869960000"
   ],
   "owner": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936",
   "group": "5d49111f-c662-4494-ac71-35c4826f5684",
   "accounts": {
     "default": "0.0.6856932"
   },
   "tokens": null,
   "topicId": "0.0.6856972",
   "messageId": "1758024652.684467000",
   "messageHash": "CQ4LpNhuNA9MGv5HdmaAdLz3oT42wbTsxUE7VNzzEGSL",
   "messageIds": [
     "1758024652.684467000"
   ],
   "document": {
     "id": "urn:uuid:0ee4a666-7b8a-4857-afcc-b048aec177dc",
     "type": [
       "VerifiableCredential"
     ],
     "issuer": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936",
     "issuanceDate": "2025-09-16T12:10:29.158Z",
     "@context": [
       "https://www.w3.org/2018/credentials/v1",
       "ipfs://bafkreig74sj6ovdiro5slbtrvz3nnpqddsh64vtiebdro47k77vxesenmm"
     ],
     "credentialSubject": *there is huge payload*,
     "proof": {
       "type": "Ed25519Signature2018",
       "created": "2025-09-16T12:10:32Z",
       "verificationMethod": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936#did-root-key",
       "proofPurpose": "assertionMethod",
       "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..-czwVoPGwWiLFbo0xjcAgf9buHVqUdD59HKIJFZa-XbYk_2uSDaskCvQxpDrHlCJrwSe0BL76Gpb6UpQ-G9TCw"
     }
   },
   "documentFileId": "68c953e77d1632a3d92d63ff",
   "documentFields": [
     "id",
     "credentialSubject.id",
     "credentialSubject.0.id",
     "issuer",
     "credentialSubject.0.field0",
     "credentialSubject.0.project_details.G5",
     "credentialSubject.0.ref",
     "verifiableCredential.0.credentialSubject.0.field0.field0",
     "verifiableCredential.1.credentialSubject.0.amount",
     "credentialSubject.0.tokenId",
     "credentialSubject.0.serials"
   ],
   "_id": "68c953cf7d1632a3d92d63dd",
   "__sourceTag__": "project_grid_pp_2_waiting_to_validate_projects",
   "history": [
     {
       "labelValue": "Waiting to be Added",
       "created": "2025-09-16T12:10:55.533Z"
     },
     {
       "labelValue": "Waiting to Validate",
       "created": "2025-09-16T12:11:19.704Z"
     }
   ],
   "id": "68c953cf7d1632a3d92d63dd"
 }
],
"blocks": [
 {
   "id": "5e1b4ecb-5860-4a53-a734-de96bbf45fe3",
   "uiMetaData": {
     "options": [],
     "title": "",
     "content": "Project Name"
   },
   "blockType": "filtersAddon"
 }
],
"commonAddons": [
 {
   "id": "1bec12bf-486d-4014-994a-ee0937a64ae9",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "1c88d5df-6519-496f-b02f-76de9ce3b0be",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "c1cd6720-6129-4c62-ae8f-4b850bb113b7",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "ad0aa831-b318-4e93-b6fa-eb01fef01f83",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "930d5a57-080e-4289-9fe7-3f71192e200f",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "f41365cf-a1c5-4394-bfda-a0d74e7f9bb1",
   "blockType": "historyAddon"
 }
],
"fields": [
 {
   "title": "Project",
   "name": "document.credentialSubject.0.project_details.G5",
   "tooltip": "",
   "type": "text"
 },
 {
   "title": "Status",
   "name": "option.status",
   "tooltip": "",
   "type": "text",
   "width": "170px"
 },
 {
   "title": "Assign",
   "name": "assignedTo",
   "tooltip": "",
   "type": "block",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "assign_vvb",
   "bindGroup": "project_grid_pp_2_waiting_to_validate_projects",
   "width": "150px"
 },
 {
   "title": "Assign",
   "name": "assignedTo",
   "tooltip": "",
   "type": "text",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "",
   "bindGroup": "project_grid_pp_2_validated_projects",
   "width": "150px"
 },
 {
   "title": "Add Report",
   "name": "report",
   "tooltip": "",
   "type": "block",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "add_report_bnt",
   "bindGroup": "project_grid_pp_2_validated_projects",
   "width": "150px"
 },
 {
   "title": "View Reports",
   "name": "document.credentialSubject.0.id",
   "tooltip": "",
   "type": "button",
   "action": "link",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "report_grid_pp",
   "content": "View Reports",
   "bindGroup": "project_grid_pp_2_validated_projects",
   "width": "150px"
 },
 {
   "title": "Document",
   "name": "document",
   "tooltip": "",
   "type": "button",
   "action": "dialog",
   "url": "",
   "dialogContent": "VC",
   "dialogClass": "",
   "dialogType": "json",
   "bindBlock": "",
   "content": "View Document",
   "uiClass": "link"
 },
 {
   "title": "Revoke",
   "name": "",
   "tooltip": "",
   "type": "block",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "revoke_project_pp_btn",
   "width": "100px",
   "bindGroup": "project_grid_pp_2_waiting_to_add_projects"
 },
 {
   "title": "Revoke",
   "name": "",
   "tooltip": "",
   "type": "block",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "revoke_project_pp_btn",
   "width": "100px",
   "bindGroup": "project_grid_pp_2_waiting_to_validate_projects"
 },
 {
   "title": "Revoke",
   "name": "",
   "tooltip": "",
   "type": "block",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "revoke_project_pp_btn",
   "width": "100px",
   "bindGroup": "project_grid_pp_2_validated_projects_own"
 }
],
"viewHistory": true
}
```

**Send the updated project data in the request:**

<mark style="color:green;">`POST`</mark> `http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/assign_vvb/blocks`

With body:

```json5
*changed project data*
```

#### 5.5 Login by VVB

#### 5.6 Approve Project

<figure><img src="../../.gitbook/assets/image (9) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

**Wait until the project status changes to “Waiting to Validate”:**

<mark style="color:red;">`GET`</mark> `http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/project_grid_vvb/blocks`

Save the response data as a reference and update the status to “Validated”

<figure><img src="../../.gitbook/assets/image (10) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

```json5
{
"id": "302c3526-c319-4f26-8cde-747c95011af7",
"blockType": "interfaceDocumentsSourceBlock",
"actionType": "local",
"readonly": false,
"data": [
 {
   "createDate": "2025-09-16T12:10:55.134Z",
   "updateDate": "2025-09-16T12:11:24.736Z",
   "_propHash": "4d427fe22477cef84ea78b166130269a",
   "_docHash": "b9c75ab0e3f6c40fa0fd23a3de673e32",
   "hash": "6v8F2e4bLdf6yccg4XVh5BFHsDEm41aC36FnnofEWf3W",
   "hederaStatus": "ISSUE",
   "signature": 0,
   "type": "project",
   "policyId": "68c952870fd12e530dddadf8",
   "tag": "save_assign",
   "schema": "#6482c99e-4af8-4cd1-94e6-ee82d2284197&1.0.0",
   "option": {
     "status": "Waiting to Validate"
   },
   "relationships": [
     "1758024619.744335000",
     "1758024539.869960000"
   ],
   "owner": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936",
   "assignedTo": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936",
   "group": "5d49111f-c662-4494-ac71-35c4826f5684",
   "accounts": {
     "default": "0.0.6856932"
   },
   "tokens": null,
   "topicId": "0.0.6856972",
   "messageId": "1758024652.684467000",
   "messageHash": "CQ4LpNhuNA9MGv5HdmaAdLz3oT42wbTsxUE7VNzzEGSL",
   "messageIds": [
     "1758024652.684467000"
   ],
   "document": {
     "id": "urn:uuid:0ee4a666-7b8a-4857-afcc-b048aec177dc",
     "type": [
       "VerifiableCredential"
     ],
     "issuer": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936",
     "issuanceDate": "2025-09-16T12:10:29.158Z",
     "@context": [
       "https://www.w3.org/2018/credentials/v1",
       "ipfs://bafkreig74sj6ovdiro5slbtrvz3nnpqddsh64vtiebdro47k77vxesenmm"
     ],
     "credentialSubject": *there is huge payload*,
     "proof": {
       "type": "Ed25519Signature2018",
       "created": "2025-09-16T12:10:32Z",
       "verificationMethod": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936#did-root-key",
       "proofPurpose": "assertionMethod",
       "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..-czwVoPGwWiLFbo0xjcAgf9buHVqUdD59HKIJFZa-XbYk_2uSDaskCvQxpDrHlCJrwSe0BL76Gpb6UpQ-G9TCw"
     }
   },
   "documentFileId": "68c953ec7d1632a3d92d6408",
   "documentFields": [
     "id",
     "credentialSubject.id",
     "credentialSubject.0.id",
     "issuer",
     "credentialSubject.0.field0",
     "credentialSubject.0.project_details.G5",
     "credentialSubject.0.ref",
     "verifiableCredential.0.credentialSubject.0.field0.field0",
     "verifiableCredential.1.credentialSubject.0.amount",
     "credentialSubject.0.tokenId",
     "credentialSubject.0.serials"
   ],
   "_id": "68c953cf7d1632a3d92d63dd",
   "__sourceTag__": "project_grid_vvb_projects",
   "history": [
     {
       "labelValue": "Waiting to be Added",
       "created": "2025-09-16T12:10:55.533Z"
     },
     {
       "labelValue": "Waiting to Validate",
       "created": "2025-09-16T12:11:19.704Z"
     },
     {
       "labelValue": "Waiting to Validate",
       "created": "2025-09-16T12:11:24.918Z"
     }
   ],
   "id": "68c953cf7d1632a3d92d63dd"
 }
],
"blocks": [
 {
   "id": "3e7de6b5-5d05-4908-863a-c69a5e67aaf7",
   "uiMetaData": {
     "options": [],
     "content": "Project Name"
   },
   "blockType": "filtersAddon"
 }
],
"commonAddons": [
 {
   "id": "620fb126-e25e-42c1-b0ba-96d90714c49d",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "89d4600d-7289-416b-b022-59a6d6fe436f",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "df25c1dd-bfa2-45e7-a101-ccd3870211eb",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "70d6e612-6f8b-44b9-8405-6a7b9280c583",
   "blockType": "historyAddon"
 }
],
"fields": [
 {
   "title": "Project",
   "name": "document.credentialSubject.0.project_details.G5",
   "tooltip": "",
   "type": "text"
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
   "bindBlock": "approve_project_btn",
   "width": "250px",
   "bindGroup": "project_grid_vvb_projects"
 },
 {
   "title": "Document",
   "name": "document",
   "tooltip": "",
   "type": "button",
   "action": "dialog",
   "url": "",
   "dialogContent": "VC",
   "dialogClass": "",
   "dialogType": "json",
   "bindBlock": "",
   "content": "View Document",
   "uiClass": "link"
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
   "bindBlock": "revoke_project_vvb_btn",
   "bindGroup": "project_grid_vvb_projects_approved",
   "width": "250px"
 },
 {
   "title": "Operation",
   "name": "option.status",
   "tooltip": "",
   "type": "text",
   "width": "250px"
 },
 {
   "title": "Validation Report",
   "name": "validation_report",
   "tooltip": "",
   "type": "block",
   "bindGroup": "project_grid_vvb_projects_approved",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "add_new_validation_report",
   "bindBlocks": [],
   "width": "250px",
   "content": "Add Validation Report"
 }
],
"viewHistory": true
}
```

**Send the updated payload in the request:**

<mark style="color:green;">`POST`</mark> `http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/approve_project_btn/blocks`

With body:

```json5
*changed project data*
```

### 6 Report Flow

#### 6.1 Login by PP

#### 6.2 Create Report

<figure><img src="../../.gitbook/assets/image (11) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

**Wait until the project status changes to “approved\_project”:**

<mark style="color:red;">`GET`</mark> `"http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/project_grid_pp_2/blocks"`

Save the response data as a reference:

```json5
{
"id": "599bc800-3413-4606-b770-563fcfdef5fb",
"blockType": "interfaceDocumentsSourceBlock",
"actionType": "local",
"readonly": false,
"data": [
 {
   "createDate": "2025-09-16T12:10:55.134Z",
   "updateDate": "2025-09-16T12:11:29.995Z",
   "_propHash": "1144c08caccff063c2b48dab21b4799d",
   "_docHash": "b9c75ab0e3f6c40fa0fd23a3de673e32",
   "hash": "6v8F2e4bLdf6yccg4XVh5BFHsDEm41aC36FnnofEWf3W",
   "hederaStatus": "ISSUE",
   "signature": 0,
   "type": "project",
   "policyId": "68c952870fd12e530dddadf8",
   "tag": "approved_project_status",
   "schema": "#6482c99e-4af8-4cd1-94e6-ee82d2284197&1.0.0",
   "option": {
     "status": "Validated"
   },
   "relationships": [
     "1758024619.744335000",
     "1758024539.869960000"
   ],
   "owner": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936",
   "assignedTo": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936",
   "group": "5d49111f-c662-4494-ac71-35c4826f5684",
   "accounts": {
     "default": "0.0.6856932"
   },
   "tokens": null,
   "topicId": "0.0.6856972",
   "messageId": "1758024652.684467000",
   "messageHash": "CQ4LpNhuNA9MGv5HdmaAdLz3oT42wbTsxUE7VNzzEGSL",
   "messageIds": [
     "1758024652.684467000"
   ],
   "document": {
     "id": "urn:uuid:0ee4a666-7b8a-4857-afcc-b048aec177dc",
     "type": [
       "VerifiableCredential"
     ],
     "issuer": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936",
     "issuanceDate": "2025-09-16T12:10:29.158Z",
     "@context": [
       "https://www.w3.org/2018/credentials/v1",
       "ipfs://bafkreig74sj6ovdiro5slbtrvz3nnpqddsh64vtiebdro47k77vxesenmm"
     ],
     "credentialSubject": *there are huge payload*,
     "proof": {
       "type": "Ed25519Signature2018",
       "created": "2025-09-16T12:10:32Z",
       "verificationMethod": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936#did-root-key",
       "proofPurpose": "assertionMethod",
       "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..-czwVoPGwWiLFbo0xjcAgf9buHVqUdD59HKIJFZa-XbYk_2uSDaskCvQxpDrHlCJrwSe0BL76Gpb6UpQ-G9TCw"
     }
   },
   "documentFileId": "68c953f27d1632a3d92d6411",
   "documentFields": [
     "id",
     "credentialSubject.id",
     "credentialSubject.0.id",
     "issuer",
     "credentialSubject.0.field0",
     "credentialSubject.0.project_details.G5",
     "credentialSubject.0.ref",
     "verifiableCredential.0.credentialSubject.0.field0.field0",
     "verifiableCredential.1.credentialSubject.0.amount",
     "credentialSubject.0.tokenId",
     "credentialSubject.0.serials"
   ],
   "_id": "68c953cf7d1632a3d92d63dd",
   "__sourceTag__": "project_grid_pp_2_validated_projects_own",
   "history": [
     {
       "labelValue": "Waiting to be Added",
       "created": "2025-09-16T12:10:55.533Z"
     },
     {
       "labelValue": "Waiting to Validate",
       "created": "2025-09-16T12:11:19.704Z"
     },
     {
       "labelValue": "Waiting to Validate",
       "created": "2025-09-16T12:11:24.918Z"
     },
     {
       "labelValue": "Validated",
       "created": "2025-09-16T12:11:30.166Z"
     }
   ],
   "id": "68c953cf7d1632a3d92d63dd"
 }
],
"blocks": [
 {
   "id": "5e1b4ecb-5860-4a53-a734-de96bbf45fe3",
   "uiMetaData": {
     "options": [],
     "title": "",
     "content": "Project Name"
   },
   "blockType": "filtersAddon"
 }
],
"commonAddons": [
 {
   "id": "1bec12bf-486d-4014-994a-ee0937a64ae9",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "1c88d5df-6519-496f-b02f-76de9ce3b0be",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "c1cd6720-6129-4c62-ae8f-4b850bb113b7",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "ad0aa831-b318-4e93-b6fa-eb01fef01f83",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "930d5a57-080e-4289-9fe7-3f71192e200f",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "f41365cf-a1c5-4394-bfda-a0d74e7f9bb1",
   "blockType": "historyAddon"
 }
],
"fields": [
 {
   "title": "Project",
   "name": "document.credentialSubject.0.project_details.G5",
   "tooltip": "",
   "type": "text"
 },
 {
   "title": "Status",
   "name": "option.status",
   "tooltip": "",
   "type": "text",
   "width": "170px"
 },
 {
   "title": "Assign",
   "name": "assignedTo",
   "tooltip": "",
   "type": "block",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "assign_vvb",
   "bindGroup": "project_grid_pp_2_waiting_to_validate_projects",
   "width": "150px"
 },
 {
   "title": "Assign",
   "name": "assignedTo",
   "tooltip": "",
   "type": "text",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "",
   "bindGroup": "project_grid_pp_2_validated_projects",
   "width": "150px"
 },
 {
   "title": "Add Report",
   "name": "report",
   "tooltip": "",
   "type": "block",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "add_report_bnt",
   "bindGroup": "project_grid_pp_2_validated_projects",
   "width": "150px"
 },
 {
   "title": "View Reports",
   "name": "document.credentialSubject.0.id",
   "tooltip": "",
   "type": "button",
   "action": "link",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "report_grid_pp",
   "content": "View Reports",
   "bindGroup": "project_grid_pp_2_validated_projects",
   "width": "150px"
 },
 {
   "title": "Document",
   "name": "document",
   "tooltip": "",
   "type": "button",
   "action": "dialog",
   "url": "",
   "dialogContent": "VC",
   "dialogClass": "",
   "dialogType": "json",
   "bindBlock": "",
   "content": "View Document",
   "uiClass": "link"
 },
 {
   "title": "Revoke",
   "name": "",
   "tooltip": "",
   "type": "block",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "revoke_project_pp_btn",
   "width": "100px",
   "bindGroup": "project_grid_pp_2_waiting_to_add_projects"
 },
 {
   "title": "Revoke",
   "name": "",
   "tooltip": "",
   "type": "block",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "revoke_project_pp_btn",
   "width": "100px",
   "bindGroup": "project_grid_pp_2_waiting_to_validate_projects"
 },
 {
   "title": "Revoke",
   "name": "",
   "tooltip": "",
   "type": "block",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "revoke_project_pp_btn",
   "width": "100px",
   "bindGroup": "project_grid_pp_2_validated_projects_own"
 }
],
"viewHistory": true
}
```

**Send a request with the reference:**

<mark style="color:green;">`POST`</mark> `"http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/add_report_bnt/blocks"`

```json5
body: {
   "document": *payload from file*,
   "ref": *changed reference from previous request*
}
```

Successful response looks like:

```json5
{
"policyId": "68c952870fd12e530dddadf8",
"tag": "add_report_bnt",
"hash": "GGJ47euPmaetz9rmHMNbVdmmpPPA43ynV1vn1Mast55v",
"document": {
 "id": "urn:uuid:78d8dbbc-1082-4bfb-8129-98bc953ad735",
 "type": [
   "VerifiableCredential"
 ],
 "issuer": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936",
 "issuanceDate": "2025-09-16T12:12:06.291Z",
 "@context": [
   "https://www.w3.org/2018/credentials/v1",
   "ipfs://bafkreig74sj6ovdiro5slbtrvz3nnpqddsh64vtiebdro47k77vxesenmm"
 ],
 "credentialSubject":*there is huge payload*,
 "proof": {
   "type": "Ed25519Signature2018",
   "created": "2025-09-16T12:12:09Z",
   "verificationMethod": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936#did-root-key",
   "proofPurpose": "assertionMethod",
   "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..1b0SqKVYONgYnwmGpqGBnHHYKjt4GuiqNMRbM3El8TLM4Gu95wKx47c-Vy3Crc2kLb9a-c_n6UJXNBvh1ZFtDA"
 }
},
"owner": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936",
"group": "5d49111f-c662-4494-ac71-35c4826f5684",
"hederaStatus": "NEW",
"signature": 0,
"type": "#81ac56ff-885d-4764-95be-10f392b4d16b&1.0.0",
"schema": "#81ac56ff-885d-4764-95be-10f392b4d16b&1.0.0",
"accounts": {
 "default": "0.0.6856932"
},
"relationships": [
 "1758024717.023047000"
]
}
```

**Wait until the project status changes to “Waiting for Verification”:**

<figure><img src="../../.gitbook/assets/image (11) (1) (1).png" alt=""><figcaption></figcaption></figure>

<mark style="color:red;">`GET`</mark> `"http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/report_grid_pp/blocks"`

```json5
{
"id": "a9734879-66a6-489e-937a-8d5f60342904",
"blockType": "interfaceDocumentsSourceBlock",
"actionType": "local",
"readonly": false,
"data": [
 {
   "createDate": "2025-09-16T12:13:05.022Z",
   "updateDate": "2025-09-16T12:13:05.160Z",
   "_propHash": "b5d154a97533da19fbbf8b572b0187ca",
   "_docHash": "1b110e74d889418715c34034e2d9e9cd",
   "hash": "CNV8rRV5pUTBRn8zGMDqKsMwyGs5PVkz799HMS8Q5CwA",
   "hederaStatus": "ISSUE",
   "signature": 0,
   "type": "report",
   "policyId": "68c952870fd12e530dddadf8",
   "tag": "save_report",
   "schema": "#81ac56ff-885d-4764-95be-10f392b4d16b&1.0.0",
   "option": {
     "status": "Waiting for Verification"
   },
   "relationships": [
     "1758024750.620775315",
     "1758024539.869960000"
   ],
   "owner": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936",
   "group": "5d49111f-c662-4494-ac71-35c4826f5684",
   "accounts": {
     "default": "0.0.6856932"
   },
   "tokens": null,
   "topicId": "0.0.6856972",
   "messageId": "1758024781.504726000",
   "messageHash": "3hygSHh7DwSQqD22k7dqVHF6j6vfPHD8rJVz27APYs8g",
   "messageIds": [
     "1758024781.504726000"
   ],
   "document": {
     "id": "urn:uuid:04fb8436-43f5-4fa3-bbfb-15197cb1301b",
     "type": [
       "VerifiableCredential"
     ],
     "issuer": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936",
     "issuanceDate": "2025-09-16T12:12:39.393Z",
     "@context": [
       "https://www.w3.org/2018/credentials/v1",
       "ipfs://bafkreig74sj6ovdiro5slbtrvz3nnpqddsh64vtiebdro47k77vxesenmm"
     ],
     "credentialSubject": *there are huge payload*,
     "proof": {
       "type": "Ed25519Signature2018",
       "created": "2025-09-16T12:12:42Z",
       "verificationMethod": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936#did-root-key",
       "proofPurpose": "assertionMethod",
       "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..bsuQWFYWZi1xusjf3pK2GOBNDvA1NbKBpcBsxij2UCQHcDVmZCTGTLJuSdECpyb_bl0i9D-Vv9quYFD-4RtVDA"
     }
   },
   "documentFileId": "68c954517d1632a3d92d644e",
   "documentFields": [
     "id",
     "credentialSubject.id",
     "credentialSubject.0.id",
     "issuer",
     "credentialSubject.0.field0",
     "credentialSubject.0.project_details.G5",
     "credentialSubject.0.ref",
     "verifiableCredential.0.credentialSubject.0.field0.field0",
     "verifiableCredential.1.credentialSubject.0.amount",
     "credentialSubject.0.tokenId",
     "credentialSubject.0.serials"
   ],
   "_id": "68c954507d1632a3d92d6446",
   "__sourceTag__": "report_grid_pp_reports",
   "history": [
     {
       "labelValue": "Waiting for Verification",
       "created": "2025-09-16T12:13:05.316Z"
     }
   ],
   "id": "68c954507d1632a3d92d6446"
 }
],
"blocks": [
 {
   "id": "e0d9441c-9a20-4cc5-948b-567750f2e85c",
   "uiMetaData": {
     "options": [],
     "content": "Project Name"
   },
   "blockType": "filtersAddon"
 }
],
"commonAddons": [
 {
   "id": "92aaa2d9-368d-4e03-ad92-c445480fbfcb",
   "uiMetaData": {
     "type": "blank",
     "options": []
   },
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "064e1967-e94e-48b0-9f47-c6c270ee731b",
   "uiMetaData": {
     "type": "blank",
     "options": []
   },
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "2eac0a02-0146-4cb9-a3a3-a88df5f991a8",
   "blockType": "historyAddon"
 }
],
"fields": [
 {
   "title": "Project",
   "name": "document.credentialSubject.0.project_details.G5",
   "tooltip": "",
   "type": "text"
 },
 {
   "title": "Status",
   "name": "option.status",
   "tooltip": "",
   "type": "text",
   "width": "175px"
 },
 {
   "title": "Document",
   "name": "document",
   "tooltip": "",
   "type": "button",
   "action": "dialog",
   "url": "",
   "dialogContent": "VC",
   "dialogClass": "",
   "dialogType": "json",
   "bindBlock": "",
   "content": "View Document",
   "uiClass": "link"
 },
 {
   "title": "Revoke",
   "name": "Revoke",
   "tooltip": "",
   "type": "block",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "revoke_report_pp_btn",
   "width": "100px",
   "bindGroup": "report_grid_pp_reports"
 },
 {
   "title": "Assign",
   "name": "assignedTo",
   "tooltip": "",
   "type": "block",
   "bindGroup": "report_grid_pp_reports",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "assign_vvb_mr",
   "bindBlocks": [],
   "width": "150px"
 },
 {
   "title": "Assign",
   "name": "assignedTo",
   "tooltip": "",
   "type": "text",
   "bindGroup": "report_grid_pp_reports",
   "width": "150px"
 }
],
"viewHistory": true
}
```

#### 6.3 Login by PP

#### 6.4 Assign Report

<figure><img src="../../.gitbook/assets/image (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

**Get the report reference by saving the response data:**

<mark style="color:red;">`GET`</mark> `http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/report_grid_pp/blocks`

Create and fill the field with the VVB DID:

```json5
{
"id": "a9734879-66a6-489e-937a-8d5f60342904",
"blockType": "interfaceDocumentsSourceBlock",
"actionType": "local",
"readonly": false,
"data": [
 {
   "createDate": "2025-09-16T12:13:05.022Z",
   "updateDate": "2025-09-16T12:13:05.160Z",
   "_propHash": "b5d154a97533da19fbbf8b572b0187ca",
   "_docHash": "1b110e74d889418715c34034e2d9e9cd",
   "hash": "CNV8rRV5pUTBRn8zGMDqKsMwyGs5PVkz799HMS8Q5CwA",
   "hederaStatus": "ISSUE",
   "signature": 0,
   "type": "report",
   "policyId": "68c952870fd12e530dddadf8",
   "tag": "save_report",
   "schema": "#81ac56ff-885d-4764-95be-10f392b4d16b&1.0.0",
   "option": {
     "status": "Waiting for Verification"
   },
   "relationships": [
     "1758024750.620775315",
     "1758024539.869960000"
   ],
   "owner": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936",
   "group": "5d49111f-c662-4494-ac71-35c4826f5684",
   "accounts": {
     "default": "0.0.6856932"
   },
   "tokens": null,
   "topicId": "0.0.6856972",
   "messageId": "1758024781.504726000",
   "messageHash": "3hygSHh7DwSQqD22k7dqVHF6j6vfPHD8rJVz27APYs8g",
   "messageIds": [
     "1758024781.504726000"
   ],
   "document": {
     "id": "urn:uuid:04fb8436-43f5-4fa3-bbfb-15197cb1301b",
     "type": [
       "VerifiableCredential"
     ],
     "issuer": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936",
     "issuanceDate": "2025-09-16T12:12:39.393Z",
     "@context": [
       "https://www.w3.org/2018/credentials/v1",
       "ipfs://bafkreig74sj6ovdiro5slbtrvz3nnpqddsh64vtiebdro47k77vxesenmm"
     ],
     "credentialSubject": *there is huge payload*,
     "proof": {
       "type": "Ed25519Signature2018",
       "created": "2025-09-16T12:12:42Z",
       "verificationMethod": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936#did-root-key",
       "proofPurpose": "assertionMethod",
       "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..bsuQWFYWZi1xusjf3pK2GOBNDvA1NbKBpcBsxij2UCQHcDVmZCTGTLJuSdECpyb_bl0i9D-Vv9quYFD-4RtVDA"
     }
   },
   "documentFileId": "68c954517d1632a3d92d644e",
   "documentFields": [
     "id",
     "credentialSubject.id",
     "credentialSubject.0.id",
     "issuer",
     "credentialSubject.0.field0",
     "credentialSubject.0.project_details.G5",
     "credentialSubject.0.ref",
     "verifiableCredential.0.credentialSubject.0.field0.field0",
     "verifiableCredential.1.credentialSubject.0.amount",
     "credentialSubject.0.tokenId",
     "credentialSubject.0.serials"
   ],
   "_id": "68c954507d1632a3d92d6446",
   "__sourceTag__": "report_grid_pp_reports",
   "history": [
     {
       "labelValue": "Waiting for Verification",
       "created": "2025-09-16T12:13:05.316Z"
     }
   ],
   "id": "68c954507d1632a3d92d6446"
 }
],
"blocks": [
 {
   "id": "e0d9441c-9a20-4cc5-948b-567750f2e85c",
   "uiMetaData": {
     "options": [],
     "content": "Project Name"
   },
   "blockType": "filtersAddon"
 }
],
"commonAddons": [
 {
   "id": "92aaa2d9-368d-4e03-ad92-c445480fbfcb",
   "uiMetaData": {
     "type": "blank",
     "options": []
   },
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "064e1967-e94e-48b0-9f47-c6c270ee731b",
   "uiMetaData": {
     "type": "blank",
     "options": []
   },
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "2eac0a02-0146-4cb9-a3a3-a88df5f991a8",
   "blockType": "historyAddon"
 }
],
"fields": [
 {
   "title": "Project",
   "name": "document.credentialSubject.0.project_details.G5",
   "tooltip": "",
   "type": "text"
 },
 {
   "title": "Status",
   "name": "option.status",
   "tooltip": "",
   "type": "text",
   "width": "175px"
 },
 {
   "title": "Document",
   "name": "document",
   "tooltip": "",
   "type": "button",
   "action": "dialog",
   "url": "",
   "dialogContent": "VC",
   "dialogClass": "",
   "dialogType": "json",
   "bindBlock": "",
   "content": "View Document",
   "uiClass": "link"
 },
 {
   "title": "Revoke",
   "name": "Revoke",
   "tooltip": "",
   "type": "block",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "revoke_report_pp_btn",
   "width": "100px",
   "bindGroup": "report_grid_pp_reports"
 },
 {
   "title": "Assign",
   "name": "assignedTo",
   "tooltip": "",
   "type": "block",
   "bindGroup": "report_grid_pp_reports",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "assign_vvb_mr",
   "bindBlocks": [],
   "width": "150px"
 },
 {
   "title": "Assign",
   "name": "assignedTo",
   "tooltip": "",
   "type": "text",
   "bindGroup": "report_grid_pp_reports",
   "width": "150px"
 }
],
"viewHistory": true
}
```

**Send the updated report data in the request:**

<mark style="color:green;">`POST`</mark> `http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/assign_vvb_mr/blocks`

With body:

```json5
*changed project data*
```

#### 6.5 Login by VVB

#### 6.6 Approve Report

<figure><img src="../../.gitbook/assets/image (2) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

**Wait until the report status changes to “Waiting for Verification”:**

<mark style="color:red;">`GET`</mark> `http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/report_grid_vvb/blocks`

<figure><img src="../../.gitbook/assets/image (3) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

Save the response data as a reference and update the status to “Verified”:

```json5
{
"id": "4f75cbc4-a5a3-4552-b45b-d582c0f4a613",
"blockType": "interfaceDocumentsSourceBlock",
"actionType": "local",
"readonly": false,
"data": [
 {
   "createDate": "2025-09-16T12:13:05.022Z",
   "updateDate": "2025-09-16T12:13:09.280Z",
   "_propHash": "d8936ab43b2350f19dcaf70f95b4b0e1",
   "_docHash": "1b110e74d889418715c34034e2d9e9cd",
   "hash": "CNV8rRV5pUTBRn8zGMDqKsMwyGs5PVkz799HMS8Q5CwA",
   "hederaStatus": "ISSUE",
   "signature": 0,
   "type": "report",
   "policyId": "68c952870fd12e530dddadf8",
   "tag": "save_mr_assign",
   "schema": "#81ac56ff-885d-4764-95be-10f392b4d16b&1.0.0",
   "option": {
     "status": "Waiting for Verification"
   },
   "relationships": [
     "1758024750.620775315",
     "1758024539.869960000"
   ],
   "owner": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936",
   "assignedTo": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936",
   "group": "5d49111f-c662-4494-ac71-35c4826f5684",
   "accounts": {
     "default": "0.0.6856932"
   },
   "tokens": null,
   "topicId": "0.0.6856972",
   "messageId": "1758024781.504726000",
   "messageHash": "3hygSHh7DwSQqD22k7dqVHF6j6vfPHD8rJVz27APYs8g",
   "messageIds": [
     "1758024781.504726000"
   ],
   "document": {
     "id": "urn:uuid:04fb8436-43f5-4fa3-bbfb-15197cb1301b",
     "type": [
       "VerifiableCredential"
     ],
     "issuer": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936",
     "issuanceDate": "2025-09-16T12:12:39.393Z",
     "@context": [
       "https://www.w3.org/2018/credentials/v1",
       "ipfs://bafkreig74sj6ovdiro5slbtrvz3nnpqddsh64vtiebdro47k77vxesenmm"
     ],
     "credentialSubject": *there is huge payload*,
     "proof": {
       "type": "Ed25519Signature2018",
       "created": "2025-09-16T12:12:42Z",
       "verificationMethod": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936#did-root-key",
       "proofPurpose": "assertionMethod",
       "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..bsuQWFYWZi1xusjf3pK2GOBNDvA1NbKBpcBsxij2UCQHcDVmZCTGTLJuSdECpyb_bl0i9D-Vv9quYFD-4RtVDA"
     }
   },
   "documentFileId": "68c954557d1632a3d92d6457",
   "documentFields": [
     "id",
     "credentialSubject.id",
     "credentialSubject.0.id",
     "issuer",
     "credentialSubject.0.field0",
     "credentialSubject.0.project_details.G5",
     "credentialSubject.0.ref",
     "verifiableCredential.0.credentialSubject.0.field0.field0",
     "verifiableCredential.1.credentialSubject.0.amount",
     "credentialSubject.0.tokenId",
     "credentialSubject.0.serials"
   ],
   "_id": "68c954507d1632a3d92d6446",
   "__sourceTag__": "report_grid_vvb_reports",
   "history": [
     {
       "labelValue": "Waiting for Verification",
       "created": "2025-09-16T12:13:05.316Z"
     },
     {
       "labelValue": "Waiting for Verification",
       "created": "2025-09-16T12:13:09.461Z"
     }
   ],
   "id": "68c954507d1632a3d92d6446"
 }
],
"blocks": [
 {
   "id": "a0b880db-55f7-43c0-9123-865683be36ed",
   "uiMetaData": {
     "options": [],
     "content": "Project Name"
   },
   "blockType": "filtersAddon"
 }
],
"commonAddons": [
 {
   "id": "67ccfed1-7f3f-4706-a6cd-be6e3bebe22b",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "c6a56098-64d4-472e-90bc-de4a64530ea7",
   "uiMetaData": {
     "type": "blank"
   },
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "07b64d9a-8ba7-4f0d-ac6e-ce81fdeaa21d",
   "uiMetaData": {
     "type": "blank"
   },
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "1e51fa88-7bd1-42c1-b67e-a412cdd05bce",
   "blockType": "historyAddon"
 }
],
"fields": [
 {
   "title": "Project",
   "name": "document.credentialSubject.0.project_details.G5",
   "tooltip": "",
   "type": "text"
 },
 {
   "title": "Status",
   "name": "option.status",
   "tooltip": "",
   "type": "text",
   "width": ""
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
   "bindBlock": "approve_report_btn",
   "bindGroup": "report_grid_vvb_reports",
   "width": "150px"
 },
 {
   "title": "Document",
   "name": "document",
   "tooltip": "",
   "type": "button",
   "action": "dialog",
   "url": "",
   "dialogContent": "VC",
   "dialogClass": "",
   "dialogType": "json",
   "bindBlock": "",
   "content": "View Document",
   "uiClass": "link",
   "width": "170px"
 },
 {
   "title": "Revoke",
   "name": "",
   "tooltip": "",
   "type": "block",
   "width": "100px",
   "bindGroup": "report_grid_vvb_reports(approved)",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "revoke_reassign_report_btn"
 },
 {
   "title": "Verification Report",
   "name": "verification_report",
   "tooltip": "",
   "type": "block",
   "bindGroup": "report_grid_vvb_reports(approved)",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "add_verification_report",
   "bindBlocks": [],
   "content": "Add Verification Report",
   "width": "250px"
 }
],
"viewHistory": true
}
```

**Send the updated payload in the request:**

<mark style="color:green;">`POST`</mark> `http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/approve_report_btn/blocks`

With body:

```json5
{
   "document": *changed project data*,
   "tag": "Button_0"
}
```

**Wait until the project status is “Verified”:**

<mark style="color:red;">`GET`</mark> `"http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/report_grid_vvb/blocks"`

```json5
{
"id": "4f75cbc4-a5a3-4552-b45b-d582c0f4a613",
"blockType": "interfaceDocumentsSourceBlock",
"actionType": "local",
"readonly": false,
"data": [
 {
   "createDate": "2025-09-16T12:13:45.538Z",
   "updateDate": "2025-09-16T12:13:45.735Z",
   "_propHash": "a6844b98f3581509f6c28490767085f8",
   "_docHash": "48f1da1697c4e224c071493659ff0042",
   "hash": "BRenHy1UbB8JgA7nGtV8qxGP7bKPCj2smHrCyeJSz9Te",
   "hederaStatus": "ISSUE",
   "signature": 0,
   "type": "approved_report",
   "policyId": "68c952870fd12e530dddadf8",
   "tag": "save_reassign_report",
   "schema": "#81ac56ff-885d-4764-95be-10f392b4d16b&1.0.0",
   "option": {
     "status": "Verified"
   },
   "relationships": [
     "1758024781.504726000"
   ],
   "owner": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936",
   "assignedTo": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936",
   "group": "5d49111f-c662-4494-ac71-35c4826f5684",
   "accounts": {
     "default": "0.0.6856932"
   },
   "topicId": "0.0.6856972",
   "messageId": "1758024822.724992000",
   "messageHash": "14Xx4TD1GpN9NULGZ1cF16xcLuMq1CueqXbR3uAovq5d",
   "messageIds": [
     "1758024822.724992000"
   ],
   "document": {
     "id": "urn:uuid:f81fcb76-3e03-4cc2-9efc-e036a50f184b",
     "type": [
       "VerifiableCredential"
     ],
     "issuer": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936",
     "issuanceDate": "2025-09-16T12:13:14.673Z",
     "@context": [
       "https://www.w3.org/2018/credentials/v1",
       "ipfs://bafkreig74sj6ovdiro5slbtrvz3nnpqddsh64vtiebdro47k77vxesenmm"
     ],
     "credentialSubject":  *there are huge payload*,
     "proof": {
       "type": "Ed25519Signature2018",
       "created": "2025-09-16T12:13:17Z",
       "verificationMethod": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936#did-root-key",
       "proofPurpose": "assertionMethod",
       "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..O1tAnUlwYRU7ohgt9lvdnVyzKWseVMphSmS3Y1_9Cp_MoU7hsX84O9JVD14HbdC6Lp538wi2EuNzbVXPEC4jCg"
     }
   },
   "documentFileId": "68c954797d1632a3d92d6472",
   "documentFields": [
     "id",
     "credentialSubject.id",
     "credentialSubject.0.id",
     "issuer",
     "credentialSubject.0.field0",
     "credentialSubject.0.project_details.G5",
     "credentialSubject.0.ref",
     "verifiableCredential.0.credentialSubject.0.field0.field0",
     "verifiableCredential.1.credentialSubject.0.amount",
     "credentialSubject.0.tokenId",
     "credentialSubject.0.serials"
   ],
   "_id": "68c954797d1632a3d92d646a",
   "__sourceTag__": "report_grid_vvb_reports(approved)",
   "history": [
     {
       "labelValue": "Verified",
       "created": "2025-09-16T12:13:45.931Z"
     }
   ],
   "id": "68c954797d1632a3d92d646a"
 }
],
"blocks": [
 {
   "id": "a0b880db-55f7-43c0-9123-865683be36ed",
   "uiMetaData": {
     "options": [],
     "content": "Project Name"
   },
   "blockType": "filtersAddon"
 }
],
"commonAddons": [
 {
   "id": "67ccfed1-7f3f-4706-a6cd-be6e3bebe22b",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "c6a56098-64d4-472e-90bc-de4a64530ea7",
   "uiMetaData": {
     "type": "blank"
   },
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "07b64d9a-8ba7-4f0d-ac6e-ce81fdeaa21d",
   "uiMetaData": {
     "type": "blank"
   },
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "1e51fa88-7bd1-42c1-b67e-a412cdd05bce",
   "blockType": "historyAddon"
 }
],
"fields": [
 {
   "title": "Project",
   "name": "document.credentialSubject.0.project_details.G5",
   "tooltip": "",
   "type": "text"
 },
 {
   "title": "Status",
   "name": "option.status",
   "tooltip": "",
   "type": "text",
   "width": ""
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
   "bindBlock": "approve_report_btn",
   "bindGroup": "report_grid_vvb_reports",
   "width": "150px"
 },
 {
   "title": "Document",
   "name": "document",
   "tooltip": "",
   "type": "button",
   "action": "dialog",
   "url": "",
   "dialogContent": "VC",
   "dialogClass": "",
   "dialogType": "json",
   "bindBlock": "",
   "content": "View Document",
   "uiClass": "link",
   "width": "170px"
 },
 {
   "title": "Revoke",
   "name": "",
   "tooltip": "",
   "type": "block",
   "width": "100px",
   "bindGroup": "report_grid_vvb_reports(approved)",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "revoke_reassign_report_btn"
 },
 {
   "title": "Verification Report",
   "name": "verification_report",
   "tooltip": "",
   "type": "block",
   "bindGroup": "report_grid_vvb_reports(approved)",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "add_verification_report",
   "bindBlocks": [],
   "content": "Add Verification Report",
   "width": "250px"
 }
],
"viewHistory": true
}
```

#### 6.7 Create Validation Report

<figure><img src="../../.gitbook/assets/image (7) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

**Get the reference for creating the report:**

<mark style="color:red;">`GET`</mark> `http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/project_grid_vvb/blocks`

Save the response data as a reference and update the status to “Verified”:

```json5
{
"id": "302c3526-c319-4f26-8cde-747c95011af7",
"blockType": "interfaceDocumentsSourceBlock",
"actionType": "local",
"readonly": false,
"data": [
 {
   "createDate": "2025-09-16T12:12:00.834Z",
   "updateDate": "2025-09-16T12:12:01.009Z",
   "_propHash": "2617698a9caff732a76322d13b7ac56e",
   "_docHash": "337bbdf96aeb94d10c8a3bc372dedc93",
   "hash": "BUgiqBerAEzu2JVx2TyyDa9fCA6edpJ8b8U7cp6KiSa7",
   "hederaStatus": "ISSUE",
   "signature": 0,
   "type": "approved_project",
   "policyId": "68c952870fd12e530dddadf8",
   "tag": "save_reassign_project",
   "schema": "#6482c99e-4af8-4cd1-94e6-ee82d2284197&1.0.0",
   "option": {
     "status": "Validated"
   },
   "relationships": [
     "1758024652.684467000",
     "1758024674.704312000"
   ],
   "owner": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936",
   "assignedTo": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936",
   "group": "5d49111f-c662-4494-ac71-35c4826f5684",
   "accounts": {
     "default": "0.0.6856932"
   },
   "topicId": "0.0.6856972",
   "messageId": "1758024717.023047000",
   "messageHash": "8JqbHxt1UqoYvH5feQePf6TZPq666XuFpRpTrmttGCWr",
   "messageIds": [
     "1758024717.023047000"
   ],
   "document": {
     "id": "urn:uuid:35a62c65-eb23-4cdf-bdd2-6563f09db110",
     "type": [
       "VerifiableCredential"
     ],
     "issuer": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936",
     "issuanceDate": "2025-09-16T12:11:30.443Z",
     "@context": [
       "https://www.w3.org/2018/credentials/v1",
       "ipfs://bafkreig74sj6ovdiro5slbtrvz3nnpqddsh64vtiebdro47k77vxesenmm"
     ],
     "credentialSubject": *there is huge payload*,
     "proof": {
       "type": "Ed25519Signature2018",
       "created": "2025-09-16T12:11:33Z",
       "verificationMethod": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936#did-root-key",
       "proofPurpose": "assertionMethod",
       "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..P-5j3LiJY3T2b5X1hcc7i3RkZmC_cfCeDZKyGwrX7Tqe5Yc6_buXwr-eLfLchAguAfnrBPPkbj9d2RtH2khTCw"
     }
   },
   "documentFileId": "68c954117d1632a3d92d6423",
   "documentFields": [
     "id",
     "credentialSubject.id",
     "credentialSubject.0.id",
     "issuer",
     "credentialSubject.0.field0",
     "credentialSubject.0.project_details.G5",
     "credentialSubject.0.ref",
     "verifiableCredential.0.credentialSubject.0.field0.field0",
     "verifiableCredential.1.credentialSubject.0.amount",
     "credentialSubject.0.tokenId",
     "credentialSubject.0.serials"
   ],
   "_id": "68c954107d1632a3d92d641b",
   "__sourceTag__": "project_grid_vvb_projects_approved",
   "history": [
     {
       "labelValue": "Validated",
       "created": "2025-09-16T12:12:01.192Z"
     }
   ],
   "id": "68c954107d1632a3d92d641b"
 }
],
"blocks": [
 {
   "id": "3e7de6b5-5d05-4908-863a-c69a5e67aaf7",
   "uiMetaData": {
     "options": [],
     "content": "Project Name"
   },
   "blockType": "filtersAddon"
 }
],
"commonAddons": [
 {
   "id": "620fb126-e25e-42c1-b0ba-96d90714c49d",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "89d4600d-7289-416b-b022-59a6d6fe436f",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "df25c1dd-bfa2-45e7-a101-ccd3870211eb",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "70d6e612-6f8b-44b9-8405-6a7b9280c583",
   "blockType": "historyAddon"
 }
],
"fields": [
 {
   "title": "Project",
   "name": "document.credentialSubject.0.project_details.G5",
   "tooltip": "",
   "type": "text"
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
   "bindBlock": "approve_project_btn",
   "width": "250px",
   "bindGroup": "project_grid_vvb_projects"
 },
 {
   "title": "Document",
   "name": "document",
   "tooltip": "",
   "type": "button",
   "action": "dialog",
   "url": "",
   "dialogContent": "VC",
   "dialogClass": "",
   "dialogType": "json",
   "bindBlock": "",
   "content": "View Document",
   "uiClass": "link"
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
   "bindBlock": "revoke_project_vvb_btn",
   "bindGroup": "project_grid_vvb_projects_approved",
   "width": "250px"
 },
 {
   "title": "Operation",
   "name": "option.status",
   "tooltip": "",
   "type": "text",
   "width": "250px"
 },
 {
   "title": "Validation Report",
   "name": "validation_report",
   "tooltip": "",
   "type": "block",
   "bindGroup": "project_grid_vvb_projects_approved",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "add_new_validation_report",
   "bindBlocks": [],
   "width": "250px",
   "content": "Add Validation Report"
 }
],
"viewHistory": true
}
```

**Send the request with the updated payload. (The payload for the validation report will be attached separately.):**

<mark style="color:green;">`POST`</mark> `http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/add_new_validation_report/blocks`

With body:

```json5
{
   "document": *validation report payload from file*,
   "ref": *changed report data*
}
```

Successful response looks like:

```json5
{
  "policyId": "68c952870fd12e530dddadf8",
  "tag": "add_new_validation_report",
  "hash": "6pUjW1QtxbfEz4L7wHvNU9UhQn8wsZAfiVHkBgJEnrzk",
  "document": {
    "id": "urn:uuid:8ca71bb7-0d79-40b5-8ea1-9817f0ceb885",
    "type": [
      "VerifiableCredential"
    ],
    "issuer": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936",
    "issuanceDate": "2025-09-16T12:13:49.250Z",
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "ipfs://bafkreig74sj6ovdiro5slbtrvz3nnpqddsh64vtiebdro47k77vxesenmm"
    ],
    "credentialSubject": *there is payload from file*
    "proof": {
      "type": "Ed25519Signature2018",
      "created": "2025-09-16T12:13:52Z",
      "verificationMethod": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936#did-root-key",
      "proofPurpose": "assertionMethod",
      "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..fRswed3BAD9N2r_-eNAalvUZ7A-PlMlHJ0bMAH7EU_qMUEpX_k5xS82CsmEuH6H0df29bpUbUKB3VPL-0QeKDQ"
    }
  },
  "owner": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936",
  "group": "2c6c93e9-d089-4518-9f66-e548df9e0cac",
  "hederaStatus": "NEW",
  "signature": 0,
  "type": "#163325db-0a46-4199-8628-5ed95d671622&1.0.0",
  "schema": "#163325db-0a46-4199-8628-5ed95d671622&1.0.0",
  "accounts": {
    "default": "0.0.6856934"
  },
  "relationships": [
    "1758024717.023047000"
  ]
}
```

#### 6.8 Login by SR

#### 6.9 Approve Validation Report

<figure><img src="../../.gitbook/assets/image (8) (1) (1).png" alt=""><figcaption></figcaption></figure>

**Wait until the validation report status changes to “Submitted”:**

<mark style="color:red;">`GET`</mark> `"http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/validation_reports_verra/blocks"`

Save the response data as a reference and update the status to “APPROVED”:

```json5
{
"id": "5d76bfa6-38d2-461c-90ef-0d3bdd1b6477",
"blockType": "interfaceDocumentsSourceBlock",
"actionType": "local",
"readonly": false,
"data": [
 {
   "createDate": "2025-09-16T12:14:08.848Z",
   "updateDate": "2025-09-16T12:14:08.865Z",
   "_propHash": "720b202a9eea13d72d1824ae17aa4363",
   "_docHash": "4d4387e2d9ab267a77a7c3e4c2d532bd",
   "hash": "6pUjW1QtxbfEz4L7wHvNU9UhQn8wsZAfiVHkBgJEnrzk",
   "hederaStatus": "ISSUE",
   "signature": 0,
   "type": "validation_report",
   "policyId": "68c952870fd12e530dddadf8",
   "tag": "save_validation_report_db",
   "schema": "#163325db-0a46-4199-8628-5ed95d671622&1.0.0",
   "option": {
     "status": "Submitted"
   },
   "relationships": [
     "1758024717.023047000",
     "1758024558.020152392"
   ],
   "owner": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936",
   "group": "2c6c93e9-d089-4518-9f66-e548df9e0cac",
   "accounts": {
     "default": "0.0.6856934"
   },
   "topicId": "0.0.6856972",
   "messageId": "1758024845.830259699",
   "messageHash": "6GM36MfsfmfuGdqK1VUQLFwS2hkuxko4ouMJfjN8wi25",
   "messageIds": [
     "1758024845.830259699"
   ],
   "document": {
     "id": "urn:uuid:8ca71bb7-0d79-40b5-8ea1-9817f0ceb885",
     "type": [
       "VerifiableCredential"
     ],
     "issuer": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936",
     "issuanceDate": "2025-09-16T12:13:49.250Z",
     "@context": [
       "https://www.w3.org/2018/credentials/v1",
       "ipfs://bafkreig74sj6ovdiro5slbtrvz3nnpqddsh64vtiebdro47k77vxesenmm"
     ],
     "credentialSubject": *there are huge payload*,
             "proof": {
       "type": "Ed25519Signature2018",
       "created": "2025-09-16T12:13:52Z",
       "verificationMethod": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936#did-root-key",
       "proofPurpose": "assertionMethod",
       "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..fRswed3BAD9N2r_-eNAalvUZ7A-PlMlHJ0bMAH7EU_qMUEpX_k5xS82CsmEuH6H0df29bpUbUKB3VPL-0QeKDQ"
     }
   },
   "documentFileId": "68c954907d1632a3d92d6483",
   "documentFields": [
     "id",
     "credentialSubject.id",
     "credentialSubject.0.id",
     "issuer",
     "credentialSubject.0.field0",
     "credentialSubject.0.project_details.G5",
     "credentialSubject.0.ref",
     "verifiableCredential.0.credentialSubject.0.field0.field0",
     "verifiableCredential.1.credentialSubject.0.amount",
     "credentialSubject.0.tokenId",
     "credentialSubject.0.serials"
   ],
   "_id": "68c954907d1632a3d92d6480",
   "__sourceTag__": "validation_reports_verra_all_reports",
   "id": "68c954907d1632a3d92d6480"
 }
],
"blocks": [],
"commonAddons": [
 {
   "id": "87ad15bf-06ce-44fc-9068-84efb4f40d19",
   "blockType": "documentsSourceAddon"
 }
],
"fields": [
 {
   "title": "Project",
   "name": "document.credentialSubject.0.ref",
   "tooltip": "",
   "type": "text"
 },
 {
   "title": "Document",
   "name": "document",
   "tooltip": "",
   "type": "button",
   "action": "dialog",
   "url": "",
   "dialogContent": "VC",
   "dialogClass": "",
   "dialogType": "json",
   "bindBlock": "",
   "content": "View Document",
   "uiClass": "link"
 },
 {
   "title": "Status",
   "name": "option.status",
   "tooltip": "",
   "type": "text",
   "width": "250px"
 },
 {
   "title": "Operation",
   "name": "operation",
   "tooltip": "",
   "type": "block",
   "bindGroup": "validation_reports_verra_all_reports",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "approve_validation_report_btn",
   "bindBlocks": [],
   "width": "150px"
 }
],
"title": "Validation Reports",
"viewHistory": false
}
```

**Send the updated payload in the request:**

<mark style="color:green;">`POST`</mark> `http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/approve_validation_report_btn/blocks`

With body:

```json5
{
   "document": *changed report data*,
   "tag": "Approve_Button_Validation"
}
```

#### 6.10 Login by VVB

#### 6.11 Create Verification Report

<figure><img src="../../.gitbook/assets/image (5) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

**Get the reference for creating the report:**

<mark style="color:red;">`GET`</mark> `http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/report_grid_vvb/blocks`

Save the response data as a reference and update the status to “Verified”:

```json5
{
"id": "4f75cbc4-a5a3-4552-b45b-d582c0f4a613",
"blockType": "interfaceDocumentsSourceBlock",
"actionType": "local",
"readonly": false,
"data": [
 {
   "createDate": "2025-09-16T12:13:45.538Z",
   "updateDate": "2025-09-16T12:13:45.735Z",
   "_propHash": "a6844b98f3581509f6c28490767085f8",
   "_docHash": "48f1da1697c4e224c071493659ff0042",
   "hash": "BRenHy1UbB8JgA7nGtV8qxGP7bKPCj2smHrCyeJSz9Te",
   "hederaStatus": "ISSUE",
   "signature": 0,
   "type": "approved_report",
   "policyId": "68c952870fd12e530dddadf8",
   "tag": "save_reassign_report",
   "schema": "#81ac56ff-885d-4764-95be-10f392b4d16b&1.0.0",
   "option": {
     "status": "Verified"
   },
   "relationships": [
     "1758024781.504726000"
   ],
   "owner": "did:hedera:testnet:GJRcdMgwGUfosDKL1o3qFxLTTFAGWTw4JU8tFArMcdaH_0.0.6855936",
   "assignedTo": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936",
   "group": "5d49111f-c662-4494-ac71-35c4826f5684",
   "accounts": {
     "default": "0.0.6856932"
   },
   "topicId": "0.0.6856972",
   "messageId": "1758024822.724992000",
   "messageHash": "14Xx4TD1GpN9NULGZ1cF16xcLuMq1CueqXbR3uAovq5d",
   "messageIds": [
     "1758024822.724992000"
   ],
   "document": {
     "id": "urn:uuid:f81fcb76-3e03-4cc2-9efc-e036a50f184b",
     "type": [
       "VerifiableCredential"
     ],
     "issuer": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936",
     "issuanceDate": "2025-09-16T12:13:14.673Z",
     "@context": [
       "https://www.w3.org/2018/credentials/v1",
       "ipfs://bafkreig74sj6ovdiro5slbtrvz3nnpqddsh64vtiebdro47k77vxesenmm"
     ],
     "credentialSubject": *there is huge payload*,
     "proof": {
       "type": "Ed25519Signature2018",
       "created": "2025-09-16T12:13:17Z",
       "verificationMethod": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936#did-root-key",
       "proofPurpose": "assertionMethod",
       "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..O1tAnUlwYRU7ohgt9lvdnVyzKWseVMphSmS3Y1_9Cp_MoU7hsX84O9JVD14HbdC6Lp538wi2EuNzbVXPEC4jCg"
     }
   },
   "documentFileId": "68c954797d1632a3d92d6472",
   "documentFields": [
     "id",
     "credentialSubject.id",
     "credentialSubject.0.id",
     "issuer",
     "credentialSubject.0.field0",
     "credentialSubject.0.project_details.G5",
     "credentialSubject.0.ref",
     "verifiableCredential.0.credentialSubject.0.field0.field0",
     "verifiableCredential.1.credentialSubject.0.amount",
     "credentialSubject.0.tokenId",
     "credentialSubject.0.serials"
   ],
   "_id": "68c954797d1632a3d92d646a",
   "__sourceTag__": "report_grid_vvb_reports(approved)",
   "history": [
     {
       "labelValue": "Verified",
       "created": "2025-09-16T12:13:45.931Z"
     }
   ],
   "id": "68c954797d1632a3d92d646a"
 }
],
"blocks": [
 {
   "id": "a0b880db-55f7-43c0-9123-865683be36ed",
   "uiMetaData": {
     "options": [],
     "content": "Project Name"
   },
   "blockType": "filtersAddon"
 }
],
"commonAddons": [
 {
   "id": "67ccfed1-7f3f-4706-a6cd-be6e3bebe22b",
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "c6a56098-64d4-472e-90bc-de4a64530ea7",
   "uiMetaData": {
     "type": "blank"
   },
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "07b64d9a-8ba7-4f0d-ac6e-ce81fdeaa21d",
   "uiMetaData": {
     "type": "blank"
   },
   "blockType": "documentsSourceAddon"
 },
 {
   "id": "1e51fa88-7bd1-42c1-b67e-a412cdd05bce",
   "blockType": "historyAddon"
 }
],
"fields": [
 {
   "title": "Project",
   "name": "document.credentialSubject.0.project_details.G5",
   "tooltip": "",
   "type": "text"
 },
 {
   "title": "Status",
   "name": "option.status",
   "tooltip": "",
   "type": "text",
   "width": ""
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
   "bindBlock": "approve_report_btn",
   "bindGroup": "report_grid_vvb_reports",
   "width": "150px"
 },
 {
   "title": "Document",
   "name": "document",
   "tooltip": "",
   "type": "button",
   "action": "dialog",
   "url": "",
   "dialogContent": "VC",
   "dialogClass": "",
   "dialogType": "json",
   "bindBlock": "",
   "content": "View Document",
   "uiClass": "link",
   "width": "170px"
 },
 {
   "title": "Revoke",
   "name": "",
   "tooltip": "",
   "type": "block",
   "width": "100px",
   "bindGroup": "report_grid_vvb_reports(approved)",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "revoke_reassign_report_btn"
 },
 {
   "title": "Verification Report",
   "name": "verification_report",
   "tooltip": "",
   "type": "block",
   "bindGroup": "report_grid_vvb_reports(approved)",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "add_verification_report",
   "bindBlocks": [],
   "content": "Add Verification Report",
   "width": "250px"
 }
],
"viewHistory": true
}
```

**Send the request with the updated payload. (The payload for the validation report will be attached separately.):**

<mark style="color:green;">`POST`</mark>` `` ``http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/add_verification_report/blocks `

With body:

```json5
{
   "document": *verification report payload from file*,
   "ref": *changed report data*
}
```

Successful response looks like:

```json5
{
  "policyId": "68c952870fd12e530dddadf8",
  "tag": "add_verification_report",
  "hash": "DwXaU994DhLgo36wXPcoHg2YdzXVrwYmWEgg44Xv7zKW",
  "document": {
    "id": "urn:uuid:23c30e34-2e79-46a2-b1bd-150199a53b4a",
    "type": [
      "VerifiableCredential"
    ],
    "issuer": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936",
    "issuanceDate": "2025-09-16T12:14:13.166Z",
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "ipfs://bafkreig74sj6ovdiro5slbtrvz3nnpqddsh64vtiebdro47k77vxesenmm"
    ],
    "credentialSubject": *there is payload from file*
    "proof": {
      "type": "Ed25519Signature2018",
      "created": "2025-09-16T12:14:15Z",
      "verificationMethod": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936#did-root-key",
      "proofPurpose": "assertionMethod",
      "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..PJ8V3NOGKrJ3btTmbES9iLPv15DLD-hjQulq-6CVFBPc6597Mhbufd97r7ZqHIA3XOA2xmWMfFLcgmXxzM8fDg"
    }
  },
  "owner": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936",
  "group": "2c6c93e9-d089-4518-9f66-e548df9e0cac",
  "hederaStatus": "NEW",
  "signature": 0,
  "type": "#2321fb67-54e0-464d-bcd5-8dc2dbad2c41&1.0.0",
  "schema": "#2321fb67-54e0-464d-bcd5-8dc2dbad2c41&1.0.0",
  "accounts": {
    "default": "0.0.6856934"
  },
  "relationships": [
    "1758024822.724992000"
  ]
}
```

#### 6.12 Login by SR

#### 6.13 Approve Verification Report

<figure><img src="../../.gitbook/assets/image (6) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

**Wait until the verification report status changes to “Submitted”:**

<mark style="color:red;">`GET`</mark> `http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/verification_reports_verra/blocks`

Save the response data as a reference and update the status to “APPROVED”:

```json5
{
"id": "ae478634-a214-4909-b1c2-b56bf7876626",
"blockType": "interfaceDocumentsSourceBlock",
"actionType": "local",
"readonly": false,
"data": [
 {
   "createDate": "2025-09-16T12:14:34.270Z",
   "updateDate": "2025-09-16T12:14:34.289Z",
   "_propHash": "8c32b6da4da97e8c3009622df03a3a4e",
   "_docHash": "6610e65d6d600aa982a7732c14b36253",
   "hash": "DwXaU994DhLgo36wXPcoHg2YdzXVrwYmWEgg44Xv7zKW",
   "hederaStatus": "ISSUE",
   "signature": 0,
   "type": "verification_report",
   "policyId": "68c952870fd12e530dddadf8",
   "tag": "save_verification_report_db",
   "schema": "#2321fb67-54e0-464d-bcd5-8dc2dbad2c41&1.0.0",
   "option": {
     "status": "Submitted"
   },
   "relationships": [
     "1758024822.724992000",
     "1758024558.020152392"
   ],
   "owner": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936",
   "group": "2c6c93e9-d089-4518-9f66-e548df9e0cac",
   "accounts": {
     "default": "0.0.6856934"
   },
   "topicId": "0.0.6856972",
   "messageId": "1758024870.409535000",
   "messageHash": "5rEZTmpPFwFAfWXhfpQyT7yPV3DPBPp3fUEfY388Pmz7",
   "messageIds": [
     "1758024870.409535000"
   ],
   "document": {
     "id": "urn:uuid:23c30e34-2e79-46a2-b1bd-150199a53b4a",
     "type": [
       "VerifiableCredential"
     ],
     "issuer": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936",
     "issuanceDate": "2025-09-16T12:14:13.166Z",
     "@context": [
       "https://www.w3.org/2018/credentials/v1",
       "ipfs://bafkreig74sj6ovdiro5slbtrvz3nnpqddsh64vtiebdro47k77vxesenmm"
     ],
     "credentialSubject": *there are huge payload*,
             "proof": {
       "type": "Ed25519Signature2018",
       "created": "2025-09-16T12:14:15Z",
       "verificationMethod": "did:hedera:testnet:HVfntNBhFWg1TMGPsfnP3QpJazb1oYZsg4tdVbe4i1Me_0.0.6855936#did-root-key",
       "proofPurpose": "assertionMethod",
       "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..PJ8V3NOGKrJ3btTmbES9iLPv15DLD-hjQulq-6CVFBPc6597Mhbufd97r7ZqHIA3XOA2xmWMfFLcgmXxzM8fDg"
     }
   },
   "documentFileId": "68c954aa7d1632a3d92d6493",
   "documentFields": [
     "id",
     "credentialSubject.id",
     "credentialSubject.0.id",
     "issuer",
     "credentialSubject.0.field0",
     "credentialSubject.0.project_details.G5",
     "credentialSubject.0.ref",
     "verifiableCredential.0.credentialSubject.0.field0.field0",
     "verifiableCredential.1.credentialSubject.0.amount",
     "credentialSubject.0.tokenId",
     "credentialSubject.0.serials"
   ],
   "_id": "68c954aa7d1632a3d92d6490",
   "__sourceTag__": "verification_reports_verra_all_reports",
   "id": "68c954aa7d1632a3d92d6490"
 }
],
"blocks": [],
"commonAddons": [
 {
   "id": "cceefdc0-685c-4455-a7f8-123fa65f3472",
   "blockType": "documentsSourceAddon"
 }
],
"fields": [
 {
   "title": "Project",
   "name": "document.credentialSubject.0.ref",
   "tooltip": "",
   "type": "text"
 },
 {
   "title": "Document",
   "name": "document",
   "tooltip": "",
   "type": "button",
   "action": "dialog",
   "url": "",
   "dialogContent": "VC",
   "dialogClass": "",
   "dialogType": "json",
   "bindBlock": "",
   "content": "View Document",
   "uiClass": "link"
 },
 {
   "title": "Status",
   "name": "option.status",
   "tooltip": "",
   "type": "text",
   "width": "250px"
 },
 {
   "title": "Operation",
   "name": "operation",
   "tooltip": "",
   "type": "block",
   "bindGroup": "verification_reports_verra_all_reports",
   "action": "",
   "url": "",
   "dialogContent": "",
   "dialogClass": "",
   "dialogType": "",
   "bindBlock": "mint_token_verra",
   "bindBlocks": [],
   "width": "150px"
 }
],
"viewHistory": false
}
```

**Send the updated payload in the request:**

<mark style="color:green;">`POST`</mark> `http://localhost:4200/api/v1/policies/68c952870fd12e530dddadf8/tag/mint_token_verra/blocks`

With body:

```json5
{
   "document": *changed report data*,
   "tag": "Option_0"
}
```
