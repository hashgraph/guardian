export const ConfigPolicyTest = {
    defaultActive: true,
    permissions: ['ROOT_AUTHORITY', 'INSTALLER'],
    blockType: 'interfaceContainerBlock',
    uiMetaData: {
        type: 'blank'
    },
    children: [
        {
            defaultActive: true,
            tag: 'init_installer_steps',
            permissions: ['INSTALLER'],
            blockType: 'interfaceStepBlock',
            uiMetaData: {
                type: 'blank'
            },
            children: [
                {
                    tag: 'add_new_installer_request',
                    defaultActive: true,
                    permissions: ['INSTALLER'],
                    blockType: 'requestVcDocument',
                    schema: 'Installer',
                    idType: 'OWNER',
                    uiMetaData: {
                        type: 'page',
                        title: 'New Installer',
                        description: 'Description',
                        privateFields: ['policyId'],
                    }
                },
                {
                    tag: 'save_new_approve_document',
                    blockType: 'sendToGuardian',
                    dataType: 'approve',
                    entityType: 'Installer',
                    stopPropagation: true
                },
                {
                    tag: 'update_approve_document_status',
                    blockType: 'sendToGuardian',
                    dataType: 'approve',
                    entityType: 'Installer',
                },
                {
                    tag: 'send_installer_vc_to_hedera',
                    blockType: 'sendToGuardian',
                    dataType: 'hedera',
                    entityType: "Installer"
                },
                {
                    tag: 'send_installer_vc_to_guardian',
                    blockType: 'sendToGuardian',
                    dataType: 'vc-documents',
                    entityType: 'Installer'
                },
                {
                    tag: 'installer_header',
                    defaultActive: true,
                    permissions: ['INSTALLER'],
                    blockType: 'interfaceContainerBlock',
                    uiMetaData: {
                        type: 'tabs'
                    },
                    children: [
                        {
                            tag: 'sensors_page',
                            defaultActive: true,
                            permissions: ['INSTALLER'],
                            blockType: 'interfaceContainerBlock',
                            uiMetaData: {
                                type: 'blank',
                                title: 'Sensors'
                            },
                            children: [
                                {
                                    tag: 'sensors_grid',
                                    defaultActive: true,
                                    permissions: ['INSTALLER'],
                                    blockType: 'interfaceDocumentsSource',
                                    dependencies: ['SendVCtoGuardian'],
                                    onlyOwnDocuments: true,
                                    dataType: 'vc-documents',
                                    filters: {
                                        schema: 'Inverter',
                                        type: 'Inverter'
                                    },
                                    uiMetaData: {
                                        fields: [
                                            {
                                                name: 'document.id',
                                                title: 'ID',
                                                type: 'test',
                                            },
                                            {
                                                name: 'document.credentialSubject.0.id',
                                                title: 'DID',
                                                type: 'text'
                                            },
                                            {
                                                name: 'document',
                                                title: 'Document',
                                                tooltip: '',
                                                type: 'button',
                                                action: 'dialog',
                                                content: 'View Document',
                                                uiClass: 'link',
                                                dialogContent: 'VC',
                                                dialogClass: '',
                                                dialogType: 'json'
                                            },
                                            {
                                                name: 'document.id',
                                                title: 'Config',
                                                tooltip: '',
                                                type: 'block',
                                                action: 'block',
                                                content: 'download',
                                                uiClass: '',
                                                bindBlock: 'download_config_btn'
                                            }
                                        ]
                                    },
                                },
                                {
                                    tag: 'download_config_btn',
                                    blockType: 'interfaceAction',
                                    permissions: ['INSTALLER'],
                                    type: 'download',
                                    schema: 'MRV',
                                    stopPropagation: true,
                                    targetUrl: "http://localhost:3003/mrv",
                                    uiMetaData: {
                                        content: 'download',
                                    },
                                },
                                {
                                    defaultActive: true,
                                    tag: 'create_new_sensor_steps',
                                    permissions: ['INSTALLER'],
                                    blockType: 'interfaceStepBlock',
                                    cyclic: true,
                                    uiMetaData: {
                                        type: 'blank'
                                    },
                                    children: [
                                        {
                                            tag: 'add_sensor_bnt',
                                            defaultActive: true,
                                            permissions: ['INSTALLER'],
                                            blockType: 'requestVcDocument',
                                            schema: 'Inverter',
                                            idType: 'DID',
                                            uiMetaData: {
                                                type: 'dialog',
                                                description: 'Description',
                                                privateFields: ['policyId'],
                                                content: 'New Sensors',
                                                uiClass: 'btn',
                                                dialogContent: 'New Sensors',
                                                dialogClass: '',
                                                dialogType: '',
                                            }
                                        },
                                        {
                                            tag: 'send_sensor_vc_to_hedera',
                                            blockType: 'sendToGuardian',
                                            dataType: 'hedera',
                                            entityType: "Inverter"
                                        },
                                        {
                                            tag: 'send_sensor_vc_to_guardian',
                                            blockType: 'sendToGuardian',
                                            dataType: 'vc-documents',
                                            entityType: 'Inverter',
                                        }
                                    ]
                                }
                            ],
                        },
                        {
                            tag: 'mrv_page',
                            defaultActive: true,
                            permissions: ['INSTALLER'],
                            blockType: 'interfaceContainerBlock',
                            uiMetaData: {
                                type: 'blank',
                                title: 'MRV'
                            },
                            children: [
                                {
                                    tag: 'mrv_grid',
                                    defaultActive: true,
                                    permissions: ['INSTALLER'],
                                    blockType: 'interfaceDocumentsSource',
                                    dependencies: ['SendVCtoGuardian'],
                                    onlyOwnDocuments: true,
                                    dataType: 'vc-documents',
                                    filters: {
                                        schema: 'MRV',
                                        type: 'MRV'
                                    },
                                    uiMetaData: {
                                        fields: [
                                            {
                                                name: 'document.id',
                                                title: 'ID',
                                                type: 'button',
                                            },
                                            {
                                                name: 'document.issuer',
                                                title: 'Sensor DID',
                                                type: 'text'
                                            },
                                            {
                                                name: 'document',
                                                title: 'Document',
                                                tooltip: '',
                                                type: 'button',
                                                action: 'dialog',
                                                content: 'View Document',
                                                uiClass: 'link',
                                                dialogContent: 'VC',
                                                dialogClass: '',
                                                dialogType: 'json'
                                            }
                                        ]
                                    },
                                },
                            ]
                        }
                    ]
                },
            ]
        },
        {
            tag: 'root_authority_header',
            defaultActive: true,
            permissions: ['ROOT_AUTHORITY'],
            blockType: 'interfaceContainerBlock',
            uiMetaData: {
                type: 'tabs'
            },
            children: [
                {
                    tag: 'approve_page',
                    defaultActive: true,
                    permissions: ['ROOT_AUTHORITY'],
                    blockType: 'interfaceContainerBlock',
                    uiMetaData: {
                        type: 'blank',
                        title: 'Approve Documents'
                    },
                    children: [
                        {
                            tag: 'approve_documents_grid',
                            defaultActive: true,
                            permissions: ['ROOT_AUTHORITY'],
                            blockType: 'interfaceDocumentsSource',
                            onlyOwnDocuments: false,
                            dataType: 'approve',
                            dependencies: ['save_new_approve_document'],
                            uiMetaData: {
                                fields: [
                                    {
                                        name: 'document.issuer',
                                        title: 'Owner',
                                        type: 'text',
                                        tooltip: 'Installer did',
                                    },
                                    {
                                        name: 'createDate',
                                        title: 'Create Date',
                                        type: 'text'
                                    },
                                    {
                                        name: 'document',
                                        title: 'Document',
                                        tooltip: '',
                                        type: 'button',
                                        action: 'dialog',
                                        content: 'View Document',
                                        uiClass: 'link',
                                        dialogContent: 'VC',
                                        dialogClass: '',
                                        dialogType: 'json'
                                    },
                                    {
                                        name: 'status',
                                        title: 'Status',
                                        type: 'text'
                                    },
                                    {
                                        name: 'status',
                                        title: 'Operation',
                                        tooltip: '',
                                        type: 'block',
                                        action: 'block',
                                        content: '',
                                        uiClass: '',
                                        bindBlock: 'approve_documents_btn'
                                    }
                                ]
                            },
                            children: []
                        },
                        {
                            tag: 'approve_documents_btn',
                            blockType: 'interfaceAction',
                            permissions: ['ROOT_AUTHORITY'],
                            type: 'selector',
                            uiMetaData: {
                                field: 'status',
                                options: [{
                                    name: 'Approve',
                                    value: 'APPROVED',
                                    uiClass: 'btn-approve',
                                    bindBlock: 'update_approve_document_status'
                                }, {
                                    name: 'Reject',
                                    value: 'REJECTED',
                                    uiClass: 'btn-reject',
                                    bindBlock: 'add_new_installer_request'
                                }],
                            },
                        }
                    ]
                }
            ]
        },
        {
            tag: 'mint_events',
            defaultActive: true,
            permissions: ['ROOT_AUTHORITY', 'INSTALLER'],
            blockType: 'interfaceContainerBlock',
            uiMetaData: {
                type: 'blank'
            },
            children: [
                {
                    tag: 'mrv_source',
                    blockType: 'externalDataBlock',
                    entityType: 'MRV',
                    schema: 'MRV',
                },
                {
                    tag: 'save_mrv_document',
                    blockType: 'sendToGuardian',
                    dataType: 'vc-documents',
                    entityType: 'MRV'
                },
                {
                    tag: 'mint_token',
                    blockType: 'mintDocument',
                    tokenId: '0.0.2770205',
                    rule: '1'
                },
            ]
        }
    ]
};