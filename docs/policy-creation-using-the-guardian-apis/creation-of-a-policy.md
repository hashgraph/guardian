# Creation of a Policy



**Policy creation**

`POST /api/v1/policies`

**Request body:**

```
{
	"name":"iRec Policy",
	"description":"iRec Policy",
	"topicDescription":"iRec Policy",
	"policyTag":"irec"
}
```

**Response body:**

```
[
	{
		"id":"61ee81f65d8b6b0017811510",
		...
	}
]
```

****

**Policy configuration update**

`PUT /api/v1/policies/61ee81f65d8b6b0017811510`

**Request body:**

```
{
	"id":"61ee81f65d8b6b0017811510",
	"uuid":"6c5a891d-0c4a-40a1-8b87-78991795594a",
	"name":"iRec Policy",
	"description":"\niRec Policy",
	"topicDescription":" iRec Policy",
	"status":"DRAFT",
	"owner":"did:hedera:testnet:AhWPsAQ38oGXMoEqVANsyzSNwRV95fNzaENDwHwNQDdZ;hedera:testnet:fid=0.0.29511783",
	"policyRoles":["INSTALLER"],
	"policyTag":"irec",
	"config":{"defaultActive":true,"permissions":["ANY_ROLE"],"blockType":"interfaceContainerBlock","uiMetaData":{"type":"blank"},"children":[{"id":"ae8fa708-5c47-4a15-8129-6a4a6125a39a","tag":"choose_role","blockType":"policyRolesBlock","children":[],"uiMetaData":{"title":"registration","description":"choose a role"},"permissions":["NO_ROLE"],"defaultActive":true,"roles":["INSTALLER"]},{"defaultActive":true,"tag":"init_installer_steps","permissions":["INSTALLER"],"blockType":"interfaceStepBlock","uiMetaData":{"type":"blank"},"children":[{"tag":"add_new_installer_request","defaultActive":true,"permissions":["INSTALLER"],"blockType":"requestVcDocument","schema":"1a5347ba-5e5f-49a7-8734-3dcc953a03ed","idType":"OWNER","uiMetaData":{"type":"page","title":"New Installer","description":"Description","privateFields":["policyId"]},"id":"5f9d4dd7-3de5-46af-92ab-543cec6b309f"},{"tag":"save_new_approve_document","blockType":"sendToGuardian","dataType":"approve","entityType":"Installer","stopPropagation":false,"uiMetaData":{},"id":"a4e7a471-09a5-43b9-a762-961996426ebf"},{"tag":"wait_fo_approve","blockType":"informationBlock","children":[],"uiMetaData":{"type":"text","title":"Waiting for approval","description":"Waiting for approval"},"permissions":["INSTALLER"],"stopPropagation":true,"defaultActive":true,"id":"aec09b1c-cd80-4d20-b0e6-afa326fe4aa9"},{"tag":"update_approve_document_status","blockType":"sendToGuardian","dataType":"approve","entityType":"Installer","uiMetaData":{},"id":"61190b95-fe28-48f5-b81c-46499b5b8aef"},{"tag":"send_installer_vc_to_hedera","blockType":"sendToGuardian","dataType":"hedera","entityType":"Installer","uiMetaData":{},"id":"810a6143-27b6-4d39-ab1b-f466c6b6b0ed"},{"tag":"Submission_of_CSD01_Documentation","blockType":"sendToGuardian","dataType":"vc-documents","entityType":"Installer","uiMetaData":{},"stopPropagation":false,"id":"c2abe78f-a221-487c-bca7-28c2fde3508c"},{"tag":"installer_header","defaultActive":true,"permissions":["INSTALLER"],"blockType":"interfaceContainerBlock","uiMetaData":{"type":"tabs"},"children":[{"tag":"sensors_page","defaultActive":true,"permissions":["INSTALLER"],"blockType":"interfaceContainerBlock","uiMetaData":{"type":"blank","title":"Sensors"},"children":[{"tag":"sensors_grid","defaultActive":true,"permissions":["INSTALLER"],"blockType":"interfaceDocumentsSource","dependencies":["SendVCtoGuardian"],"onlyOwnDocuments":true,"dataType":"vc-documents","filters":{"schema":"9d31b4ee-2280-43ee-81e7-b225ee208802","type":"Inverter"},"uiMetaData":{"fields":[{"name":"document.id","title":"ID","type":"test"},{"name":"document.credentialSubject.0.id","title":"DID","type":"text"},{"name":"document","title":"Document","tooltip":"","type":"button","action":"dialog","content":"View Document","uiClass":"link","dialogContent":"VC","dialogClass":"","dialogType":"json"},{"name":"document.id","title":"Config","tooltip":"","type":"block","action":"block","content":"download","uiClass":"","bindBlock":"download_config_btn"}]},"id":"0a1105c1-d18e-4cd7-af10-fc3c4edd60cf"},{"tag":"download_config_btn","blockType":"interfaceAction","permissions":["INSTALLER"],"type":"download","schema":"c4623dbd-2453-4c12-941f-032792a00727","stopPropagation":true,"targetUrl":"http://message-broker:3003/mrv","uiMetaData":{"content":"download","options":[]},"id":"51fb3a46-abcb-4e5c-a983-6181d0ad34c2"},{"defaultActive":true,"tag":"create_new_sensor_steps","permissions":["INSTALLER"],"blockType":"interfaceStepBlock","uiMetaData":{"type":"blank"},"children":[{"tag":"add_sensor_bnt","defaultActive":true,"permissions":["INSTALLER"],"blockType":"requestVcDocument","schema":"9d31b4ee-2280-43ee-81e7-b225ee208802","idType":"DID","uiMetaData":{"type":"dialog","description":"Description","privateFields":["policyId"],"content":"New Sensors","uiClass":"btn","dialogContent":"New Sensors","dialogClass":"","dialogType":""},"id":"af11bbbb-5afd-46e1-b16e-523ebd1c54b4"},{"tag":"send_sensor_vc_to_hedera","blockType":"sendToGuardian","dataType":"hedera","entityType":"Inverter","uiMetaData":{},"id":"33eeb225-fdb4-49aa-b20c-79a886d7e4b6"},{"tag":"CSD02_device_registration","blockType":"sendToGuardian","dataType":"vc-documents","entityType":"Inverter","stopPropagation":false,"uiMetaData":{},"id":"4b6f1a62-669b-44c6-bd9d-3d94a8e9ad78"}],"cyclic":true,"id":"729863b4-9b2d-4e9f-bd8f-122cfc8ca03d"}],"id":"40a725ee-ae8b-456b-a15d-cf49081dece4"},{"tag":"mrv_page","defaultActive":true,"permissions":["INSTALLER"],"blockType":"interfaceContainerBlock","uiMetaData":{"type":"blank","title":"MRV"},"children":[{"tag":"mrv_grid","defaultActive":true,"permissions":["INSTALLER"],"blockType":"interfaceDocumentsSource","dependencies":["SendVCtoGuardian"],"onlyOwnDocuments":true,"dataType":"vc-documents","filters":{"schema":"c4623dbd-2453-4c12-941f-032792a00727","type":"MRV"},"uiMetaData":{"fields":[{"name":"document.id","title":"ID","type":"button"},{"name":"document.issuer","title":"Sensor DID","type":"text"},{"name":"document","title":"Document","tooltip":"","type":"button","action":"dialog","content":"View Document","uiClass":"link","dialogContent":"VC","dialogClass":"","dialogType":"json"}]},"id":"5f22347c-3fdd-4396-95ca-5ef8cb06f16e"}],"id":"a37ab832-bb61-4001-bab1-fc014e2868a6"}],"id":"ac0e822e-cd9e-469b-91af-7249fe9b5416"},{"tag":"rejected_approve_document_status","blockType":"sendToGuardian","dataType":"approve","entityType":"Installer","uiMetaData":{},"id":"e5c10155-ab48-40ef-b213-03c149c2012d"},{"tag":"installer_rejected","blockType":"informationBlock","children":[],"uiMetaData":{"type":"text","description":"Your application was rejected","title":"Rejected"},"stopPropagation":true,"permissions":["INSTALLER"],"defaultActive":true,"id":"aeaa367a-ee56-47c7-afcd-0e900cf5d20c"}],"id":"a89e412d-6ad3-4153-a969-642162cb016f"},{"tag":"root_authority_header","defaultActive":true,"permissions":["OWNER"],"blockType":"interfaceContainerBlock","uiMetaData":{"type":"tabs"},"children":[{"tag":"approve_page","defaultActive":true,"permissions":["OWNER"],"blockType":"interfaceContainerBlock","uiMetaData":{"type":"blank","title":"Approve Documents"},"children":[{"tag":"approve_documents_grid","defaultActive":true,"permissions":["OWNER"],"blockType":"interfaceDocumentsSource","onlyOwnDocuments":false,"dataType":"approve","dependencies":["save_new_approve_document"],"uiMetaData":{"fields":[{"name":"document.issuer","title":"Owner","type":"text","tooltip":"Installer did"},{"name":"createDate","title":"Create Date","type":"text"},{"name":"document","title":"Document","tooltip":"","type":"button","action":"dialog","content":"View Document","uiClass":"link","dialogContent":"VC","dialogClass":"","dialogType":"json"},{"name":"status","title":"Status","type":"text"},{"name":"status","title":"Operation","tooltip":"","type":"block","action":"block","content":"","uiClass":"","bindBlock":"approve_documents_btn"}]},"children":[],"filters":{},"id":"5b3cc14c-7bcf-4d3d-84f8-64cd161736e8"},{"tag":"approve_documents_btn","blockType":"interfaceAction","permissions":["OWNER"],"type":"selector","uiMetaData":{"field":"status","options":[{"name":"Approve","value":"APPROVED","uiClass":"btn-approve","bindBlock":"update_approve_document_status"},{"name":"Reject","value":"REJECTED","uiClass":"btn-reject","bindBlock":"rejected_approve_document_status"}]},"id":"e5b790a6-b279-405b-8934-853727d4da88"}],"id":"e68fbdc0-725b-4a9c-aa1c-17a962b1543c"}],"id":"06ae63d6-6eb9-470c-b181-0e923fe80111"},{"tag":"mint_events","defaultActive":true,"permissions":["OWNER","INSTALLER"],"blockType":"interfaceContainerBlock","uiMetaData":{"type":"blank"},"children":[{"tag":"mrv_source","blockType":"externalDataBlock","entityType":"MRV","schema":"c4623dbd-2453-4c12-941f-032792a00727","uiMetaData":{},"id":"9aea59b8-2fe7-4de4-aca5-386251a898d0"},{"tag":"CSD04_requesting_i_Rec_issuance","blockType":"sendToGuardian","dataType":"vc-documents","entityType":"MRV","uiMetaData":{},"id":"d74cafe3-5dc9-4575-ad6b-9c28d8f64199"},{"tag":"mint_token","blockType":"mintDocument","tokenId":"0.0.26063342","rule":"1","uiMetaData":{},"id":"01ef01cb-1f19-46ef-ad71-14e8c2e1c446"}],"id":"2cf8d9a2-830a-4cde-ab37-90ca17c3a855"}],"id":"02114c50-8886-4fa7-82fa-e97561bc8d5f"}
}
```
