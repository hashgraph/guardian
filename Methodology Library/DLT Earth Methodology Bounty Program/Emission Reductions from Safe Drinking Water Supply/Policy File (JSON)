{
  "id": "69fbc56dbafe0836d93c1619",
  "uuid": "e72bf20d-f12b-47d9-af92-5b8346abed33",
  "name": "VMR0015 v1.0 — Safe Drinking Water dMRV",
  "version": "Dry Run",
  "description": "Verra VMR0015 v1.0 — methodology for low greenhouse-gas-emitting safe drinking water production systems. dMRV implementation on Hedera Guardian for the DLT Earth bounty.",
  "topicDescription": "VMR0015 v1.0",
  "projectSchema": "#0b812688-66c7-4eb8-ba91-6c8b000a11ea",
  "categories": [
    "65afb95a36032d4ea6775c68",
    "65afb95a36032d4ea6775c6d",
    "65afb95a36032d4ea6775c70",
    "65afb95936032d4ea6775c57",
    "65afb95936032d4ea6775c61"
  ],
  "status": "DRY-RUN",
  "creator": "did:hedera:testnet:B2fk9cdS5DEWadWgJaRqcM5mY5aDR4isa4RLcwm7K1GB_0.0.8877030",
  "owner": "did:hedera:testnet:B2fk9cdS5DEWadWgJaRqcM5mY5aDR4isa4RLcwm7K1GB_0.0.8877030",
  "topicId": "0.0.8877033",
  "instanceTopicId": "0.0.1778107926636",
  "synchronizationTopicId": null,
  "policyTag": "Tag_1778107744798.e20c1865",
  "codeVersion": "1.5.1",
  "createDate": "2026-05-06T22:49:17.822Z",
  "policyRoles": [
    "Project Participant",
    "VVB"
  ],
  "policyNavigation": [
    {
      "role": "Project Participant",
      "steps": [
        {
          "name": "Create project participant profile",
          "block": "create_pp_profile",
          "level": 1
        },
        {
          "name": "Waiting for approval",
          "block": "pp_wait_for_approve",
          "level": 1
        },
        {
          "name": "Projects",
          "block": "Projects_pp",
          "level": 1
        },
        {
          "name": "Create project",
          "block": "add_project_bnt",
          "level": 2
        },
        {
          "name": "Create monitoring report",
          "block": "add_report_bnt",
          "level": 2
        },
        {
          "name": "Monitoring reports",
          "block": "Monitoring_Reports_pp",
          "level": 1
        },
        {
          "name": "Assign report",
          "block": "assign_vvb",
          "level": 2
        },
        {
          "name": "Tokens",
          "block": "tokens",
          "level": 1
        }
      ]
    },
    {
      "role": "VVB",
      "steps": []
    },
    {
      "role": "NO_ROLE",
      "steps": [
        {
          "name": "Choose role",
          "block": "role_selector",
          "level": 1
        }
      ]
    },
    {
      "role": "OWNER",
      "steps": [
        {
          "name": "VVBs",
          "block": "sr_vvb_approval",
          "level": 1
        },
        {
          "name": "VVB approval",
          "block": "approve_documents_btn",
          "level": 2
        },
        {
          "name": "Project Participants",
          "block": "sr_pp_approval",
          "level": 1
        },
        {
          "name": "Project Participant approval",
          "block": "approve_pp_documents_btn",
          "level": 2
        },
        {
          "name": "Projects",
          "block": "sr_project_pipeline",
          "level": 1
        },
        {
          "name": "Project validation",
          "block": "sr_validate_project_btn",
          "level": 2
        },
        {
          "name": "Monitoring reports",
          "block": "sr_monitoring_pipeline",
          "level": 1
        },
        {
          "name": "Report approval",
          "block": "sr_approve_report_btn",
          "level": 2
        },
        {
          "name": "VPs",
          "block": "sr_verified_projects",
          "level": 1
        },
        {
          "name": "Trustchain",
          "block": "sr_trustchain",
          "level": 1
        }
      ]
    }
  ],
  "policyTopics": [
    {
      "type": "any",
      "name": "Project",
      "description": "",
      "static": true,
      "memoObj": "topic"
    }
  ],
  "policyTokens": [
    {
      "templateTokenTag": "token1",
      "tokenName": "CER VMR0015(Bikram)",
      "tokenSymbol": "CER",
      "tokenType": "fungible",
      "decimals": "2",
      "enableAdmin": true,
      "changeSupply": true,
      "enableFreeze": false,
      "enableKYC": false,
      "enableWipe": true
    }
  ],
  "policyGroups": [],
  "policyDocumentation": [],
  "config": {
    "blockType": "interfaceContainerBlock",
    "id": "a9ffbc70-3d8a-41f4-b934-64784f69b00d",
    "uiMetaData": {
      "type": "blank"
    },
    "permissions": [
      "ANY_ROLE"
    ],
    "defaultActive": true,
    "onErrorAction": "no-action",
    "tag": "",
    "children": [
      {
        "id": "56993923-d827-4a16-bb5d-23a29802f4d4",
        "blockType": "policyRolesBlock",
        "defaultActive": true,
        "uiMetaData": {
          "title": "Roles",
          "description": "Choose Roles"
        },
        "roles": [
          "Project Participant",
          "VVB"
        ],
        "permissions": [
          "NO_ROLE"
        ],
        "tag": "role_selector",
        "children": [],
        "events": [],
        "artifacts": []
      },
      {
        "id": "5c990816-b35a-4a0c-ae84-3b7658b69430",
        "blockType": "interfaceContainerBlock",
        "defaultActive": true,
        "uiMetaData": {
          "type": "tabs"
        },
        "permissions": [
          "OWNER"
        ],
        "onErrorAction": "no-action",
        "tag": "sr_header",
        "children": [
          {
            "id": "f4cd7098-22a7-477e-94fe-703ef7c53494",
            "blockType": "interfaceContainerBlock",
            "defaultActive": true,
            "uiMetaData": {
              "type": "blank",
              "title": "Approve PP"
            },
            "permissions": [
              "OWNER"
            ],
            "onErrorAction": "no-action",
            "tag": "sr_pp_approval",
            "children": [
              {
                "id": "ea596375-3ac8-41d6-b285-50accce5e91d",
                "blockType": "interfaceDocumentsSourceBlock",
                "defaultActive": true,
                "uiMetaData": {
                  "fields": [
                    {
                      "title": "Owner",
                      "name": "document.issuer",
                      "tooltip": "",
                      "type": "text"
                    },
                    {
                      "title": "Text",
                      "name": "document.credentialSubject.0.field0",
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
                      "bindBlock": "approve_pp_documents_btn",
                      "width": "250px",
                      "bindGroup": "pp_grid_sr_documents_to_approve"
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
                      "name": "",
                      "tooltip": "",
                      "type": "block",
                      "action": "",
                      "url": "",
                      "dialogContent": "",
                      "dialogClass": "",
                      "dialogType": "",
                      "bindBlock": "revoke_pp_sr_btn",
                      "bindGroup": "pp_grid_sr_documents_approved",
                      "width": "100px"
                    },
                    {
                      "title": "Operation",
                      "name": "option.status",
                      "tooltip": "",
                      "type": "text",
                      "width": "250px"
                    }
                  ]
                },
                "permissions": [
                  "OWNER"
                ],
                "dependencies": [
                  "save_new_approve_document"
                ],
                "onErrorAction": "no-action",
                "tag": "pp_grid_sr",
                "children": [
                  {
                    "id": "23a7bfc0-7c07-4434-9722-a264febcdf32",
                    "blockType": "documentsSourceAddon",
                    "defaultActive": true,
                    "permissions": [
                      "OWNER"
                    ],
                    "filters": [
                      {
                        "value": "pp",
                        "field": "type",
                        "type": "equal"
                      },
                      {
                        "value": "Waiting for approval",
                        "field": "option.status",
                        "type": "equal"
                      }
                    ],
                    "dataType": "vc-documents",
                    "schema": "#2558d6d7-5b83-464a-9236-8f08a7257c55",
                    "onErrorAction": "no-action",
                    "tag": "pp_grid_sr_documents_to_approve",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "6523a791-0f1d-4c1f-9972-61446a37604c",
                    "blockType": "documentsSourceAddon",
                    "defaultActive": false,
                    "permissions": [
                      "OWNER"
                    ],
                    "onErrorAction": "no-action",
                    "filters": [
                      {
                        "value": "approved_pp",
                        "field": "type",
                        "type": "equal"
                      }
                    ],
                    "dataType": "vc-documents",
                    "schema": "#2558d6d7-5b83-464a-9236-8f08a7257c55",
                    "onlyOwnDocuments": false,
                    "uiMetaData": {
                      "type": "blank"
                    },
                    "tag": "pp_grid_sr_documents_approved",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "35b0be79-fff7-4c48-aaa7-34044ca94e58",
                    "blockType": "documentsSourceAddon",
                    "defaultActive": false,
                    "permissions": [
                      "OWNER"
                    ],
                    "onErrorAction": "no-action",
                    "filters": [
                      {
                        "value": "rejected_pp",
                        "field": "type",
                        "type": "equal"
                      }
                    ],
                    "dataType": "vc-documents",
                    "schema": "#2558d6d7-5b83-464a-9236-8f08a7257c55",
                    "onlyOwnDocuments": false,
                    "uiMetaData": {
                      "type": "blank"
                    },
                    "tag": "pp_grid_sr_documents_approved_rejected",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "5eaa93a2-3cc5-4111-a831-9bbeacb0c870",
                    "blockType": "historyAddon",
                    "defaultActive": false,
                    "permissions": [
                      "OWNER"
                    ],
                    "onErrorAction": "no-action",
                    "tag": "pp_grid_sr_history",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  }
                ],
                "events": [],
                "artifacts": []
              },
              {
                "id": "c98e19bb-398c-4ecf-94a4-5d3ef26dd7a3",
                "blockType": "buttonBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {
                  "buttons": [
                    {
                      "tag": "Button_0",
                      "name": "Approve",
                      "type": "selector",
                      "filters": [],
                      "field": "option.status",
                      "value": "APPROVED",
                      "uiClass": "btn-approve"
                    },
                    {
                      "tag": "Button_1",
                      "name": "Reject",
                      "type": "selector-dialog",
                      "filters": [],
                      "title": "Reject",
                      "description": "Enter reject reason",
                      "field": "option.status",
                      "value": "REJECTED",
                      "uiClass": "btn-reject"
                    }
                  ]
                },
                "tag": "approve_pp_documents_btn",
                "children": [],
                "events": [
                  {
                    "target": "save_approved_pp",
                    "source": "approve_pp_documents_btn",
                    "input": "RunEvent",
                    "output": "Button_0",
                    "actor": "",
                    "disabled": false
                  },
                  {
                    "target": "save_rejected_pp",
                    "source": "approve_pp_documents_btn",
                    "input": "RunEvent",
                    "output": "Button_1",
                    "actor": "",
                    "disabled": false
                  }
                ],
                "artifacts": []
              },
              {
                "id": "8357faf0-da61-4cc3-b1a6-65a7ab258279",
                "blockType": "buttonBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {
                  "buttons": [
                    {
                      "tag": "Button_0",
                      "name": "Revoke",
                      "type": "selector-dialog",
                      "filters": [
                        {
                          "value": "Revoked",
                          "field": "option.status",
                          "type": "not_equal"
                        }
                      ],
                      "title": "Revoke",
                      "description": "Enter revoke reason"
                    }
                  ]
                },
                "tag": "revoke_pp_sr_btn",
                "children": [],
                "events": [
                  {
                    "target": "revoke_pp_sr",
                    "source": "revoke_pp_sr_btn",
                    "input": "RunEvent",
                    "output": "Button_0",
                    "actor": "owner",
                    "disabled": false
                  }
                ],
                "artifacts": []
              },
              {
                "id": "d8dffa2f-3b26-4f54-bbc3-44f37c5ef677",
                "blockType": "revocationBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "updatePrevDoc": true,
                "prevDocStatus": "Waiting for approval",
                "tag": "revoke_pp_sr",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "7279218c-9fda-4e4c-b576-adae9386764b",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "uiMetaData": {},
                "entityType": "",
                "dataType": "vc-documents",
                "onErrorAction": "no-action",
                "options": [
                  {
                    "name": "status",
                    "value": "Revoked"
                  }
                ],
                "dataSource": "database",
                "documentType": "document",
                "stopPropagation": false,
                "tag": "save_revoke_pp_sr",
                "children": [],
                "events": [
                  {
                    "target": "pp_wait_for_approve",
                    "source": "save_revoke_pp_sr",
                    "input": "RunEvent",
                    "output": "RunEvent",
                    "actor": "",
                    "disabled": false
                  },
                  {
                    "target": "project_grid_sr",
                    "source": "save_revoke_pp_sr",
                    "input": "RefreshEvent",
                    "output": "RefreshEvent",
                    "actor": "",
                    "disabled": false
                  },
                  {
                    "target": "report_grid_sr",
                    "source": "save_revoke_pp_sr",
                    "input": "RefreshEvent",
                    "output": "RefreshEvent",
                    "actor": "",
                    "disabled": false
                  },
                  {
                    "target": "vp_grid",
                    "source": "save_revoke_pp_sr",
                    "input": "RefreshEvent",
                    "output": "RefreshEvent",
                    "actor": "",
                    "disabled": false
                  },
                  {
                    "target": "report_grid_vvb",
                    "source": "save_revoke_pp_sr",
                    "input": "RefreshEvent",
                    "output": "RefreshEvent",
                    "actor": "",
                    "disabled": false
                  }
                ],
                "artifacts": []
              }
            ],
            "events": [],
            "artifacts": []
          },
          {
            "id": "825a3c80-8a4d-4e1b-9577-f59f10492808",
            "blockType": "interfaceContainerBlock",
            "defaultActive": true,
            "uiMetaData": {
              "type": "blank",
              "title": "Approve VVB"
            },
            "permissions": [
              "OWNER"
            ],
            "onErrorAction": "no-action",
            "tag": "sr_vvb_approval",
            "children": [
              {
                "id": "daa990a7-6196-4117-9e38-39762519fc52",
                "blockType": "interfaceDocumentsSourceBlock",
                "defaultActive": true,
                "uiMetaData": {
                  "fields": [
                    {
                      "title": "Owner",
                      "name": "document.issuer",
                      "tooltip": "",
                      "type": "text"
                    },
                    {
                      "title": "Text",
                      "name": "document.credentialSubject.0.field0",
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
                      "bindBlock": "approve_documents_btn",
                      "width": "250px",
                      "bindGroup": "vvb_grid_sr_documents_to_approve"
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
                      "name": "",
                      "tooltip": "",
                      "type": "block",
                      "action": "",
                      "url": "",
                      "dialogContent": "",
                      "dialogClass": "",
                      "dialogType": "",
                      "bindBlock": "revoke_vvb_sr_btn",
                      "bindGroup": "vvb_grid_sr_documents_approved",
                      "width": "250px"
                    },
                    {
                      "title": "Operation",
                      "name": "option.status",
                      "tooltip": "",
                      "type": "text",
                      "width": "250px"
                    }
                  ]
                },
                "permissions": [
                  "OWNER"
                ],
                "dependencies": [
                  "save_new_approve_document"
                ],
                "onErrorAction": "no-action",
                "tag": "vvb_grid_sr",
                "children": [
                  {
                    "id": "0abeda87-f9fd-4afd-bc6f-fb2355e473b7",
                    "blockType": "documentsSourceAddon",
                    "defaultActive": true,
                    "permissions": [
                      "OWNER"
                    ],
                    "filters": [
                      {
                        "value": "vvb",
                        "field": "type",
                        "type": "equal"
                      },
                      {
                        "value": "Waiting for approval",
                        "field": "option.status",
                        "type": "equal"
                      }
                    ],
                    "dataType": "vc-documents",
                    "schema": "#5bb9d766-5fd9-4f24-82e2-8324d52264d2",
                    "onErrorAction": "no-action",
                    "tag": "vvb_grid_sr_documents_to_approve",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "cf638c4a-2630-43fe-a391-151365c42219",
                    "blockType": "documentsSourceAddon",
                    "defaultActive": false,
                    "permissions": [
                      "OWNER"
                    ],
                    "onErrorAction": "no-action",
                    "filters": [
                      {
                        "value": "approved_vvb",
                        "field": "type",
                        "type": "equal"
                      }
                    ],
                    "dataType": "vc-documents",
                    "schema": "#5bb9d766-5fd9-4f24-82e2-8324d52264d2",
                    "onlyOwnDocuments": false,
                    "uiMetaData": {
                      "type": "blank"
                    },
                    "tag": "vvb_grid_sr_documents_approved",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "4166181b-3c58-4639-8e02-8314f203f653",
                    "blockType": "documentsSourceAddon",
                    "defaultActive": false,
                    "permissions": [
                      "OWNER"
                    ],
                    "onErrorAction": "no-action",
                    "filters": [
                      {
                        "value": "rejected_vvb",
                        "field": "type",
                        "type": "equal"
                      }
                    ],
                    "dataType": "vc-documents",
                    "schema": "#5bb9d766-5fd9-4f24-82e2-8324d52264d2",
                    "onlyOwnDocuments": false,
                    "uiMetaData": {
                      "type": "blank"
                    },
                    "tag": "vvb_grid_sr_documents_approved_rejected",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "fb8bfce6-1668-4e1f-bf8b-636f297703cc",
                    "blockType": "historyAddon",
                    "defaultActive": false,
                    "permissions": [
                      "OWNER"
                    ],
                    "onErrorAction": "no-action",
                    "tag": "history_addon_35a0bfb0-72a2-4dde-a107-ce356544a9c7",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  }
                ],
                "events": [],
                "artifacts": []
              },
              {
                "id": "1c34cb97-2d83-49b1-ae2e-719ca2ca7f8e",
                "blockType": "buttonBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {
                  "buttons": [
                    {
                      "tag": "Button_0",
                      "name": "Approve",
                      "type": "selector",
                      "filters": [],
                      "field": "option.status",
                      "value": "APPROVED",
                      "uiClass": "btn-approve"
                    },
                    {
                      "tag": "Button_1",
                      "name": "Reject",
                      "type": "selector-dialog",
                      "filters": [],
                      "title": "Reject",
                      "description": "Enter reject reason",
                      "field": "option.status",
                      "value": "REJECTED",
                      "uiClass": "btn-reject"
                    }
                  ]
                },
                "tag": "approve_documents_btn",
                "children": [],
                "events": [
                  {
                    "target": "update_approve_document_status",
                    "source": "approve_documents_btn",
                    "input": "RunEvent",
                    "output": "Button_0",
                    "actor": "",
                    "disabled": false
                  },
                  {
                    "target": "update_approve_document_status_2",
                    "source": "approve_documents_btn",
                    "input": "RunEvent",
                    "output": "Button_1",
                    "actor": "",
                    "disabled": false
                  }
                ],
                "artifacts": []
              },
              {
                "id": "1f420af0-6c95-4939-bf43-9626ab223779",
                "blockType": "buttonBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {
                  "buttons": [
                    {
                      "tag": "Button_0",
                      "name": "Revoke",
                      "type": "selector-dialog",
                      "filters": [
                        {
                          "value": "Revoked",
                          "field": "option.status",
                          "type": "not_equal"
                        }
                      ],
                      "title": "Revoke",
                      "description": "Enter revoke reason"
                    }
                  ]
                },
                "tag": "revoke_vvb_sr_btn",
                "children": [],
                "events": [
                  {
                    "target": "revoke_vvb_sr",
                    "source": "revoke_vvb_sr_btn",
                    "input": "RunEvent",
                    "output": "Button_0",
                    "actor": "",
                    "disabled": false
                  }
                ],
                "artifacts": []
              },
              {
                "id": "0cc89dc8-6278-4afb-92c1-b72c8ad46429",
                "blockType": "revocationBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "updatePrevDoc": true,
                "prevDocStatus": "Waiting for approval",
                "tag": "revoke_vvb_sr",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "d9d6a7b0-0f93-40ae-ae51-e66e32e5b5ba",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "uiMetaData": {},
                "entityType": "",
                "dataType": "vc-documents",
                "onErrorAction": "no-action",
                "options": [
                  {
                    "name": "status",
                    "value": "Revoked"
                  }
                ],
                "dataSource": "database",
                "documentType": "document",
                "stopPropagation": false,
                "tag": "save_revoke_vvb_sr",
                "children": [],
                "events": [
                  {
                    "target": "vvb_grid_sr",
                    "source": "save_revoke_vvb_sr",
                    "input": "RefreshEvent",
                    "output": "RefreshEvent",
                    "actor": "",
                    "disabled": false
                  },
                  {
                    "target": "report_grid_sr",
                    "source": "save_revoke_vvb_sr",
                    "input": "RefreshEvent",
                    "output": "RefreshEvent",
                    "actor": "",
                    "disabled": false
                  },
                  {
                    "target": "vp_grid",
                    "source": "save_revoke_vvb_sr",
                    "input": "RefreshEvent",
                    "output": "RefreshEvent",
                    "actor": "",
                    "disabled": false
                  }
                ],
                "artifacts": []
              },
              {
                "id": "659b8209-4747-4c8f-9d75-53fd6036f85e",
                "blockType": "switchBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "executionFlow": "firstTrue",
                "conditions": [
                  {
                    "type": "equal",
                    "value": "true == true",
                    "actor": "owner",
                    "target": "wait_for_approve",
                    "tag": "Condition_0"
                  }
                ],
                "tag": "return_vvb_to_wait",
                "children": [],
                "events": [
                  {
                    "target": "wait_for_approve",
                    "source": "return_vvb_to_wait",
                    "input": "RunEvent",
                    "output": "Condition_0",
                    "actor": "owner",
                    "disabled": false
                  },
                  {
                    "target": "",
                    "source": "return_vvb_to_wait",
                    "input": "RunEvent",
                    "output": "Condition_0",
                    "actor": "",
                    "disabled": false
                  },
                  {
                    "target": "",
                    "source": "return_vvb_to_wait",
                    "input": "RunEvent",
                    "output": "Condition_0",
                    "actor": "",
                    "disabled": false
                  }
                ],
                "artifacts": []
              }
            ],
            "events": [],
            "artifacts": []
          },
          {
            "id": "9b7f72a4-23ab-4772-9a80-d916a0e74dd9",
            "blockType": "interfaceContainerBlock",
            "defaultActive": true,
            "uiMetaData": {
              "title": "Project Pipeline",
              "type": "blank"
            },
            "permissions": [
              "OWNER"
            ],
            "onErrorAction": "no-action",
            "tag": "sr_project_pipeline",
            "children": [
              {
                "id": "c2f9088b-f87c-4812-998a-a99120dbece3",
                "blockType": "interfaceDocumentsSourceBlock",
                "defaultActive": true,
                "uiMetaData": {
                  "fields": [
                    {
                      "title": "Summary",
                      "name": "document.credentialSubject.0.field0.field0",
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
                      "title": "Operations",
                      "name": "",
                      "tooltip": "",
                      "type": "block",
                      "action": "",
                      "url": "",
                      "dialogContent": "",
                      "dialogClass": "",
                      "dialogType": "",
                      "bindBlock": "sr_validate_project_btn",
                      "bindGroup": "project_grid_sr_waiting_for_validation",
                      "width": "250px"
                    },
                    {
                      "title": "Operations",
                      "name": "",
                      "tooltip": "",
                      "type": "block",
                      "action": "",
                      "url": "",
                      "dialogContent": "",
                      "dialogClass": "",
                      "dialogType": "",
                      "bindBlock": "sr_revoke_project_btn",
                      "bindGroup": "project_grid_sr_validated_revoked",
                      "width": "250px"
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
                  "type": "blank"
                },
                "permissions": [
                  "OWNER"
                ],
                "dependencies": [
                  "reject_project_status",
                  "save_assign",
                  "save_project",
                  "save_reassign_project"
                ],
                "onErrorAction": "no-action",
                "tag": "project_grid_sr",
                "children": [
                  {
                    "id": "d51bf858-6c03-4473-8025-e61df47d2980",
                    "blockType": "documentsSourceAddon",
                    "defaultActive": true,
                    "permissions": [
                      "OWNER"
                    ],
                    "filters": [
                      {
                        "title": "",
                        "name": "",
                        "tooltip": "",
                        "type": "equal",
                        "value": "Waiting for Validation",
                        "field": "option.status"
                      },
                      {
                        "value": "project",
                        "field": "type",
                        "type": "equal"
                      }
                    ],
                    "dataType": "vc-documents",
                    "schema": "#0b812688-66c7-4eb8-ba91-6c8b000a11ea",
                    "onErrorAction": "no-action",
                    "tag": "project_grid_sr_waiting_for_validation",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "6685877f-cad0-412a-bfa5-e426ca1b632a",
                    "blockType": "documentsSourceAddon",
                    "defaultActive": true,
                    "permissions": [
                      "OWNER"
                    ],
                    "filters": [
                      {
                        "value": "approved_project",
                        "field": "type",
                        "type": "equal"
                      }
                    ],
                    "dataType": "vc-documents",
                    "schema": "#0b812688-66c7-4eb8-ba91-6c8b000a11ea",
                    "onErrorAction": "no-action",
                    "tag": "project_grid_sr_validated_revoked",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "f353ac50-72a2-4973-af82-e0332ba57f2d",
                    "blockType": "documentsSourceAddon",
                    "defaultActive": true,
                    "permissions": [
                      "OWNER"
                    ],
                    "filters": [
                      {
                        "value": "rejected_project",
                        "field": "type",
                        "type": "equal"
                      }
                    ],
                    "dataType": "vc-documents",
                    "schema": "#0b812688-66c7-4eb8-ba91-6c8b000a11ea",
                    "onErrorAction": "no-action",
                    "tag": "project_grid_sr_rejected",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "8f6166a3-e42b-4600-8178-ccda40f85bd3",
                    "blockType": "historyAddon",
                    "defaultActive": false,
                    "permissions": [
                      "OWNER"
                    ],
                    "onErrorAction": "no-action",
                    "tag": "sr_project_grid_history",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  }
                ],
                "events": [],
                "artifacts": []
              },
              {
                "id": "8ede2972-94d0-4c8e-8ec0-f0057741cb67",
                "blockType": "buttonBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {
                  "buttons": [
                    {
                      "tag": "Button_0",
                      "name": "Validate",
                      "type": "selector",
                      "filters": [],
                      "field": "option.status",
                      "value": "Validated",
                      "uiClass": "btn-approve"
                    },
                    {
                      "tag": "Button_1",
                      "name": "Reject",
                      "type": "selector-dialog",
                      "filters": [],
                      "title": "Reject",
                      "description": "Enter reject reason",
                      "field": "option.status",
                      "value": "REJECTED",
                      "uiClass": "btn-reject"
                    }
                  ]
                },
                "tag": "sr_validate_project_btn",
                "children": [],
                "events": [
                  {
                    "target": "sr_save_validated_project",
                    "source": "sr_validate_project_btn",
                    "input": "RunEvent",
                    "output": "Button_0",
                    "actor": "",
                    "disabled": false
                  },
                  {
                    "target": "sr_save_rejected_project",
                    "source": "sr_validate_project_btn",
                    "input": "RunEvent",
                    "output": "Button_1",
                    "actor": "",
                    "disabled": false
                  }
                ],
                "artifacts": []
              },
              {
                "id": "fdddeb9b-8dda-4f98-a755-53f15445e500",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "options": [
                  {
                    "name": "status",
                    "value": "Validated"
                  }
                ],
                "dataSource": "database",
                "dataType": "vc-documents",
                "tag": "sr_save_validated_project",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "44895da3-150d-494d-9c55-dd34308f5f78",
                "blockType": "reassigningBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "issuer": "",
                "actor": "",
                "tag": "sr_reassign_validated_project",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "7088ed0e-78c5-4fdb-b8e5-74d3b26ae868",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "options": [],
                "dataSource": "hedera",
                "entityType": "approved_project",
                "topic": "Project",
                "dataType": "hedera",
                "tag": "sr_save_reassigned_validated_project_hedera",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "4678bfda-9569-4d01-ad5c-ffad1c706686",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "options": [],
                "dataSource": "database",
                "stopPropagation": true,
                "dataType": "vc-documents",
                "tag": "sr_save_reassigned_validated_project_db",
                "children": [],
                "events": [
                  {
                    "target": "project_grid_pp_2",
                    "source": "sr_save_reassigned_validated_project_db",
                    "input": "RefreshEvent",
                    "output": "RefreshEvent",
                    "actor": "",
                    "disabled": false
                  }
                ],
                "artifacts": []
              },
              {
                "id": "80bb529f-5436-4c78-b223-2fdf56e458ba",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "options": [
                  {
                    "name": "status",
                    "value": "REJECTED"
                  }
                ],
                "dataSource": "database",
                "dataType": "vc-documents",
                "tag": "sr_save_rejected_project",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "6a011cfd-ebdc-47a9-a88a-dfd59af0b8d7",
                "blockType": "reassigningBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "tag": "sr_reassign_rejected_project",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "6823fee2-2404-442e-a79e-ff7b131decab",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "options": [],
                "dataSource": "hedera",
                "entityType": "rejected_project",
                "topic": "Project",
                "dataType": "hedera",
                "tag": "sr_save_reassigned_rejected_project_hedera",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "30a231b6-8751-46e3-b15c-b5c6c697d1c4",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "options": [],
                "dataSource": "database",
                "stopPropagation": true,
                "dataType": "vc-documents",
                "tag": "sr_save_reassigned_rejected_project_db",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "e3ebaf79-f29d-472a-b258-99d4b5c15dc0",
                "blockType": "buttonBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {
                  "buttons": [
                    {
                      "tag": "Button_0",
                      "name": "Revoke",
                      "type": "selector-dialog",
                      "filters": [
                        {
                          "value": "Revoked",
                          "field": "option.status",
                          "type": "not_equal"
                        }
                      ],
                      "title": "Revoke",
                      "description": "Enter revoke reason"
                    }
                  ]
                },
                "tag": "sr_revoke_project_btn",
                "children": [],
                "events": [
                  {
                    "target": "sr_revoke_project",
                    "source": "sr_revoke_project_btn",
                    "input": "RunEvent",
                    "output": "Button_0",
                    "actor": "",
                    "disabled": false
                  }
                ],
                "artifacts": []
              },
              {
                "id": "55806e39-902c-49e0-9c37-1ce9a13ece7b",
                "blockType": "revocationBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "updatePrevDoc": true,
                "prevDocStatus": "Waiting for Validation",
                "tag": "sr_revoke_project",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "b094cf2c-ae80-4940-9c07-8e0b24fe4b39",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "options": [
                  {
                    "name": "status",
                    "value": "Revoked"
                  }
                ],
                "dataSource": "database",
                "dataType": "vc-documents",
                "tag": "sr_save_revoked_projects",
                "children": [],
                "events": [],
                "artifacts": []
              }
            ],
            "events": [],
            "artifacts": []
          },
          {
            "id": "03ca2f21-8f66-43fa-89f6-698aa90a48c2",
            "blockType": "interfaceContainerBlock",
            "defaultActive": true,
            "permissions": [
              "OWNER"
            ],
            "uiMetaData": {
              "type": "blank",
              "title": "Monitoring Reports"
            },
            "onErrorAction": "no-action",
            "tag": "sr_monitoring_pipeline",
            "children": [
              {
                "id": "36f8c3bc-9e9b-490b-9b0f-ffa7815afa1d",
                "blockType": "interfaceDocumentsSourceBlock",
                "defaultActive": true,
                "permissions": [
                  "OWNER"
                ],
                "uiMetaData": {
                  "fields": [
                    {
                      "title": "Summary",
                      "name": "document.credentialSubject.0.field0.field0",
                      "tooltip": "",
                      "type": "text"
                    },
                    {
                      "title": "Project",
                      "name": "document.credentialSubject.0.ref",
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
                      "title": "Operation",
                      "name": "option.status",
                      "tooltip": "",
                      "type": "block",
                      "action": "",
                      "url": "",
                      "dialogContent": "",
                      "dialogClass": "",
                      "dialogType": "",
                      "bindBlock": "sr_approve_report_btn",
                      "bindGroup": "report_grid_sr_verified_approved_reports",
                      "width": "250px"
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
                      "name": "",
                      "tooltip": "",
                      "type": "block",
                      "action": "",
                      "url": "",
                      "dialogContent": "",
                      "dialogClass": "",
                      "dialogType": "",
                      "bindBlock": "sr_revoke_report_btn",
                      "bindGroup": "report_grid_sr_approved_revoked",
                      "width": ""
                    }
                  ]
                },
                "dependencies": [
                  "save_mint_status",
                  "save_reassign_report"
                ],
                "onErrorAction": "no-action",
                "tag": "report_grid_sr",
                "children": [
                  {
                    "id": "63071c82-6395-45ea-aae1-456bf426f9d8",
                    "blockType": "documentsSourceAddon",
                    "defaultActive": false,
                    "permissions": [
                      "OWNER"
                    ],
                    "filters": [
                      {
                        "title": "",
                        "name": "",
                        "tooltip": "",
                        "type": "equal",
                        "field": "option.status",
                        "value": "Verified"
                      },
                      {
                        "value": "approved_report",
                        "field": "type",
                        "type": "equal"
                      }
                    ],
                    "dataType": "vc-documents",
                    "schema": "#8b96bc47-16d4-4e02-bb32-b454387d1279",
                    "onErrorAction": "no-action",
                    "tag": "report_grid_sr_verified_approved_reports",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "5158fa48-e669-4386-83a1-82cfda6fda86",
                    "blockType": "documentsSourceAddon",
                    "defaultActive": false,
                    "permissions": [
                      "OWNER"
                    ],
                    "filters": [
                      {
                        "value": "approved_report_sr",
                        "field": "type",
                        "type": "equal"
                      }
                    ],
                    "dataType": "vc-documents",
                    "schema": "#8b96bc47-16d4-4e02-bb32-b454387d1279",
                    "onErrorAction": "no-action",
                    "tag": "report_grid_sr_approved_revoked",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "d4ae14e3-1ee2-424c-8c71-708db8ad07a6",
                    "blockType": "documentsSourceAddon",
                    "defaultActive": false,
                    "permissions": [
                      "OWNER"
                    ],
                    "filters": [
                      {
                        "value": "rejected_report_sr",
                        "field": "type",
                        "type": "equal"
                      }
                    ],
                    "dataType": "vc-documents",
                    "schema": "#8b96bc47-16d4-4e02-bb32-b454387d1279",
                    "onErrorAction": "no-action",
                    "tag": "report_grid_sr_rejected",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "debdcf54-821e-46c3-a0e6-81d06b01bbba",
                    "blockType": "historyAddon",
                    "defaultActive": false,
                    "permissions": [
                      "OWNER"
                    ],
                    "onErrorAction": "no-action",
                    "tag": "history_addon_97744a6d-4bd6-4281-9075-3695b76475f1",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  }
                ],
                "events": [],
                "artifacts": []
              },
              {
                "id": "62f1f3b9-7b8e-42e8-ac1d-84745d339050",
                "blockType": "buttonBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "uiMetaData": {
                  "options": [
                    {
                      "title": "",
                      "name": "Mint",
                      "tooltip": "",
                      "type": "text",
                      "value": "Minting",
                      "uiClass": "btn-approve",
                      "bindBlock": "save_mint_status",
                      "tag": "Option_0"
                    }
                  ],
                  "content": "vvb_lifecycle",
                  "buttons": [
                    {
                      "tag": "Button_0",
                      "name": "Approve",
                      "type": "selector",
                      "filters": [],
                      "field": "option.status",
                      "value": "Minted",
                      "uiClass": "btn-approve"
                    },
                    {
                      "tag": "Button_1",
                      "name": "Reject",
                      "type": "selector",
                      "filters": [],
                      "field": "option.status",
                      "value": "Rejected",
                      "uiClass": "btn-reject"
                    }
                  ]
                },
                "type": "selector",
                "field": "option.status",
                "onErrorAction": "no-action",
                "tag": "sr_approve_report_btn",
                "children": [],
                "events": [
                  {
                    "target": "sr_save_approved_report",
                    "source": "sr_approve_report_btn",
                    "input": "RunEvent",
                    "output": "Button_0",
                    "actor": "",
                    "disabled": false
                  },
                  {
                    "target": "sr_save_rejected_report",
                    "source": "sr_approve_report_btn",
                    "input": "RunEvent",
                    "output": "Button_1",
                    "actor": "",
                    "disabled": false
                  }
                ],
                "artifacts": []
              },
              {
                "id": "f839689f-ed32-4a20-b3cf-956f5048d61e",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "uiMetaData": {},
                "options": [
                  {
                    "name": "status",
                    "value": "Minted"
                  }
                ],
                "entityType": "",
                "dataType": "vc-documents",
                "onErrorAction": "no-action",
                "dataSource": "database",
                "documentType": "vc",
                "tag": "sr_save_approved_report",
                "children": [],
                "events": [
                  {
                    "target": "report_grid_vvb",
                    "source": "sr_save_approved_report",
                    "input": "RefreshEvent",
                    "output": "RefreshEvent",
                    "actor": "",
                    "disabled": false
                  }
                ],
                "artifacts": []
              },
              {
                "id": "a90d9240-7ffd-4c0d-bbcc-26852a956375",
                "blockType": "reassigningBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "tag": "sr_reassign_approved_report",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "8388f97d-5e0a-4ecc-ba64-0d493b88347e",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "options": [],
                "dataSource": "hedera",
                "topic": "Project",
                "entityType": "approved_report_sr",
                "dataType": "hedera",
                "tag": "sr_save_reassigned_approved_report_hedera",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "cd21eea8-1c9a-4dde-8140-46ca7bdc1a90",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "options": [],
                "dataSource": "database",
                "dataType": "vc-documents",
                "tag": "sr_save_reassigned_approved_report_db",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "54a6e836-0fb2-448a-b278-0537efaffc5e",
                "blockType": "mintDocumentBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "uiMetaData": {},
                "rule": "field7",
                "tokenId": "5dceb6e0-d3cf-44a4-abb1-e369eab71452",
                "onErrorAction": "no-action",
                "accountType": "default",
                "stopPropagation": true,
                "tag": "mintToken",
                "children": [],
                "events": [
                  {
                    "target": "tokens_grid",
                    "source": "mintToken",
                    "input": "RefreshEvent",
                    "output": "RefreshEvent",
                    "actor": "",
                    "disabled": false
                  },
                  {
                    "target": "vp_grid",
                    "source": "mintToken",
                    "input": "RefreshEvent",
                    "output": "RefreshEvent",
                    "actor": "",
                    "disabled": false
                  }
                ],
                "artifacts": []
              },
              {
                "id": "f03e4ca6-0e7e-45de-b37e-0360c8eed493",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "uiMetaData": {},
                "options": [
                  {
                    "name": "status",
                    "value": "Rejected"
                  }
                ],
                "entityType": "",
                "dataType": "vc-documents",
                "onErrorAction": "no-action",
                "dataSource": "database",
                "documentType": "vc",
                "tag": "sr_save_rejected_report",
                "children": [],
                "events": [
                  {
                    "target": "report_grid_vvb",
                    "source": "sr_save_rejected_report",
                    "input": "RefreshEvent",
                    "output": "RefreshEvent",
                    "actor": "",
                    "disabled": false
                  }
                ],
                "artifacts": []
              },
              {
                "id": "7968ea8e-88b2-41b5-9605-90220ec4e489",
                "blockType": "reassigningBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "tag": "sr_reassign_rejected_report",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "0011428b-d9a3-49eb-a34c-3e60fdf64f5c",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "options": [],
                "dataSource": "hedera",
                "topic": "Project",
                "entityType": "rejected_report_sr",
                "dataType": "hedera",
                "tag": "sr_save_reassigned_rejected_report_hedera",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "f8763fb3-b06f-454b-84c8-d8e3eaa3a949",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "options": [],
                "dataSource": "database",
                "stopPropagation": true,
                "dataType": "vc-documents",
                "tag": "sr_save_reassigned_rejected_report_db",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "1f05c81d-9ad8-4bde-8f28-633bd6bae01f",
                "blockType": "buttonBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {
                  "buttons": [
                    {
                      "tag": "Button_0",
                      "name": "Revoke",
                      "type": "selector-dialog",
                      "filters": [
                        {
                          "value": "Revoked",
                          "field": "option.status",
                          "type": "not_equal"
                        }
                      ],
                      "title": "Revoke",
                      "description": "Enter revoke reason"
                    }
                  ]
                },
                "tag": "sr_revoke_report_btn",
                "children": [],
                "events": [
                  {
                    "target": "sr_revoke_reports",
                    "source": "sr_revoke_report_btn",
                    "input": "RunEvent",
                    "output": "Button_0",
                    "actor": "",
                    "disabled": false
                  }
                ],
                "artifacts": []
              },
              {
                "id": "6202d957-630d-4184-93f7-1aa5da122436",
                "blockType": "revocationBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "updatePrevDoc": true,
                "prevDocStatus": "Verified",
                "tag": "sr_revoke_reports",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "f980fb60-9943-4b5b-9791-d82b526e7da0",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "options": [
                  {
                    "name": "status",
                    "value": "Revoked"
                  }
                ],
                "dataSource": "database",
                "dataType": "vc-documents",
                "tag": "sr_save_revoked_reports",
                "children": [],
                "events": [
                  {
                    "target": "report_grid_vvb",
                    "source": "sr_save_revoked_reports",
                    "input": "RefreshEvent",
                    "output": "RefreshEvent",
                    "actor": "",
                    "disabled": false
                  },
                  {
                    "target": "tokens_grid",
                    "source": "sr_save_revoked_reports",
                    "input": "RefreshEvent",
                    "output": "RefreshEvent",
                    "actor": "",
                    "disabled": false
                  },
                  {
                    "target": "vp_grid",
                    "source": "sr_save_revoked_reports",
                    "input": "RefreshEvent",
                    "output": "RefreshEvent",
                    "actor": "",
                    "disabled": false
                  }
                ],
                "artifacts": []
              }
            ],
            "events": [],
            "artifacts": []
          },
          {
            "id": "4780a4d2-f8e1-4ad6-aed4-85558ead9e88",
            "blockType": "interfaceContainerBlock",
            "defaultActive": true,
            "permissions": [
              "OWNER"
            ],
            "uiMetaData": {
              "type": "blank",
              "title": "Token History"
            },
            "tag": "sr_verified_projects",
            "children": [
              {
                "id": "1a7e759d-9b72-490a-ba75-062b19a5d0ac",
                "blockType": "interfaceDocumentsSourceBlock",
                "defaultActive": true,
                "permissions": [
                  "OWNER"
                ],
                "uiMetaData": {
                  "fields": [
                    {
                      "title": "HASH",
                      "name": "hash",
                      "tooltip": "",
                      "type": "text"
                    },
                    {
                      "title": "Project",
                      "name": "document.verifiableCredential.0.credentialSubject.0.field0.field0",
                      "tooltip": "",
                      "type": "text"
                    },
                    {
                      "title": "Date",
                      "name": "updateDate",
                      "tooltip": "",
                      "type": "text"
                    },
                    {
                      "title": "Amount",
                      "name": "document.verifiableCredential.1.credentialSubject.0.amount",
                      "tooltip": "",
                      "type": "text"
                    },
                    {
                      "title": "sr_trustchain",
                      "name": "hash",
                      "tooltip": "",
                      "type": "button",
                      "action": "link",
                      "url": "",
                      "dialogContent": "",
                      "dialogClass": "",
                      "dialogType": "",
                      "bindBlock": "vmr0015_trust_chain_report",
                      "content": "View verification report",
                      "width": "150px"
                    }
                  ]
                },
                "onErrorAction": "no-action",
                "tag": "vp_grid",
                "children": [
                  {
                    "id": "d7f0c29e-d0b8-4d63-9425-a70afc725014",
                    "blockType": "documentsSourceAddon",
                    "defaultActive": false,
                    "permissions": [
                      "OWNER"
                    ],
                    "filters": [],
                    "dataType": "vc-documents",
                    "tag": "vp_grid_vp_documents",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  }
                ],
                "events": [],
                "artifacts": []
              }
            ],
            "events": [],
            "artifacts": []
          },
          {
            "id": "3f274435-8d11-4c67-b813-21ef43247223",
            "blockType": "interfaceContainerBlock",
            "defaultActive": true,
            "permissions": [
              "OWNER"
            ],
            "uiMetaData": {
              "type": "blank",
              "title": "Trust Chain"
            },
            "tag": "sr_trustchain",
            "children": [
              {
                "id": "47b1a5f2-4126-46f9-9606-f5dc8206d1c2",
                "blockType": "reportBlock",
                "defaultActive": true,
                "permissions": [
                  "OWNER"
                ],
                "onErrorAction": "no-action",
                "tag": "vmr0015_trust_chain_report",
                "children": [
                  {
                    "id": "67bd38da-3c35-4a2d-8928-f8045c24fe2a",
                    "blockType": "reportItemBlock",
                    "defaultActive": false,
                    "permissions": [
                      "OWNER"
                    ],
                    "filters": [
                      {
                        "field": "document.id",
                        "value": "actionId",
                        "typeValue": "variable",
                        "type": "equal"
                      }
                    ],
                    "variables": [
                      {
                        "name": "mint_token_relationships",
                        "value": "relationships"
                      }
                    ],
                    "icon": "mint",
                    "title": "Mint Token",
                    "description": "Mint CERs",
                    "visible": true,
                    "onErrorAction": "no-action",
                    "iconType": "COMMON",
                    "dynamicFilters": [],
                    "tag": "MintTokenItem",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "ebd4e876-89fb-4f53-8da3-55b6f72533db",
                    "blockType": "reportItemBlock",
                    "defaultActive": false,
                    "permissions": [
                      "OWNER"
                    ],
                    "filters": [
                      {
                        "type": "in",
                        "typeValue": "variable",
                        "field": "messageId",
                        "value": "mint_token_relationships"
                      },
                      {
                        "type": "equal",
                        "typeValue": "value",
                        "field": "type",
                        "value": "approved_report_sr"
                      }
                    ],
                    "variables": [
                      {
                        "value": "relationships",
                        "name": "rep_mon_apr_relationships"
                      }
                    ],
                    "visible": true,
                    "title": "Monitoring Report",
                    "description": "Monitoring Report Minted",
                    "icon": "report",
                    "onErrorAction": "no-action",
                    "iconType": "COMMON",
                    "dynamicFilters": [],
                    "tag": "ReportMonitoringReportApproved",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "e8c9a890-9b78-4c75-842a-a5ee8140d816",
                    "blockType": "reportItemBlock",
                    "defaultActive": false,
                    "permissions": [
                      "OWNER"
                    ],
                    "filters": [
                      {
                        "type": "in",
                        "typeValue": "variable",
                        "field": "messageId",
                        "value": "rep_mon_apr_relationships"
                      },
                      {
                        "type": "equal",
                        "typeValue": "value",
                        "field": "type",
                        "value": "approved_report"
                      }
                    ],
                    "variables": [
                      {
                        "value": "relationships",
                        "name": "rep_mon_ver_relationships"
                      }
                    ],
                    "visible": true,
                    "title": "Monitoring Report",
                    "description": "Monitoring Report Verified ",
                    "icon": "report",
                    "onErrorAction": "no-action",
                    "iconType": "COMMON",
                    "dynamicFilters": [],
                    "tag": "ReportMonitoringReportVerified",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "88218409-ea78-415f-a013-7ac8ea45dfc3",
                    "blockType": "reportItemBlock",
                    "defaultActive": false,
                    "permissions": [
                      "OWNER"
                    ],
                    "onErrorAction": "no-action",
                    "filters": [
                      {
                        "type": "in",
                        "typeValue": "variable",
                        "field": "messageId",
                        "value": "rep_mon_ver_relationships"
                      },
                      {
                        "type": "equal",
                        "typeValue": "value",
                        "field": "type",
                        "value": "report"
                      }
                    ],
                    "variables": [
                      {
                        "name": "auto_mon_rep_relationships",
                        "value": "relationships"
                      }
                    ],
                    "visible": true,
                    "description": "Automatic completion of MonitoringReport fields",
                    "title": "Monitoring Report",
                    "iconType": "COMMON",
                    "dynamicFilters": [],
                    "tag": "AutomaticMonitoringReport",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "bdea7094-5455-42e4-a032-b9ab09bdabd8",
                    "blockType": "reportItemBlock",
                    "defaultActive": false,
                    "permissions": [
                      "OWNER"
                    ],
                    "onErrorAction": "no-action",
                    "filters": [
                      {
                        "type": "in",
                        "typeValue": "variable",
                        "field": "messageId",
                        "value": "auto_mon_rep_relationships"
                      },
                      {
                        "type": "equal",
                        "typeValue": "value",
                        "field": "type",
                        "value": "report_form"
                      }
                    ],
                    "variables": [
                      {
                        "name": "rep_mon_rep_relationships",
                        "value": "relationships"
                      }
                    ],
                    "visible": true,
                    "description": "Monitoring Report Created",
                    "title": "Monitoring Report",
                    "iconType": "COMMON",
                    "dynamicFilters": [],
                    "tag": "ReportMonitoringReportCreated",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "0439d863-8c61-484f-8805-fa4c1a480e5f",
                    "blockType": "reportItemBlock",
                    "defaultActive": false,
                    "permissions": [
                      "OWNER"
                    ],
                    "filters": [
                      {
                        "value": "rep_mon_rep_relationships",
                        "typeValue": "variable",
                        "type": "in",
                        "field": "messageId"
                      },
                      {
                        "type": "equal",
                        "typeValue": "value",
                        "field": "type",
                        "value": "approved_project"
                      }
                    ],
                    "variables": [
                      {
                        "name": "rep_pro_val_relationships",
                        "value": "relationships"
                      }
                    ],
                    "visible": true,
                    "title": "Project",
                    "description": "Project Validation",
                    "icon": "project",
                    "onErrorAction": "no-action",
                    "iconType": "COMMON",
                    "dynamicFilters": [],
                    "tag": "ReportProjectValidation",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "6f942469-ccef-4f51-914e-7efd6945c0d7",
                    "blockType": "reportItemBlock",
                    "defaultActive": false,
                    "permissions": [
                      "OWNER"
                    ],
                    "onErrorAction": "no-action",
                    "filters": [
                      {
                        "value": "rep_pro_val_relationships",
                        "typeValue": "variable",
                        "type": "in",
                        "field": "messageId"
                      },
                      {
                        "type": "equal",
                        "typeValue": "value",
                        "field": "type",
                        "value": "project"
                      }
                    ],
                    "variables": [
                      {
                        "name": "auto_pro_relationships",
                        "value": "relationships"
                      }
                    ],
                    "visible": true,
                    "description": "Automatic completion of Project fields",
                    "title": "Project",
                    "iconType": "COMMON",
                    "dynamicFilters": [],
                    "tag": "AutomaticProject",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "8c129149-36b4-451f-8217-c1ba1035705a",
                    "blockType": "reportItemBlock",
                    "defaultActive": false,
                    "permissions": [
                      "OWNER"
                    ],
                    "onErrorAction": "no-action",
                    "filters": [
                      {
                        "value": "auto_pro_relationships",
                        "typeValue": "variable",
                        "type": "in",
                        "field": "messageId"
                      },
                      {
                        "type": "equal",
                        "typeValue": "value",
                        "field": "type",
                        "value": "project_form"
                      }
                    ],
                    "variables": [],
                    "visible": true,
                    "title": "Project",
                    "description": "Project Created",
                    "iconType": "COMMON",
                    "tag": "ReportProjectCreated",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  }
                ],
                "events": [],
                "artifacts": []
              }
            ],
            "events": [],
            "artifacts": []
          }
        ],
        "events": [],
        "artifacts": []
      },
      {
        "id": "ca8af9c3-c937-498d-a9b7-e487fce3c78c",
        "blockType": "interfaceStepBlock",
        "defaultActive": true,
        "permissions": [
          "Project Participant"
        ],
        "onErrorAction": "no-action",
        "uiMetaData": {},
        "tag": "pp_lifecycle",
        "children": [
          {
            "id": "f1374b8d-d1f0-478d-b2d5-d780b43cd599",
            "blockType": "requestVcDocumentBlock",
            "defaultActive": true,
            "uiMetaData": {
              "privateFields": [],
              "type": "page",
              "title": "New PP"
            },
            "permissions": [
              "Project Participant"
            ],
            "idType": "OWNER",
            "schema": "#2558d6d7-5b83-464a-9236-8f08a7257c55",
            "onErrorAction": "no-action",
            "presetFields": [
              {
                "name": "field0",
                "title": "VVB Name",
                "value": "field0",
                "readonly": false
              }
            ],
            "preset": true,
            "presetSchema": "#5bb9d766-5fd9-4f24-82e2-8324d52264d2",
            "tag": "create_pp_profile",
            "children": [
              {
                "id": "0a747786-e48a-4509-a9a6-f2041c2371c4",
                "blockType": "documentsSourceAddon",
                "defaultActive": false,
                "permissions": [
                  "Project Participant"
                ],
                "onErrorAction": "no-action",
                "filters": [
                  {
                    "value": "REJECTED",
                    "field": "option.status",
                    "type": "equal"
                  }
                ],
                "schema": "#2558d6d7-5b83-464a-9236-8f08a7257c55",
                "dataType": "vc-documents",
                "createdOrderDirection": "DESC",
                "onlyOwnDocuments": true,
                "tag": "preset_pp_profile",
                "children": [],
                "events": [],
                "artifacts": []
              }
            ],
            "events": [],
            "artifacts": []
          },
          {
            "id": "167ae052-764f-4aa1-87ef-998d2f6ecd28",
            "blockType": "sendToGuardianBlock",
            "defaultActive": false,
            "permissions": [
              "Project Participant"
            ],
            "onErrorAction": "no-action",
            "uiMetaData": {},
            "options": [
              {
                "name": "status",
                "value": "Waiting for approval"
              }
            ],
            "dataSource": "hedera",
            "documentType": "vc",
            "topic": "Project",
            "topicOwner": "",
            "entityType": "pp",
            "dataType": "hedera",
            "tag": "save_pp_profile_hedera",
            "children": [],
            "events": [],
            "artifacts": []
          },
          {
            "id": "e7761566-a228-4f94-964e-5893a95f4213",
            "blockType": "sendToGuardianBlock",
            "defaultActive": false,
            "permissions": [
              "Project Participant"
            ],
            "uiMetaData": {},
            "dataType": "did-documents",
            "entityType": "pp",
            "onErrorAction": "no-action",
            "options": [],
            "dataSource": "database",
            "documentType": "vc",
            "tag": "save_pp_profile_db",
            "children": [],
            "events": [],
            "artifacts": []
          },
          {
            "id": "a98acc3c-83b1-4f81-93ba-097cef115dd6",
            "blockType": "informationBlock",
            "defaultActive": true,
            "permissions": [
              "Project Participant"
            ],
            "uiMetaData": {
              "title": "Waiting for approval",
              "description": "Waiting for approval",
              "type": "text"
            },
            "stopPropagation": true,
            "onErrorAction": "no-action",
            "tag": "pp_wait_for_approve",
            "children": [],
            "events": [],
            "artifacts": []
          },
          {
            "id": "8a6e3de6-a186-461f-ab93-0f3664e974d9",
            "blockType": "sendToGuardianBlock",
            "defaultActive": false,
            "permissions": [
              "Project Participant"
            ],
            "uiMetaData": {},
            "entityType": "pp",
            "dataType": "did-documents",
            "onErrorAction": "no-action",
            "options": [],
            "dataSource": "database",
            "documentType": "vc",
            "tag": "save_approved_pp",
            "children": [],
            "events": [],
            "artifacts": []
          },
          {
            "id": "8173f514-09c1-4c86-a2c2-3c9e1ab48f89",
            "blockType": "reassigningBlock",
            "defaultActive": false,
            "permissions": [
              "Project Participant"
            ],
            "onErrorAction": "no-action",
            "uiMetaData": {},
            "issuer": "policyOwner",
            "actor": "owner",
            "tag": "reassign_approved_pp",
            "children": [],
            "events": [],
            "artifacts": []
          },
          {
            "id": "b1f5ff2a-2ab2-421e-94ac-4315a31df5eb",
            "blockType": "sendToGuardianBlock",
            "defaultActive": false,
            "permissions": [
              "Project Participant"
            ],
            "onErrorAction": "no-action",
            "uiMetaData": {},
            "options": [],
            "dataSource": "hedera",
            "documentType": "vc",
            "topic": "Project",
            "topicOwner": "",
            "entityType": "approved_pp",
            "stopPropagation": false,
            "forceNew": false,
            "dataType": "hedera",
            "tag": "save_reassigned_approved_pp_hedera",
            "children": [],
            "events": [],
            "artifacts": []
          },
          {
            "id": "1bf9c9d4-a81e-4f4f-a040-09577391482b",
            "blockType": "sendToGuardianBlock",
            "defaultActive": false,
            "permissions": [
              "Project Participant"
            ],
            "onErrorAction": "no-action",
            "uiMetaData": {},
            "options": [],
            "dataSource": "database",
            "documentType": "vc",
            "topic": "Project",
            "topicOwner": "",
            "entityType": "approved_pp",
            "stopPropagation": false,
            "forceNew": true,
            "dataType": "vc-documents",
            "tag": "save_reassigned_approved_pp_db",
            "children": [],
            "events": [],
            "artifacts": []
          },
          {
            "id": "080cbed3-53e2-4d52-9eb0-199f8fdc8421",
            "blockType": "interfaceContainerBlock",
            "defaultActive": true,
            "uiMetaData": {
              "type": "tabs"
            },
            "permissions": [
              "Project Participant"
            ],
            "onErrorAction": "no-action",
            "tag": "Project Participant_header",
            "children": [
              {
                "id": "fd40a129-7db1-49e7-a488-1e871519c75d",
                "blockType": "interfaceContainerBlock",
                "defaultActive": true,
                "permissions": [
                  "Project Participant"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {
                  "type": "blank",
                  "title": "Documents"
                },
                "tag": "pp_document",
                "children": [
                  {
                    "id": "7a8d8cc9-6e24-4d67-806e-366ba2c73247",
                    "blockType": "interfaceDocumentsSourceBlock",
                    "defaultActive": true,
                    "uiMetaData": {
                      "fields": [
                        {
                          "title": "Owner",
                          "name": "document.issuer",
                          "tooltip": "",
                          "type": "text"
                        },
                        {
                          "title": "Text",
                          "name": "document.credentialSubject.0.field0",
                          "tooltip": "",
                          "type": "text"
                        },
                        {
                          "title": "Operation",
                          "name": "",
                          "tooltip": "",
                          "type": "block",
                          "action": "",
                          "url": "",
                          "dialogContent": "",
                          "dialogClass": "",
                          "dialogType": "",
                          "bindBlock": "pp_revoke_profile",
                          "bindGroup": "pp_documents"
                        },
                        {
                          "title": "Operation",
                          "name": "option.status",
                          "tooltip": "",
                          "type": "text",
                          "action": "",
                          "url": "",
                          "dialogContent": "",
                          "dialogClass": "",
                          "dialogType": "",
                          "bindBlock": "",
                          "width": "250px"
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
                        }
                      ]
                    },
                    "permissions": [
                      "Project Participant"
                    ],
                    "dependencies": [
                      "save_new_approve_document"
                    ],
                    "onErrorAction": "no-action",
                    "tag": "pp_profile_grid",
                    "children": [
                      {
                        "id": "390382e8-601e-43b5-abfa-0e29b49ff85e",
                        "blockType": "documentsSourceAddon",
                        "defaultActive": true,
                        "permissions": [
                          "Project Participant"
                        ],
                        "filters": [
                          {
                            "value": "pp",
                            "field": "type",
                            "type": "in"
                          },
                          {
                            "value": "REJECTED",
                            "field": "option.status",
                            "type": "not_equal"
                          }
                        ],
                        "dataType": "vc-documents",
                        "schema": "#2558d6d7-5b83-464a-9236-8f08a7257c55",
                        "onErrorAction": "no-action",
                        "onlyOwnDocuments": true,
                        "tag": "pp_documents",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "db3f384a-9ecf-41c1-838c-d29cce34298c",
                        "blockType": "documentsSourceAddon",
                        "defaultActive": false,
                        "permissions": [
                          "Project Participant"
                        ],
                        "onErrorAction": "no-action",
                        "filters": [
                          {
                            "value": "pp",
                            "field": "type",
                            "type": "in"
                          },
                          {
                            "value": "REJECTED",
                            "field": "option.status",
                            "type": "equal"
                          }
                        ],
                        "dataType": "vc-documents",
                        "schema": "#2558d6d7-5b83-464a-9236-8f08a7257c55",
                        "onlyOwnDocuments": true,
                        "tag": "pp_documents_rejected",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "6d57fb0a-28a6-493f-abae-e810617e3a73",
                        "blockType": "historyAddon",
                        "defaultActive": false,
                        "permissions": [
                          "Project Participant"
                        ],
                        "onErrorAction": "no-action",
                        "tag": "pp_documents_history",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      }
                    ],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "c2c342b1-d008-40cc-854d-7cc842f10d8f",
                    "blockType": "buttonBlock",
                    "defaultActive": false,
                    "permissions": [
                      "Project Participant"
                    ],
                    "onErrorAction": "no-action",
                    "uiMetaData": {
                      "buttons": [
                        {
                          "tag": "Button_0",
                          "name": "Revoke",
                          "type": "selector-dialog",
                          "filters": [
                            {
                              "value": "Revoked",
                              "field": "option.status",
                              "type": "not_equal"
                            }
                          ],
                          "title": "Revoke",
                          "description": "Enter revoke message"
                        }
                      ]
                    },
                    "tag": "pp_revoke_profile",
                    "children": [],
                    "events": [
                      {
                        "target": "pp_revoke_profile_documents",
                        "source": "pp_revoke_profile",
                        "input": "RunEvent",
                        "output": "Button_0",
                        "actor": "owner",
                        "disabled": false
                      }
                    ],
                    "artifacts": []
                  },
                  {
                    "id": "ce7a6216-22bd-4419-b8fb-8882adac4c78",
                    "blockType": "revocationBlock",
                    "defaultActive": false,
                    "permissions": [
                      "Project Participant"
                    ],
                    "onErrorAction": "no-action",
                    "updatePrevDoc": true,
                    "prevDocStatus": "Waiting for approval",
                    "tag": "pp_revoke_profile_documents",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "5c406f30-0d56-42a2-bd41-262c0c445ecd",
                    "blockType": "sendToGuardianBlock",
                    "defaultActive": false,
                    "permissions": [
                      "Project Participant"
                    ],
                    "uiMetaData": {},
                    "entityType": "",
                    "dataType": "vc-documents",
                    "onErrorAction": "no-action",
                    "options": [
                      {
                        "name": "status",
                        "value": "Revoked"
                      }
                    ],
                    "dataSource": "database",
                    "documentType": "document",
                    "stopPropagation": false,
                    "tag": "pp_save_revoked_profile_documents",
                    "children": [],
                    "events": [
                      {
                        "target": "create_pp_profile",
                        "source": "pp_save_revoked_profile_documents",
                        "input": "RunEvent",
                        "output": "RunEvent",
                        "actor": "",
                        "disabled": false
                      },
                      {
                        "target": "pp_grid_sr",
                        "source": "pp_save_revoked_profile_documents",
                        "input": "RefreshEvent",
                        "output": "RefreshEvent",
                        "actor": "",
                        "disabled": false
                      }
                    ],
                    "artifacts": []
                  }
                ],
                "events": [],
                "artifacts": []
              },
              {
                "id": "c5643535-40f0-4d57-a95c-4f7a683f2632",
                "blockType": "interfaceContainerBlock",
                "defaultActive": true,
                "uiMetaData": {
                  "type": "blank",
                  "title": "Projects"
                },
                "permissions": [
                  "Project Participant"
                ],
                "onErrorAction": "no-action",
                "tag": "Projects_pp",
                "children": [
                  {
                    "id": "74ac5e40-2ded-469a-907f-20762c3cd36a",
                    "blockType": "interfaceDocumentsSourceBlock",
                    "defaultActive": true,
                    "uiMetaData": {
                      "fields": [
                        {
                          "title": "Summary",
                          "name": "document.credentialSubject.0.field0.field0",
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
                          "bindBlock": "report_by_project",
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
                          "bindGroup": "project_grid_pp_2_validated_revoked_projects_own"
                        }
                      ]
                    },
                    "permissions": [
                      "Project Participant"
                    ],
                    "dependencies": [
                      "reject_project_status",
                      "save_added",
                      "save_assign",
                      "save_project",
                      "save_reassign_project",
                      "save_report"
                    ],
                    "onErrorAction": "no-action",
                    "tag": "project_grid_pp_2",
                    "children": [
                      {
                        "id": "8a0cde7f-8f80-4556-8051-39bdcdecd00e",
                        "blockType": "documentsSourceAddon",
                        "defaultActive": false,
                        "permissions": [
                          "Project Participant"
                        ],
                        "filters": [
                          {
                            "title": "",
                            "name": "",
                            "tooltip": "",
                            "type": "equal",
                            "field": "option.status",
                            "value": "Waiting for Validation"
                          }
                        ],
                        "dataType": "vc-documents",
                        "schema": "#0b812688-66c7-4eb8-ba91-6c8b000a11ea",
                        "onlyOwnDocuments": true,
                        "onErrorAction": "no-action",
                        "tag": "project_grid_pp_2_waiting_to_validate_projects",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "4b3145b4-94c6-4829-b433-5ec2a949fc43",
                        "blockType": "documentsSourceAddon",
                        "defaultActive": false,
                        "permissions": [
                          "Project Participant"
                        ],
                        "filters": [
                          {
                            "title": "",
                            "name": "",
                            "tooltip": "",
                            "type": "equal",
                            "field": "option.status",
                            "value": "Validated"
                          },
                          {
                            "value": "approved_project",
                            "field": "type",
                            "type": "equal"
                          }
                        ],
                        "dataType": "vc-documents",
                        "schema": "#0b812688-66c7-4eb8-ba91-6c8b000a11ea",
                        "onlyOwnDocuments": true,
                        "onErrorAction": "no-action",
                        "tag": "project_grid_pp_2_validated_projects",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "b123fd4a-5ee7-45df-98eb-7951dd0d0ab4",
                        "blockType": "documentsSourceAddon",
                        "defaultActive": false,
                        "permissions": [
                          "Project Participant"
                        ],
                        "filters": [
                          {
                            "value": "project",
                            "field": "type",
                            "type": "equal"
                          },
                          {
                            "value": "Validated,Revoked",
                            "field": "option.status",
                            "type": "in"
                          }
                        ],
                        "dataType": "vc-documents",
                        "schema": "#0b812688-66c7-4eb8-ba91-6c8b000a11ea",
                        "onlyOwnDocuments": true,
                        "onErrorAction": "no-action",
                        "tag": "project_grid_pp_2_validated_revoked_projects_own",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "c36ac668-9890-4046-a213-446dc2546b7c",
                        "blockType": "documentsSourceAddon",
                        "defaultActive": false,
                        "permissions": [
                          "Project Participant"
                        ],
                        "onErrorAction": "no-action",
                        "filters": [
                          {
                            "value": "project",
                            "field": "type",
                            "type": "equal"
                          },
                          {
                            "value": "REJECTED",
                            "field": "option.status",
                            "type": "equal"
                          }
                        ],
                        "dataType": "vc-documents",
                        "schema": "#0b812688-66c7-4eb8-ba91-6c8b000a11ea",
                        "onlyOwnDocuments": true,
                        "tag": "project_grid_pp_2_rejected_projects_own",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "9b8e6559-6756-47d1-a96c-ef298f33bb20",
                        "blockType": "historyAddon",
                        "defaultActive": false,
                        "permissions": [
                          "Project Participant"
                        ],
                        "onErrorAction": "no-action",
                        "tag": "history_addon_4f31ccda-2486-4cc8-8c7b-647283e8f093",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      }
                    ],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "f0ac3c45-cb4b-447f-8500-14b070c5a7d2",
                    "blockType": "interfaceStepBlock",
                    "defaultActive": true,
                    "uiMetaData": {
                      "type": "blank"
                    },
                    "permissions": [
                      "Project Participant"
                    ],
                    "cyclic": true,
                    "onErrorAction": "no-action",
                    "tag": "new_project",
                    "children": [
                      {
                        "id": "6e733f05-bf37-46b4-a21f-dc8abff0cf4a",
                        "blockType": "requestVcDocumentBlock",
                        "defaultActive": true,
                        "permissions": [
                          "Project Participant"
                        ],
                        "uiMetaData": {
                          "privateFields": [],
                          "type": "dialog",
                          "content": "New project",
                          "dialogContent": "New project",
                          "description": "New project"
                        },
                        "idType": "UUID",
                        "schema": "#0b812688-66c7-4eb8-ba91-6c8b000a11ea",
                        "onErrorAction": "no-action",
                        "presetFields": [],
                        "stopPropagation": false,
                        "tag": "add_project_bnt",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "71ae8694-9bdf-4bcf-afec-6ebad390b889",
                        "blockType": "setRelationshipsBlock",
                        "defaultActive": false,
                        "permissions": [
                          "Project Participant"
                        ],
                        "onErrorAction": "no-action",
                        "tag": "pp_set_profile_to_project",
                        "children": [
                          {
                            "id": "d7c02df6-d139-4cb0-88f7-e35c06411491",
                            "blockType": "documentsSourceAddon",
                            "defaultActive": false,
                            "permissions": [
                              "Project Participant"
                            ],
                            "onErrorAction": "no-action",
                            "filters": [
                              {
                                "value": "approved_pp",
                                "field": "type",
                                "type": "equal"
                              },
                              {
                                "value": "Revoked",
                                "field": "option.status",
                                "type": "not_equal"
                              }
                            ],
                            "onlyOwnDocuments": true,
                            "dataType": "vc-documents",
                            "schema": "#2558d6d7-5b83-464a-9236-8f08a7257c55",
                            "tag": "pp_profile_project",
                            "children": [],
                            "events": [],
                            "artifacts": []
                          }
                        ],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "9c79ae2a-a289-40ef-ad14-86c4860ca486",
                        "blockType": "sendToGuardianBlock",
                        "defaultActive": false,
                        "permissions": [
                          "Project Participant"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {},
                        "options": [],
                        "dataSource": "hedera",
                        "documentType": "vc",
                        "topic": "Project",
                        "entityType": "project_form",
                        "stopPropagation": false,
                        "dataType": "hedera",
                        "tag": "save_project_form_pp_hedera",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "7e76c85a-6809-4e1d-9185-08e74377a001",
                        "blockType": "sendToGuardianBlock",
                        "defaultActive": false,
                        "permissions": [
                          "Project Participant"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {},
                        "options": [],
                        "dataSource": "database",
                        "documentType": "vc",
                        "topic": "Project",
                        "entityType": "project_form",
                        "stopPropagation": true,
                        "dataType": "vc-documents",
                        "tag": "save_project_form_pp",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "b7cf5288-8941-4797-8886-5a619d50058d",
                        "blockType": "sendToGuardianBlock",
                        "defaultActive": false,
                        "permissions": [
                          "Project Participant"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {},
                        "options": [
                          {
                            "name": "status",
                            "value": "Waiting for Validation"
                          }
                        ],
                        "dataSource": "hedera",
                        "documentType": "vc",
                        "topic": "Project",
                        "entityType": "project",
                        "dataType": "hedera",
                        "tag": "save_project_hedera",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "5e7f7e83-aee7-4e62-95f2-94c05c4710d3",
                        "blockType": "sendToGuardianBlock",
                        "defaultActive": false,
                        "permissions": [
                          "Project Participant"
                        ],
                        "uiMetaData": {},
                        "dataType": "vc-documents",
                        "entityType": "project",
                        "options": [
                          {
                            "name": "status",
                            "value": "Waiting for Validation"
                          }
                        ],
                        "onErrorAction": "no-action",
                        "dataSource": "database",
                        "documentType": "vc",
                        "tag": "save_project",
                        "children": [],
                        "events": [
                          {
                            "target": "project_grid_sr",
                            "source": "save_project",
                            "input": "RefreshEvent",
                            "output": "RefreshEvent",
                            "actor": "",
                            "disabled": false
                          },
                          {
                            "target": "project_grid_pp_2",
                            "source": "save_project",
                            "input": "RefreshEvent",
                            "output": "RefreshEvent",
                            "actor": "",
                            "disabled": false
                          }
                        ],
                        "artifacts": []
                      }
                    ],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "46bc0c84-cb5f-41ac-b2a5-645b0018468f",
                    "blockType": "interfaceStepBlock",
                    "defaultActive": false,
                    "uiMetaData": {
                      "type": "blank"
                    },
                    "permissions": [
                      "Project Participant"
                    ],
                    "cyclic": true,
                    "onErrorAction": "no-action",
                    "tag": "new_report",
                    "children": [
                      {
                        "id": "b3afe465-f3bb-4766-a474-fdc00a3651d0",
                        "blockType": "requestVcDocumentBlock",
                        "defaultActive": true,
                        "permissions": [
                          "Project Participant"
                        ],
                        "uiMetaData": {
                          "privateFields": [],
                          "type": "dialog",
                          "content": "Add Report",
                          "dialogContent": "Add Report",
                          "description": "",
                          "buttonClass": "link"
                        },
                        "idType": "UUID",
                        "schema": "#8b96bc47-16d4-4e02-bb32-b454387d1279",
                        "preset": true,
                        "presetFields": [
                          {
                            "name": "field0",
                            "title": "Project Details",
                            "value": "field0",
                            "readonly": false
                          },
                          {
                            "name": "field1",
                            "title": "Please select the option that applies to your project in order to calculate baseline and project emissions:",
                            "value": "field1",
                            "readonly": false
                          },
                          {
                            "name": "field6",
                            "title": "Partial BE Based on LT 17b",
                            "value": "field6",
                            "readonly": false
                          },
                          {
                            "name": "field7",
                            "title": "PE Due to Leakage of Biogas 17b",
                            "value": "field7",
                            "readonly": false
                          },
                          {
                            "name": "field4",
                            "title": "Partial BE Based on LT 17a",
                            "value": "field4",
                            "readonly": false
                          },
                          {
                            "name": "field5",
                            "title": "PE Due to Leakage of Biogas 17a",
                            "value": "field5",
                            "readonly": false
                          },
                          {
                            "name": "field2",
                            "title": "For Project emissions due to physical leakage of biogas, would you like to use the calculation method based on the AMS-III.D methodology for the calculation method from Methodological tool 14 Project and leakage emissions from anaerobic digesters?",
                            "value": "field2",
                            "readonly": false
                          },
                          {
                            "name": "field3",
                            "title": "For the calculation \"Methane captured and destroyed or used gainfully by the project activity\" is the biogas flared/combusted or recovered for power generation?",
                            "value": "field3",
                            "readonly": false
                          },
                          {
                            "name": "field11",
                            "title": "Total electricity generated from the recovered biogas in year y (MWh)",
                            "value": "field11",
                            "readonly": false
                          },
                          {
                            "name": "field12",
                            "title": "NCV of methane (MJ/Nm3)",
                            "value": "field12",
                            "readonly": false
                          },
                          {
                            "name": "field13",
                            "title": "Energy conversion efficiency of the project equipment",
                            "value": "field13",
                            "readonly": false
                          },
                          {
                            "name": "field27",
                            "title": "Conversion factor ",
                            "value": "field27",
                            "readonly": false
                          },
                          {
                            "name": "field8",
                            "title": "Biogas flared or combusted in year y (m3 )",
                            "value": "field8",
                            "readonly": false
                          },
                          {
                            "name": "field9",
                            "title": "Methane content in biogas in the year y (volume fraction)",
                            "value": "field9",
                            "readonly": false
                          },
                          {
                            "name": "field10",
                            "title": "Flare efficiency in the year y (fraction)",
                            "value": "field10",
                            "readonly": false
                          },
                          {
                            "name": "field14",
                            "title": "Project emissions on account of manure transport (AMS-III.AO)",
                            "value": "field14",
                            "readonly": false
                          },
                          {
                            "name": "field15",
                            "title": "Storage Device Registration",
                            "value": "field15",
                            "readonly": false
                          },
                          {
                            "name": "field16",
                            "title": "Tool 14",
                            "value": "field16",
                            "readonly": false
                          },
                          {
                            "name": "field28",
                            "title": "Tool 06",
                            "value": "field28",
                            "readonly": false
                          },
                          {
                            "name": "field17",
                            "title": "Baseline emissions in year y (t CO2e)",
                            "value": "field17",
                            "readonly": false
                          },
                          {
                            "name": "field18",
                            "title": "Global Warming Potential (GWP) of CH4 applicable to the crediting period (t CO2e/t CH4)",
                            "value": "field18",
                            "readonly": false
                          },
                          {
                            "name": "field19",
                            "title": "CH4 density",
                            "value": "field19",
                            "readonly": false
                          },
                          {
                            "name": "field20",
                            "title": "Model correction factor to account for model uncertainties",
                            "value": "field20",
                            "readonly": false
                          },
                          {
                            "name": "field21",
                            "title": "Project Activity Emissions ",
                            "value": "field21",
                            "readonly": false
                          },
                          {
                            "name": "field22",
                            "title": "Emission reductions achieved by the project activity based on monitored values for year y (t CO2e)",
                            "value": "field22",
                            "readonly": false
                          },
                          {
                            "name": "field23",
                            "title": "Baseline emissions calculated using equation 1 (for projects using option in paragraph",
                            "value": "field23",
                            "readonly": false
                          },
                          {
                            "name": "field24",
                            "title": "Project emissions calculated using equation 6 using ex post monitored values",
                            "value": "field24",
                            "readonly": false
                          },
                          {
                            "name": "field25",
                            "title": "Emissions from the use of fossil fuel or electricity for the operation of the installed facilities based on monitored values in the year y (t CO2e)",
                            "value": "field25",
                            "readonly": false
                          },
                          {
                            "name": "field26",
                            "title": "Methane captured and destroyed or used gainfully by the project activity in year y (t CO2e)",
                            "value": "field26",
                            "readonly": false
                          }
                        ],
                        "presetSchema": "#0b812688-66c7-4eb8-ba91-6c8b000a11ea",
                        "onErrorAction": "no-action",
                        "stopPropagation": false,
                        "tag": "add_report_bnt",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "2915a30f-4ba8-4e84-b08b-c09df6f08313",
                        "blockType": "sendToGuardianBlock",
                        "defaultActive": false,
                        "permissions": [
                          "Project Participant"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {},
                        "options": [],
                        "dataSource": "hedera",
                        "documentType": "vc",
                        "topic": "Project",
                        "entityType": "report_form",
                        "stopPropagation": false,
                        "dataType": "hedera",
                        "tag": "save_report_form_pp_hedera",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "2fc6e553-589c-40b4-817b-66488622a269",
                        "blockType": "sendToGuardianBlock",
                        "defaultActive": false,
                        "permissions": [
                          "Project Participant"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {},
                        "options": [],
                        "dataSource": "database",
                        "documentType": "vc",
                        "topic": "Project",
                        "entityType": "report_form",
                        "stopPropagation": true,
                        "dataType": "vc-documents",
                        "tag": "save_report_form_pp",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "b8b3867d-dc23-4a64-a121-0009c73061b8",
                        "blockType": "customLogicBlock",
                        "defaultActive": false,
                        "permissions": [
                          "Project Participant"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {
                          "type": "blank"
                        },
                        "expression": "function adjustValues(o) {\n  if (o === null || o === undefined) return 0;\n  if (typeof o === 'number') return (isFinite(o) ? o : 0);\n  if (typeof o === 'string') { var n = parseFloat(o); return isFinite(n) ? n : 0; }\n  if (Array.isArray(o)) { var s = 0; for (var i=0;i<o.length;i++) s += adjustValues(o[i]); return s; }\n  if (typeof o === 'object') {\n    var r = {};\n    for (var k in o) if (Object.prototype.hasOwnProperty.call(o,k)) r[k] = adjustValues(o[k]);\n    return r;\n  }\n  return 0;\n}\nfunction compute_wq_pass_rate(raw) {\n  // raw is the unflattened credentialSubject[0]; field2 is the WQ tests array.\n  // Each test record has field8 = \"Pass\" / \"Fail\" (per WHO drinking-water guidelines).\n  var arr = (raw && raw.field2) ? raw.field2 : null;\n  if (!arr || !Array.isArray(arr) || arr.length === 0) return 0;\n  var passes = 0, total = 0;\n  for (var i = 0; i < arr.length; i++) {\n    var rec = arr[i] || {};\n    var verdict = rec.field8;\n    if (verdict === undefined || verdict === null) continue;\n    total += 1;\n    if (typeof verdict === 'string' && verdict.toLowerCase().indexOf('pass') === 0) passes += 1;\n  }\n  return total > 0 ? (passes / total) : 0;\n}\nfunction calc_vmr0015(doc) {\n  var raw = doc.credentialSubject ? doc.credentialSubject[0] : doc;\n  var wq_pass_rate = compute_wq_pass_rate(raw);\n  var d = adjustValues(raw);\n  var fuel = d.field2 || {};\n  var pe   = d.field4 || {};\n  var be   = d.field5 || {};\n  var leak = d.field6 || {};\n  var BE_woody  = be.field1 || 0;\n  var BE_fossil = be.field2 || 0;\n  var BE_total  = BE_woody + BE_fossil;\n  var PE_total = (pe.field1||0) + (pe.field2||0) + (pe.field3||0) + (pe.field4||0);\n  var f_woody = fuel.field0 || 0;\n  var LE_woody  = leak.field1 || 0;\n  var LE_fossil = leak.field2 || 0;\n  var LE_total = (f_woody > 0 ? LE_woody : 0) + LE_fossil;\n  var ER_total = BE_total - PE_total - LE_total;\n  if (ER_total < 0) ER_total = 0;\n  // Hard water-quality gate (VMR0015 §B.7.4 / AMS-III.AV WHO threshold).\n  // If observed pass-rate falls below 0.95, refuse to mint regardless of upstream approvals.\n  if (wq_pass_rate < 0.95) ER_total = 0;\n  // VMR0015 §B.7 / AMS-III.AV uncertainty discount.\n  // u_def = 0.89 holds back 11% as a conservative buffer for measurement uncertainty.\n  var ER_gross = ER_total;\n  var u_def = 0.89;\n  ER_total = ER_gross * u_def;\n  d.field5 = d.field5 || {}; d.field5.field0 = BE_total;\n  d.field4 = d.field4 || {}; d.field4.field0 = PE_total;\n  d.field6 = d.field6 || {}; d.field6.field3 = LE_total;\n  d.field7 = ER_total;\n  d.u_def = u_def;\n  d.ER_gross = Math.round(ER_gross*100)/100;\n  d.wq_pass_rate = wq_pass_rate;\n  return d;\n}\ncalc_vmr0015(documents[0]);\ndocuments[0];",
                        "documentSigner": "owner",
                        "idType": "UUID",
                        "outputSchema": "#8b96bc47-16d4-4e02-bb32-b454387d1279",
                        "tag": "calculate_report_fields",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "9dd3d02d-4b34-4197-a883-be676a667c7e",
                        "blockType": "sendToGuardianBlock",
                        "defaultActive": false,
                        "permissions": [
                          "Project Participant"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {},
                        "options": [
                          {
                            "name": "status",
                            "value": "Waiting for Verification"
                          }
                        ],
                        "dataSource": "hedera",
                        "documentType": "vc",
                        "topic": "Project",
                        "entityType": "report",
                        "dataType": "hedera",
                        "tag": "save_report_form_hedera",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "845ddf8c-f311-4bc3-a5f3-aabf1ece570a",
                        "blockType": "sendToGuardianBlock",
                        "defaultActive": false,
                        "permissions": [
                          "Project Participant"
                        ],
                        "uiMetaData": {},
                        "options": [
                          {
                            "variable": "",
                            "role": "",
                            "name": "status",
                            "value": "Waiting for Verification"
                          }
                        ],
                        "dataType": "vc-documents",
                        "entityType": "report",
                        "onErrorAction": "no-action",
                        "dataSource": "database",
                        "documentType": "vc",
                        "tag": "save_report",
                        "children": [],
                        "events": [
                          {
                            "target": "project_grid_pp_2",
                            "source": "save_report",
                            "input": "RefreshEvent",
                            "output": "RefreshEvent",
                            "actor": "",
                            "disabled": false
                          },
                          {
                            "target": "report_grid_pp",
                            "source": "save_report",
                            "input": "RefreshEvent",
                            "output": "RefreshEvent",
                            "actor": "",
                            "disabled": false
                          },
                          {
                            "target": "report_grid_vvb",
                            "source": "save_report",
                            "input": "RefreshEvent",
                            "output": "RefreshEvent",
                            "actor": "",
                            "disabled": false
                          }
                        ],
                        "artifacts": []
                      }
                    ],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "b09e2874-c484-416a-be42-8fa9215b1a3d",
                    "blockType": "buttonBlock",
                    "defaultActive": false,
                    "permissions": [
                      "Project Participant"
                    ],
                    "onErrorAction": "no-action",
                    "uiMetaData": {
                      "buttons": [
                        {
                          "tag": "Button_0",
                          "name": "Revoke",
                          "type": "selector-dialog",
                          "filters": [
                            {
                              "value": "Revoked",
                              "field": "option.status",
                              "type": "not_equal"
                            }
                          ],
                          "title": "Revoke",
                          "description": "Enter revoke reason"
                        }
                      ]
                    },
                    "tag": "revoke_project_pp_btn",
                    "children": [],
                    "events": [
                      {
                        "target": "revoke_project_pp",
                        "source": "revoke_project_pp_btn",
                        "input": "RunEvent",
                        "output": "Button_0",
                        "actor": "",
                        "disabled": false
                      }
                    ],
                    "artifacts": []
                  },
                  {
                    "id": "ed4c4f7d-b460-4edf-b9a2-7ca6dcd7aeaf",
                    "blockType": "revocationBlock",
                    "defaultActive": false,
                    "permissions": [
                      "Project Participant"
                    ],
                    "onErrorAction": "no-action",
                    "tag": "revoke_project_pp",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "7b362c94-4f7e-408d-879d-f71ecf04170b",
                    "blockType": "sendToGuardianBlock",
                    "defaultActive": false,
                    "permissions": [
                      "Project Participant"
                    ],
                    "onErrorAction": "no-action",
                    "uiMetaData": {},
                    "options": [
                      {
                        "name": "status",
                        "value": "Revoked"
                      }
                    ],
                    "dataSource": "database",
                    "documentType": "document",
                    "stopPropagation": true,
                    "dataType": "vc-documents",
                    "tag": "send_revoke_project_pp",
                    "children": [],
                    "events": [
                      {
                        "target": "project_grid_pp_2",
                        "source": "send_revoke_project_pp",
                        "input": "RefreshEvent",
                        "output": "RefreshEvent",
                        "actor": "",
                        "disabled": false
                      }
                    ],
                    "artifacts": []
                  }
                ],
                "events": [],
                "artifacts": []
              },
              {
                "id": "8a74232b-f67c-421d-817b-63d35ae838c3",
                "blockType": "interfaceContainerBlock",
                "defaultActive": true,
                "uiMetaData": {
                  "title": "Monitoring Reports",
                  "type": "blank"
                },
                "permissions": [
                  "Project Participant"
                ],
                "onErrorAction": "no-action",
                "tag": "Monitoring_Reports_pp",
                "children": [
                  {
                    "id": "c5ff7659-846e-4575-bf72-d0008bebb61f",
                    "blockType": "interfaceDocumentsSourceBlock",
                    "defaultActive": true,
                    "uiMetaData": {
                      "fields": [
                        {
                          "title": "Summary",
                          "name": "document.credentialSubject.0.field0.field0",
                          "tooltip": "",
                          "type": "text"
                        },
                        {
                          "title": "Project",
                          "name": "document.credentialSubject.0.ref",
                          "tooltip": "",
                          "type": "text"
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
                          "bindGroup": "report_grid_pp_reports_waiting_for_verification",
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
                          "width": "150px"
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
                          "bindGroup": "report_grid_pp_reports_verified"
                        }
                      ]
                    },
                    "permissions": [
                      "Project Participant"
                    ],
                    "dependencies": [
                      "save_mint_status",
                      "save_reassign_report",
                      "save_report"
                    ],
                    "onErrorAction": "no-action",
                    "tag": "report_grid_pp",
                    "children": [
                      {
                        "id": "2f68d354-0135-481b-8158-0307186bd23f",
                        "blockType": "documentsSourceAddon",
                        "defaultActive": true,
                        "permissions": [
                          "Project Participant"
                        ],
                        "filters": [
                          {
                            "value": "report",
                            "field": "type",
                            "type": "equal"
                          },
                          {
                            "value": "Verified,Revoked",
                            "field": "option.status",
                            "type": "in"
                          }
                        ],
                        "dataType": "vc-documents",
                        "schema": "#8b96bc47-16d4-4e02-bb32-b454387d1279",
                        "onlyOwnDocuments": true,
                        "onErrorAction": "no-action",
                        "uiMetaData": {
                          "type": "blank",
                          "options": []
                        },
                        "type": "dropdown",
                        "tag": "report_grid_pp_reports_verified",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "b2cd4efd-10c6-429c-b1b8-22f97066d7a9",
                        "blockType": "documentsSourceAddon",
                        "defaultActive": true,
                        "permissions": [
                          "Project Participant"
                        ],
                        "filters": [
                          {
                            "value": "report",
                            "field": "type",
                            "type": "equal"
                          },
                          {
                            "value": "Waiting for Verification",
                            "field": "option.status",
                            "type": "equal"
                          }
                        ],
                        "dataType": "vc-documents",
                        "schema": "#8b96bc47-16d4-4e02-bb32-b454387d1279",
                        "onlyOwnDocuments": true,
                        "onErrorAction": "no-action",
                        "uiMetaData": {
                          "type": "blank",
                          "options": []
                        },
                        "type": "dropdown",
                        "tag": "report_grid_pp_reports_waiting_for_verification",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "6546345c-5545-4e5c-acd4-89a2b151e238",
                        "blockType": "documentsSourceAddon",
                        "defaultActive": false,
                        "permissions": [
                          "Project Participant"
                        ],
                        "uiMetaData": {
                          "type": "blank",
                          "options": []
                        },
                        "onErrorAction": "no-action",
                        "filters": [
                          {
                            "value": "report",
                            "field": "type",
                            "type": "equal"
                          },
                          {
                            "value": "REJECTED",
                            "field": "option.status",
                            "type": "equal"
                          }
                        ],
                        "dataType": "vc-documents",
                        "schema": "#8b96bc47-16d4-4e02-bb32-b454387d1279",
                        "onlyOwnDocuments": true,
                        "type": "dropdown",
                        "tag": "report_grid_pp_reports_rejected",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "a86ffa92-4143-4169-a18d-f638b857d670",
                        "blockType": "filtersAddon",
                        "defaultActive": true,
                        "permissions": [
                          "Project Participant"
                        ],
                        "uiMetaData": {
                          "options": [],
                          "content": "Project"
                        },
                        "type": "dropdown",
                        "optionValue": "document.credentialSubject.0.id",
                        "optionName": "document.credentialSubject.0.field0.field0",
                        "field": "document.credentialSubject.0.ref",
                        "canBeEmpty": false,
                        "onErrorAction": "no-action",
                        "tag": "report_by_project",
                        "children": [
                          {
                            "id": "47bf1c32-1c4c-42e7-9b1d-ea10108258a7",
                            "blockType": "documentsSourceAddon",
                            "defaultActive": true,
                            "permissions": [
                              "Project Participant"
                            ],
                            "filters": [
                              {
                                "title": "",
                                "name": "",
                                "tooltip": "",
                                "type": "equal",
                                "field": "option.status",
                                "value": "Validated"
                              },
                              {
                                "value": "approved_project",
                                "field": "type",
                                "type": "equal"
                              }
                            ],
                            "dataType": "vc-documents",
                            "schema": "#0b812688-66c7-4eb8-ba91-6c8b000a11ea",
                            "onlyOwnDocuments": true,
                            "onErrorAction": "no-action",
                            "tag": "report_grid_pp_projects",
                            "children": [],
                            "events": [],
                            "artifacts": []
                          }
                        ],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "965dd531-ffe1-4495-92c2-5e1f6444b323",
                        "blockType": "historyAddon",
                        "defaultActive": false,
                        "permissions": [
                          "Project Participant"
                        ],
                        "onErrorAction": "no-action",
                        "tag": "history_addon_1797768b-5cff-4271-a075-b47d47414f42",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      }
                    ],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "8ee024e9-b19b-4194-a2ab-72a6fca708c4",
                    "blockType": "interfaceActionBlock",
                    "defaultActive": false,
                    "permissions": [
                      "Project Participant"
                    ],
                    "uiMetaData": {
                      "options": [],
                      "content": "vvb_lifecycle"
                    },
                    "type": "dropdown",
                    "name": "document.credentialSubject.0.field0",
                    "value": "document.credentialSubject.0.id",
                    "field": "assignedTo",
                    "bindBlock": "save_assign",
                    "onErrorAction": "no-action",
                    "tag": "assign_vvb",
                    "children": [
                      {
                        "id": "89faefeb-b201-44a0-ad2d-28b7fc95be4a",
                        "blockType": "documentsSourceAddon",
                        "defaultActive": false,
                        "permissions": [
                          "Project Participant"
                        ],
                        "filters": [
                          {
                            "value": "Revoked",
                            "field": "option.status",
                            "type": "not_equal"
                          },
                          {
                            "value": "approved_vvb",
                            "field": "type",
                            "type": "equal"
                          }
                        ],
                        "dataType": "vc-documents",
                        "schema": "#5bb9d766-5fd9-4f24-82e2-8324d52264d2",
                        "onErrorAction": "no-action",
                        "tag": "assign_vvb_documents",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      }
                    ],
                    "events": [
                      {
                        "target": "save_assign",
                        "source": "assign_vvb",
                        "input": "RunEvent",
                        "output": "DropdownEvent",
                        "actor": "",
                        "disabled": false
                      },
                      {
                        "target": "save_assign",
                        "source": "assign_vvb",
                        "input": "RunEvent",
                        "output": "DropdownEvent",
                        "actor": "",
                        "disabled": false
                      }
                    ],
                    "artifacts": []
                  },
                  {
                    "id": "6d805e8d-6856-43b2-87a9-7f84afaecdab",
                    "blockType": "sendToGuardianBlock",
                    "defaultActive": false,
                    "permissions": [
                      "Project Participant"
                    ],
                    "uiMetaData": {},
                    "options": [],
                    "dataType": "vc-documents",
                    "entityType": "",
                    "onErrorAction": "no-action",
                    "dataSource": "database",
                    "documentType": "vc",
                    "stopPropagation": true,
                    "skipSaveState": true,
                    "tag": "save_assign",
                    "children": [],
                    "events": [
                      {
                        "target": "report_grid_vvb",
                        "source": "save_assign",
                        "input": "RefreshEvent",
                        "output": "RefreshEvent",
                        "actor": "",
                        "disabled": false
                      },
                      {
                        "target": "report_grid_pp",
                        "source": "save_assign",
                        "input": "RefreshEvent",
                        "output": "RefreshEvent",
                        "actor": "",
                        "disabled": false
                      }
                    ],
                    "artifacts": []
                  },
                  {
                    "id": "1f16556d-eb0c-491c-8f89-596974b047ff",
                    "blockType": "buttonBlock",
                    "defaultActive": false,
                    "permissions": [
                      "Project Participant"
                    ],
                    "uiMetaData": {
                      "type": "blank",
                      "buttons": [
                        {
                          "tag": "Button_0",
                          "name": "Revoke",
                          "type": "selector-dialog",
                          "filters": [
                            {
                              "value": "Revoked",
                              "field": "option.status",
                              "type": "not_equal"
                            }
                          ],
                          "title": "Revoke",
                          "description": "Enter revoke reason"
                        }
                      ],
                      "options": []
                    },
                    "onErrorAction": "no-action",
                    "tag": "revoke_report_pp_btn",
                    "children": [],
                    "events": [
                      {
                        "target": "revoke_report_pp",
                        "source": "revoke_report_pp_btn",
                        "input": "RunEvent",
                        "output": "Button_0",
                        "actor": "",
                        "disabled": false
                      }
                    ],
                    "artifacts": []
                  },
                  {
                    "id": "5118c152-be46-4846-9744-8bd3221c07c2",
                    "blockType": "revocationBlock",
                    "defaultActive": false,
                    "permissions": [
                      "Project Participant"
                    ],
                    "onErrorAction": "no-action",
                    "tag": "revoke_report_pp",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "2fd30639-fb87-4862-ac4b-8d44dd667630",
                    "blockType": "sendToGuardianBlock",
                    "defaultActive": false,
                    "permissions": [
                      "Project Participant"
                    ],
                    "onErrorAction": "no-action",
                    "uiMetaData": {},
                    "options": [
                      {
                        "name": "status",
                        "value": "Revoked"
                      }
                    ],
                    "dataSource": "database",
                    "documentType": "document",
                    "stopPropagation": true,
                    "dataType": "vc-documents",
                    "tag": "send_revoke_report_pp",
                    "children": [],
                    "events": [
                      {
                        "target": "tokens_grid",
                        "source": "send_revoke_report_pp",
                        "input": "RefreshEvent",
                        "output": "RefreshEvent",
                        "actor": "",
                        "disabled": false
                      },
                      {
                        "target": "vp_grid",
                        "source": "send_revoke_report_pp",
                        "input": "RefreshEvent",
                        "output": "RefreshEvent",
                        "actor": "",
                        "disabled": false
                      },
                      {
                        "target": "report_grid_vvb",
                        "source": "send_revoke_report_pp",
                        "input": "RefreshEvent",
                        "output": "RefreshEvent",
                        "actor": "",
                        "disabled": false
                      },
                      {
                        "target": "report_grid_sr",
                        "source": "send_revoke_report_pp",
                        "input": "RefreshEvent",
                        "output": "RefreshEvent",
                        "actor": "",
                        "disabled": false
                      }
                    ],
                    "artifacts": []
                  }
                ],
                "events": [],
                "artifacts": []
              },
              {
                "id": "61a2ca04-4455-484d-ba62-6e92a15760f4",
                "blockType": "interfaceContainerBlock",
                "defaultActive": true,
                "permissions": [
                  "Project Participant"
                ],
                "uiMetaData": {
                  "title": "Tokens",
                  "type": "blank"
                },
                "tag": "tokens",
                "children": [
                  {
                    "id": "090691ec-9b08-445c-9318-1914e89dca86",
                    "blockType": "interfaceDocumentsSourceBlock",
                    "defaultActive": true,
                    "permissions": [
                      "Project Participant"
                    ],
                    "uiMetaData": {
                      "fields": [
                        {
                          "title": "ID",
                          "name": "document.id",
                          "tooltip": "",
                          "type": "text"
                        },
                        {
                          "title": "Token Id",
                          "name": "document.credentialSubject.0.tokenId",
                          "tooltip": "",
                          "type": "text"
                        },
                        {
                          "title": "Amount",
                          "name": "document.credentialSubject.0.amount",
                          "tooltip": "",
                          "type": "text"
                        }
                      ]
                    },
                    "dependencies": [
                      "save_mint_status"
                    ],
                    "onErrorAction": "no-action",
                    "tag": "tokens_grid",
                    "children": [
                      {
                        "id": "0816efbe-63e2-40c2-b976-775c0704655b",
                        "blockType": "documentsSourceAddon",
                        "defaultActive": true,
                        "permissions": [
                          "Project Participant"
                        ],
                        "filters": [
                          {
                            "value": "mint",
                            "field": "type",
                            "type": "equal"
                          }
                        ],
                        "dataType": "vc-documents",
                        "onlyOwnDocuments": true,
                        "onErrorAction": "no-action",
                        "tag": "tokens_grid_tokens",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      }
                    ],
                    "events": [],
                    "artifacts": []
                  }
                ],
                "events": [],
                "artifacts": []
              }
            ],
            "events": [],
            "artifacts": []
          },
          {
            "id": "4cbd16e7-bc2c-4356-a8e0-7bf867c4f321",
            "blockType": "sendToGuardianBlock",
            "defaultActive": false,
            "permissions": [
              "Project Participant"
            ],
            "uiMetaData": {},
            "entityType": "pp",
            "dataType": "did-documents",
            "options": [],
            "onErrorAction": "no-action",
            "dataSource": "database",
            "documentType": "vc",
            "tag": "save_rejected_pp",
            "children": [],
            "events": [],
            "artifacts": []
          },
          {
            "id": "38e77315-b5d9-41b1-9055-e3bb0effc580",
            "blockType": "reassigningBlock",
            "defaultActive": false,
            "permissions": [
              "Project Participant"
            ],
            "onErrorAction": "no-action",
            "uiMetaData": {},
            "issuer": "policyOwner",
            "actor": "owner",
            "tag": "reassign_rejected_pp",
            "children": [],
            "events": [],
            "artifacts": []
          },
          {
            "id": "403fb0f3-ed7b-412f-aaba-43a84690bc2f",
            "blockType": "sendToGuardianBlock",
            "defaultActive": false,
            "permissions": [
              "Project Participant"
            ],
            "onErrorAction": "no-action",
            "uiMetaData": {},
            "options": [],
            "dataSource": "hedera",
            "documentType": "vc",
            "topic": "Project",
            "topicOwner": "",
            "entityType": "rejected_pp",
            "stopPropagation": false,
            "forceNew": false,
            "dataType": "hedera",
            "tag": "save_reassigned_rejected_pp_hedera",
            "children": [],
            "events": [],
            "artifacts": []
          },
          {
            "id": "7a83656c-5058-4440-8dd8-0b2b5033869c",
            "blockType": "sendToGuardianBlock",
            "defaultActive": false,
            "permissions": [
              "Project Participant"
            ],
            "uiMetaData": {},
            "entityType": "rejected_pp",
            "dataType": "did-documents",
            "onErrorAction": "no-action",
            "options": [],
            "dataSource": "database",
            "documentType": "vc",
            "forceNew": true,
            "tag": "save_reassigned_rejected_pp_db",
            "children": [],
            "events": [],
            "artifacts": []
          },
          {
            "id": "f63ef405-c7cc-4d57-ba29-1bb857f424e5",
            "blockType": "interfaceContainerBlock",
            "defaultActive": true,
            "permissions": [
              "Project Participant"
            ],
            "onErrorAction": "no-action",
            "uiMetaData": {
              "type": "blank"
            },
            "tag": "rewrite_pp",
            "children": [
              {
                "id": "08cdc95f-a57f-4607-b248-02fb4a2590b8",
                "blockType": "informationBlock",
                "defaultActive": true,
                "permissions": [
                  "Project Participant"
                ],
                "uiMetaData": {
                  "description": "Your application was rejected",
                  "title": "Rejected",
                  "type": "text",
                  "bindBlock": "return_vvb_btn"
                },
                "stopPropagation": true,
                "onErrorAction": "no-action",
                "tag": "pp_rejected",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "e2e62084-326b-47ee-8ed9-eeabfee53071",
                "blockType": "buttonBlock",
                "defaultActive": true,
                "permissions": [
                  "Project Participant"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {
                  "buttons": [
                    {
                      "tag": "Button_0",
                      "name": "Return",
                      "type": "selector",
                      "filters": []
                    }
                  ]
                },
                "tag": "return_pp_btn",
                "children": [],
                "events": [
                  {
                    "target": "create_pp_profile",
                    "source": "return_pp_btn",
                    "input": "RunEvent",
                    "output": "Button_0",
                    "actor": "",
                    "disabled": false
                  }
                ],
                "artifacts": []
              }
            ],
            "events": [],
            "artifacts": []
          }
        ],
        "events": [],
        "artifacts": []
      },
      {
        "id": "82ae1546-a405-4dab-b85e-f989e8288334",
        "blockType": "interfaceContainerBlock",
        "defaultActive": true,
        "uiMetaData": {
          "type": "blank"
        },
        "permissions": [
          "VVB"
        ],
        "onErrorAction": "no-action",
        "tag": "vvb_lifecycle",
        "children": [
          {
            "id": "f7100698-fb2f-4759-acfc-cf8874c8a351",
            "blockType": "interfaceStepBlock",
            "defaultActive": true,
            "uiMetaData": {
              "type": "blank"
            },
            "permissions": [
              "VVB"
            ],
            "onErrorAction": "no-action",
            "tag": "new_VVB",
            "children": [
              {
                "id": "09656ad2-7917-43fb-9a60-b749c95f6bfc",
                "blockType": "requestVcDocumentBlock",
                "defaultActive": true,
                "uiMetaData": {
                  "privateFields": [],
                  "type": "page",
                  "title": "New VVB"
                },
                "permissions": [
                  "VVB"
                ],
                "idType": "OWNER",
                "schema": "#5bb9d766-5fd9-4f24-82e2-8324d52264d2",
                "onErrorAction": "no-action",
                "presetFields": [
                  {
                    "name": "field0",
                    "title": "VVB Name",
                    "value": "field0",
                    "readonly": false
                  }
                ],
                "preset": true,
                "presetSchema": "#5bb9d766-5fd9-4f24-82e2-8324d52264d2",
                "tag": "create_new_vvb",
                "children": [
                  {
                    "id": "c1ce4251-55e2-4fa5-a865-eace5514c22f",
                    "blockType": "documentsSourceAddon",
                    "defaultActive": false,
                    "permissions": [
                      "VVB"
                    ],
                    "onErrorAction": "no-action",
                    "filters": [
                      {
                        "value": "REJECTED",
                        "field": "option.status",
                        "type": "equal"
                      }
                    ],
                    "schema": "#5bb9d766-5fd9-4f24-82e2-8324d52264d2",
                    "dataType": "vc-documents",
                    "createdOrderDirection": "DESC",
                    "onlyOwnDocuments": true,
                    "tag": "rejected_vvb_docs",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  }
                ],
                "events": [],
                "artifacts": []
              },
              {
                "id": "bd1e44a8-d758-4703-a353-310d50ed8b45",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "VVB"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "options": [
                  {
                    "name": "status",
                    "value": "Waiting for approval"
                  }
                ],
                "dataSource": "hedera",
                "documentType": "vc",
                "topic": "Project",
                "topicOwner": "",
                "entityType": "vvb",
                "dataType": "hedera",
                "tag": "save_new_approve_document_hedera",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "e0345e58-596e-402a-817d-31107681dda0",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "VVB"
                ],
                "uiMetaData": {},
                "dataType": "did-documents",
                "entityType": "vvb",
                "onErrorAction": "no-action",
                "options": [],
                "dataSource": "database",
                "documentType": "vc",
                "tag": "save_new_approve_document",
                "children": [],
                "events": [
                  {
                    "target": "vvb_grid_sr",
                    "source": "save_new_approve_document",
                    "input": "RefreshEvent",
                    "output": "RefreshEvent",
                    "actor": "",
                    "disabled": false
                  },
                  {
                    "target": "vvb_grid",
                    "source": "save_new_approve_document",
                    "input": "RefreshEvent",
                    "output": "RefreshEvent",
                    "actor": "",
                    "disabled": false
                  }
                ],
                "artifacts": []
              },
              {
                "id": "1c4766d8-2294-4dab-8dc4-18f6776844c5",
                "blockType": "informationBlock",
                "defaultActive": true,
                "permissions": [
                  "VVB"
                ],
                "uiMetaData": {
                  "title": "Waiting for approval",
                  "description": "Waiting for approval",
                  "type": "text"
                },
                "stopPropagation": true,
                "onErrorAction": "no-action",
                "tag": "wait_for_approve",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "ba9c2657-0a15-46c0-8893-5368717573b4",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "VVB"
                ],
                "uiMetaData": {},
                "entityType": "vvb",
                "dataType": "did-documents",
                "onErrorAction": "no-action",
                "options": [],
                "dataSource": "database",
                "documentType": "vc",
                "tag": "update_approve_document_status",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "b8ef0dc9-8b1b-4f7d-9f88-c1b8906b3b76",
                "blockType": "reassigningBlock",
                "defaultActive": false,
                "permissions": [
                  "VVB"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "issuer": "policyOwner",
                "actor": "owner",
                "tag": "reassign_vc_vvb",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "5938a03f-2b96-49ee-979b-4574fee81aeb",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "VVB"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "options": [],
                "dataSource": "hedera",
                "documentType": "vc",
                "topic": "Project",
                "topicOwner": "",
                "entityType": "approved_vvb",
                "stopPropagation": false,
                "forceNew": false,
                "dataType": "hedera",
                "tag": "save_vc_vvb_hedera",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "8600403d-f0e8-4222-862d-9f40f7f6753d",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "VVB"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "options": [],
                "dataSource": "database",
                "documentType": "vc",
                "topic": "Project",
                "topicOwner": "",
                "entityType": "approved_vvb",
                "stopPropagation": false,
                "forceNew": true,
                "dataType": "did-documents",
                "tag": "save_vc_vvb",
                "children": [],
                "events": [
                  {
                    "target": "vvb_grid_sr",
                    "source": "save_vc_vvb",
                    "input": "RefreshEvent",
                    "output": "RefreshEvent",
                    "actor": "",
                    "disabled": false
                  }
                ],
                "artifacts": []
              },
              {
                "id": "ee692841-a648-4285-a0bb-aecdee6f54b8",
                "blockType": "interfaceContainerBlock",
                "defaultActive": true,
                "uiMetaData": {
                  "type": "tabs"
                },
                "permissions": [
                  "VVB"
                ],
                "onErrorAction": "no-action",
                "tag": "VVB_Header",
                "children": [
                  {
                    "id": "294bb091-0f60-442a-9e2e-8c60428310d4",
                    "blockType": "interfaceContainerBlock",
                    "defaultActive": true,
                    "permissions": [
                      "VVB"
                    ],
                    "onErrorAction": "no-action",
                    "uiMetaData": {
                      "type": "blank",
                      "title": "Documents"
                    },
                    "tag": "VVB Documents",
                    "children": [
                      {
                        "id": "1fc42b29-511c-4021-8604-74a9f32338ed",
                        "blockType": "interfaceDocumentsSourceBlock",
                        "defaultActive": true,
                        "uiMetaData": {
                          "fields": [
                            {
                              "title": "Owner",
                              "name": "document.issuer",
                              "tooltip": "",
                              "type": "text"
                            },
                            {
                              "title": "Text",
                              "name": "document.credentialSubject.0.field0",
                              "tooltip": "",
                              "type": "text"
                            },
                            {
                              "title": "Operation",
                              "name": "",
                              "tooltip": "",
                              "type": "block",
                              "action": "",
                              "url": "",
                              "dialogContent": "",
                              "dialogClass": "",
                              "dialogType": "",
                              "bindBlock": "revoke_vvb_own_document_btn",
                              "bindGroup": "vvb_grid_documents"
                            },
                            {
                              "title": "Operation",
                              "name": "option.status",
                              "tooltip": "",
                              "type": "text",
                              "action": "",
                              "url": "",
                              "dialogContent": "",
                              "dialogClass": "",
                              "dialogType": "",
                              "bindBlock": "",
                              "width": "250px"
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
                            }
                          ]
                        },
                        "permissions": [
                          "VVB"
                        ],
                        "dependencies": [
                          "save_new_approve_document"
                        ],
                        "onErrorAction": "no-action",
                        "tag": "vvb_grid",
                        "children": [
                          {
                            "id": "1d852502-1598-40a4-bae6-05864605f375",
                            "blockType": "documentsSourceAddon",
                            "defaultActive": true,
                            "permissions": [
                              "VVB"
                            ],
                            "filters": [
                              {
                                "value": "vvb",
                                "field": "type",
                                "type": "in"
                              },
                              {
                                "value": "REJECTED",
                                "field": "option.status",
                                "type": "not_equal"
                              }
                            ],
                            "dataType": "vc-documents",
                            "schema": "#5bb9d766-5fd9-4f24-82e2-8324d52264d2",
                            "onErrorAction": "no-action",
                            "onlyOwnDocuments": true,
                            "tag": "vvb_grid_documents",
                            "children": [],
                            "events": [],
                            "artifacts": []
                          },
                          {
                            "id": "ccc3f351-0dac-4ea5-916d-34587d1fc08b",
                            "blockType": "documentsSourceAddon",
                            "defaultActive": false,
                            "permissions": [
                              "VVB"
                            ],
                            "onErrorAction": "no-action",
                            "filters": [
                              {
                                "value": "vvb",
                                "field": "type",
                                "type": "in"
                              },
                              {
                                "value": "REJECTED",
                                "field": "option.status",
                                "type": "equal"
                              }
                            ],
                            "dataType": "vc-documents",
                            "schema": "#5bb9d766-5fd9-4f24-82e2-8324d52264d2",
                            "onlyOwnDocuments": true,
                            "tag": "vvb_grid_documents_rejected",
                            "children": [],
                            "events": [],
                            "artifacts": []
                          },
                          {
                            "id": "53e31bf8-6479-49eb-b81c-32bff26f6a95",
                            "blockType": "historyAddon",
                            "defaultActive": false,
                            "permissions": [
                              "ANY_ROLE"
                            ],
                            "onErrorAction": "no-action",
                            "tag": "history_addon_eb2f56e0-f2d6-4288-bffe-ee08f89d60ab",
                            "children": [],
                            "events": [],
                            "artifacts": []
                          }
                        ],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "f28baaa8-0669-4fe4-9894-c1abc38e7307",
                        "blockType": "buttonBlock",
                        "defaultActive": false,
                        "permissions": [
                          "VVB"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {
                          "buttons": [
                            {
                              "tag": "Button_0",
                              "name": "Revoke",
                              "type": "selector-dialog",
                              "filters": [
                                {
                                  "value": "Revoked",
                                  "field": "option.status",
                                  "type": "not_equal"
                                }
                              ],
                              "title": "Revoke",
                              "description": "Enter revoke message"
                            }
                          ]
                        },
                        "tag": "revoke_vvb_own_document_btn",
                        "children": [],
                        "events": [
                          {
                            "target": "revoke_vvb_own_document",
                            "source": "revoke_vvb_own_document_btn",
                            "input": "RunEvent",
                            "output": "Button_0",
                            "actor": "",
                            "disabled": false
                          }
                        ],
                        "artifacts": []
                      },
                      {
                        "id": "d2fa78eb-3c4b-44d3-a4bc-103a99eada9d",
                        "blockType": "revocationBlock",
                        "defaultActive": false,
                        "permissions": [
                          "VVB"
                        ],
                        "onErrorAction": "no-action",
                        "updatePrevDoc": true,
                        "prevDocStatus": "Waiting for approval",
                        "tag": "revoke_vvb_own_document",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "5495ba90-cbd9-4a3d-8232-a2139d102553",
                        "blockType": "sendToGuardianBlock",
                        "defaultActive": false,
                        "permissions": [
                          "VVB"
                        ],
                        "uiMetaData": {},
                        "entityType": "",
                        "dataType": "vc-documents",
                        "onErrorAction": "no-action",
                        "options": [
                          {
                            "name": "status",
                            "value": "Revoked"
                          }
                        ],
                        "dataSource": "database",
                        "documentType": "document",
                        "stopPropagation": false,
                        "tag": "save_revoked_vvb_own_document",
                        "children": [],
                        "events": [
                          {
                            "target": "vvb_grid_sr",
                            "source": "save_revoked_vvb_own_document",
                            "input": "RefreshEvent",
                            "output": "RefreshEvent",
                            "actor": "",
                            "disabled": false
                          }
                        ],
                        "artifacts": []
                      },
                      {
                        "id": "035cbc61-62a0-4c55-b870-7e5fa2b41981",
                        "blockType": "switchBlock",
                        "defaultActive": false,
                        "permissions": [
                          "OWNER"
                        ],
                        "onErrorAction": "no-action",
                        "executionFlow": "firstTrue",
                        "conditions": [
                          {
                            "type": "equal",
                            "value": "true == true",
                            "actor": "owner",
                            "target": "create_new_vvb",
                            "tag": "Condition_0"
                          }
                        ],
                        "tag": "return_vvb_to_request",
                        "children": [],
                        "events": [
                          {
                            "target": "create_new_vvb",
                            "source": "return_vvb_to_request",
                            "input": "RunEvent",
                            "output": "Condition_0",
                            "actor": "",
                            "disabled": false
                          },
                          {
                            "target": "",
                            "source": "return_vvb_to_request",
                            "input": "RunEvent",
                            "output": "Condition_0",
                            "actor": "",
                            "disabled": false
                          },
                          {
                            "target": "",
                            "source": "return_vvb_to_request",
                            "input": "RunEvent",
                            "output": "Condition_0",
                            "actor": "",
                            "disabled": false
                          }
                        ],
                        "artifacts": []
                      }
                    ],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "de16e02c-134e-434d-8244-4708fd91656e",
                    "blockType": "interfaceContainerBlock",
                    "defaultActive": true,
                    "uiMetaData": {
                      "title": "Monitoring Reports",
                      "type": "blank"
                    },
                    "permissions": [
                      "VVB"
                    ],
                    "onErrorAction": "no-action",
                    "tag": "Monitoring_Reports_vvp",
                    "children": [
                      {
                        "id": "ced8d372-ede6-480d-9ad3-7e1a26e9de35",
                        "blockType": "interfaceDocumentsSourceBlock",
                        "defaultActive": true,
                        "uiMetaData": {
                          "fields": [
                            {
                              "title": "Summary",
                              "name": "document.credentialSubject.0.field0.field0",
                              "tooltip": "",
                              "type": "text"
                            },
                            {
                              "title": "Project",
                              "name": "document.credentialSubject.0.ref",
                              "tooltip": "",
                              "type": "text"
                            },
                            {
                              "title": "Status",
                              "name": "option.status",
                              "tooltip": "",
                              "type": "text",
                              "width": "200px"
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
                              "width": "250px"
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
                              "title": "Operation",
                              "name": "",
                              "tooltip": "",
                              "type": "block",
                              "width": "250px",
                              "bindGroup": "report_grid_vvb_reports(approved)",
                              "action": "",
                              "url": "",
                              "dialogContent": "",
                              "dialogClass": "",
                              "dialogType": "",
                              "bindBlock": "revoke_reassign_report_btn"
                            }
                          ]
                        },
                        "permissions": [
                          "VVB"
                        ],
                        "dependencies": [
                          "reject_report_status",
                          "save_mint_status",
                          "save_reassign_report",
                          "save_report"
                        ],
                        "onErrorAction": "no-action",
                        "tag": "report_grid_vvb",
                        "children": [
                          {
                            "id": "5e85d6e0-e919-426f-a8e3-10935148ad22",
                            "blockType": "documentsSourceAddon",
                            "defaultActive": true,
                            "permissions": [
                              "VVB"
                            ],
                            "filters": [
                              {
                                "value": "report",
                                "field": "type",
                                "type": "equal"
                              },
                              {
                                "value": "Waiting for Verification",
                                "field": "option.status",
                                "type": "equal"
                              }
                            ],
                            "dataType": "vc-documents",
                            "schema": "#8b96bc47-16d4-4e02-bb32-b454387d1279",
                            "onlyAssignDocuments": true,
                            "onErrorAction": "no-action",
                            "tag": "report_grid_vvb_reports",
                            "children": [],
                            "events": [],
                            "artifacts": []
                          },
                          {
                            "id": "2a3e65b6-13cc-418e-acba-6338cd292a2b",
                            "blockType": "documentsSourceAddon",
                            "defaultActive": false,
                            "permissions": [
                              "VVB"
                            ],
                            "onErrorAction": "no-action",
                            "filters": [
                              {
                                "value": "approved_report",
                                "field": "type",
                                "type": "equal"
                              }
                            ],
                            "uiMetaData": {
                              "type": "blank"
                            },
                            "dataType": "vc-documents",
                            "schema": "#8b96bc47-16d4-4e02-bb32-b454387d1279",
                            "onlyAssignDocuments": true,
                            "tag": "report_grid_vvb_reports(approved)",
                            "children": [],
                            "events": [],
                            "artifacts": []
                          },
                          {
                            "id": "9963981c-676c-412d-a78e-596628c0579b",
                            "blockType": "documentsSourceAddon",
                            "defaultActive": false,
                            "permissions": [
                              "VVB"
                            ],
                            "onErrorAction": "no-action",
                            "filters": [
                              {
                                "value": "rejected_report",
                                "field": "type",
                                "type": "equal"
                              }
                            ],
                            "uiMetaData": {
                              "type": "blank"
                            },
                            "dataType": "vc-documents",
                            "schema": "#8b96bc47-16d4-4e02-bb32-b454387d1279",
                            "onlyAssignDocuments": true,
                            "onlyOwnDocuments": false,
                            "tag": "report_grid_vvb_reports(rejected)",
                            "children": [],
                            "events": [],
                            "artifacts": []
                          },
                          {
                            "id": "f43b9177-1e95-42a4-85c3-b5c951acf37c",
                            "blockType": "historyAddon",
                            "defaultActive": false,
                            "permissions": [
                              "ANY_ROLE"
                            ],
                            "onErrorAction": "no-action",
                            "tag": "history_addon_a40f0da4-e982-481c-a23e-b86f7e76e770",
                            "children": [],
                            "events": [],
                            "artifacts": []
                          }
                        ],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "9c3ebe64-3614-4473-a2a3-ed4a634d1b3e",
                        "blockType": "buttonBlock",
                        "defaultActive": false,
                        "permissions": [
                          "VVB"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {
                          "buttons": [
                            {
                              "tag": "Button_0",
                              "name": "Verify",
                              "type": "selector",
                              "filters": [],
                              "field": "option.status",
                              "value": "Verified",
                              "uiClass": "btn-approve"
                            },
                            {
                              "tag": "Button_1",
                              "name": "Reject",
                              "type": "selector-dialog",
                              "filters": [],
                              "title": "Reject",
                              "description": "Enter reject reason",
                              "field": "option.status",
                              "value": "REJECTED",
                              "uiClass": "btn-reject"
                            }
                          ]
                        },
                        "tag": "approve_report_btn",
                        "children": [],
                        "events": [
                          {
                            "target": "approve_report_status",
                            "source": "approve_report_btn",
                            "input": "RunEvent",
                            "output": "Button_0",
                            "actor": "",
                            "disabled": false
                          },
                          {
                            "target": "reject_report_status",
                            "source": "approve_report_btn",
                            "input": "RunEvent",
                            "output": "Button_1",
                            "actor": "",
                            "disabled": false
                          }
                        ],
                        "artifacts": []
                      }
                    ],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "cc3d5b18-7d79-4792-b531-93fb4df23a07",
                    "blockType": "interfaceContainerBlock",
                    "defaultActive": false,
                    "permissions": [
                      "VVB"
                    ],
                    "uiMetaData": {
                      "type": "blank"
                    },
                    "onErrorAction": "no-action",
                    "tag": "mint_events",
                    "children": [
                      {
                        "id": "a6256b65-043a-4ba1-abb5-2484d0d20d01",
                        "blockType": "sendToGuardianBlock",
                        "defaultActive": false,
                        "permissions": [
                          "VVB"
                        ],
                        "uiMetaData": {},
                        "dataType": "vc-documents",
                        "entityType": "report",
                        "options": [],
                        "stopPropagation": false,
                        "onErrorAction": "no-action",
                        "dataSource": "database",
                        "documentType": "vc",
                        "tag": "approve_report_status",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "2e9d06e4-9d54-4aa8-93d8-69fefdd9326e",
                        "blockType": "reassigningBlock",
                        "defaultActive": false,
                        "permissions": [
                          "VVB"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {},
                        "tag": "reassign_report",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "c8478ed7-a2ce-4657-9115-750856394b8b",
                        "blockType": "setRelationshipsBlock",
                        "defaultActive": false,
                        "permissions": [
                          "VVB"
                        ],
                        "onErrorAction": "no-action",
                        "tag": "set_relationships_to_report_vvb",
                        "children": [
                          {
                            "id": "9209ef45-0bcb-436e-9150-0eec3af56ad8",
                            "blockType": "documentsSourceAddon",
                            "defaultActive": false,
                            "permissions": [
                              "VVB"
                            ],
                            "onErrorAction": "no-action",
                            "filters": [
                              {
                                "value": "approved_vvb",
                                "field": "type",
                                "type": "equal"
                              },
                              {
                                "value": "Revoked",
                                "field": "option.status",
                                "type": "not_equal"
                              }
                            ],
                            "onlyOwnDocuments": true,
                            "dataType": "vc-documents",
                            "schema": "#5bb9d766-5fd9-4f24-82e2-8324d52264d2",
                            "tag": "vvb_own_documents_relationships",
                            "children": [],
                            "events": [],
                            "artifacts": []
                          }
                        ],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "88510302-dd27-41ca-b78c-698ac4830502",
                        "blockType": "sendToGuardianBlock",
                        "defaultActive": false,
                        "permissions": [
                          "VVB"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {},
                        "options": [],
                        "dataSource": "hedera",
                        "documentType": "vc",
                        "topic": "Project",
                        "topicOwner": "",
                        "stopPropagation": false,
                        "entityType": "approved_report",
                        "dataType": "hedera",
                        "tag": "save_reassign_report_hedera",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "798d8cf3-0b94-4a30-b967-ab389341a49e",
                        "blockType": "sendToGuardianBlock",
                        "defaultActive": false,
                        "permissions": [
                          "VVB"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {},
                        "options": [],
                        "stopPropagation": true,
                        "dataType": "vc-documents",
                        "entityType": "approved_report",
                        "documentType": "vc",
                        "dataSource": "database",
                        "tag": "save_reassign_report",
                        "children": [],
                        "events": [
                          {
                            "target": "report_grid_sr",
                            "source": "save_reassign_report",
                            "input": "RefreshEvent",
                            "output": "RefreshEvent",
                            "actor": "",
                            "disabled": false
                          },
                          {
                            "target": "report_grid_pp",
                            "source": "save_reassign_report",
                            "input": "RefreshEvent",
                            "output": "RefreshEvent",
                            "actor": "",
                            "disabled": false
                          },
                          {
                            "target": "report_grid_vvb",
                            "source": "save_reassign_report",
                            "input": "RefreshEvent",
                            "output": "RefreshEvent",
                            "actor": "",
                            "disabled": false
                          }
                        ],
                        "artifacts": []
                      },
                      {
                        "id": "cce6f1f7-56ad-44d8-88f4-b79a9ef54e7f",
                        "blockType": "sendToGuardianBlock",
                        "defaultActive": false,
                        "permissions": [
                          "VVB"
                        ],
                        "uiMetaData": {},
                        "stopPropagation": false,
                        "entityType": "report",
                        "dataType": "vc-documents",
                        "options": [],
                        "onErrorAction": "no-action",
                        "dataSource": "database",
                        "documentType": "vc",
                        "tag": "reject_report_status",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "a327c770-1246-49b1-a7c3-abff965deeea",
                        "blockType": "reassigningBlock",
                        "defaultActive": false,
                        "permissions": [
                          "VVB"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {},
                        "tag": "reassign_rejected_report",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "7036e2b1-abc2-47c9-81c3-714b2164b150",
                        "blockType": "setRelationshipsBlock",
                        "defaultActive": false,
                        "permissions": [
                          "VVB"
                        ],
                        "onErrorAction": "no-action",
                        "tag": "set_relationships_to_rejected_vvb",
                        "children": [
                          {
                            "id": "473d7254-fc98-4afa-bf5d-aaa4090d75b8",
                            "blockType": "documentsSourceAddon",
                            "defaultActive": false,
                            "permissions": [
                              "VVB"
                            ],
                            "onErrorAction": "no-action",
                            "filters": [
                              {
                                "value": "approved_vvb",
                                "field": "type",
                                "type": "equal"
                              },
                              {
                                "value": "Revoked",
                                "field": "option.status",
                                "type": "not_equal"
                              }
                            ],
                            "onlyOwnDocuments": true,
                            "dataType": "vc-documents",
                            "schema": "#5bb9d766-5fd9-4f24-82e2-8324d52264d2",
                            "tag": "vvb_own_documents_relationships_rejected",
                            "children": [],
                            "events": [],
                            "artifacts": []
                          }
                        ],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "f7346743-4278-4626-9760-55e73a96eafa",
                        "blockType": "sendToGuardianBlock",
                        "defaultActive": false,
                        "permissions": [
                          "VVB"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {},
                        "options": [],
                        "dataSource": "hedera",
                        "documentType": "vc",
                        "topic": "Project",
                        "topicOwner": "",
                        "stopPropagation": false,
                        "entityType": "rejected_report",
                        "dataType": "hedera",
                        "tag": "save_reassign_rejected_report_hedera",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "732c2db0-2576-4006-9fe6-e9523424b31a",
                        "blockType": "sendToGuardianBlock",
                        "defaultActive": false,
                        "permissions": [
                          "VVB"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {},
                        "options": [],
                        "stopPropagation": true,
                        "dataType": "vc-documents",
                        "entityType": "rejected_report",
                        "documentType": "vc",
                        "dataSource": "database",
                        "tag": "save_reassign_rejected_report",
                        "children": [],
                        "events": [
                          {
                            "target": "report_grid_sr",
                            "source": "save_reassign_rejected_report",
                            "input": "RefreshEvent",
                            "output": "RefreshEvent",
                            "actor": "",
                            "disabled": false
                          },
                          {
                            "target": "report_grid_pp",
                            "source": "save_reassign_rejected_report",
                            "input": "RefreshEvent",
                            "output": "RefreshEvent",
                            "actor": "",
                            "disabled": false
                          },
                          {
                            "target": "report_grid_vvb",
                            "source": "save_reassign_rejected_report",
                            "input": "RefreshEvent",
                            "output": "RefreshEvent",
                            "actor": "",
                            "disabled": false
                          }
                        ],
                        "artifacts": []
                      },
                      {
                        "id": "bc73b1d4-ba6f-4c1a-acc0-fe1011f38d14",
                        "blockType": "buttonBlock",
                        "defaultActive": false,
                        "permissions": [
                          "VVB"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {
                          "buttons": [
                            {
                              "tag": "Button_0",
                              "name": "Revoke",
                              "type": "selector-dialog",
                              "filters": [
                                {
                                  "value": "Revoked",
                                  "field": "option.status",
                                  "type": "not_equal"
                                }
                              ],
                              "title": "Revoke",
                              "description": "Enter revoke message"
                            }
                          ]
                        },
                        "tag": "revoke_reassign_report_btn",
                        "children": [],
                        "events": [
                          {
                            "target": "revoke_reassign_report",
                            "source": "revoke_reassign_report_btn",
                            "input": "RunEvent",
                            "output": "Button_0",
                            "actor": "",
                            "disabled": false
                          }
                        ],
                        "artifacts": []
                      },
                      {
                        "id": "1f0b2caa-548c-4c07-a6e9-5bdce6160f13",
                        "blockType": "revocationBlock",
                        "defaultActive": false,
                        "permissions": [
                          "VVB"
                        ],
                        "onErrorAction": "no-action",
                        "updatePrevDoc": true,
                        "prevDocStatus": "Waiting for Verification",
                        "tag": "revoke_reassign_report",
                        "children": [],
                        "events": [],
                        "artifacts": []
                      },
                      {
                        "id": "18edeba9-4821-474b-935b-e0ce37a0413d",
                        "blockType": "sendToGuardianBlock",
                        "defaultActive": false,
                        "permissions": [
                          "VVB"
                        ],
                        "onErrorAction": "no-action",
                        "uiMetaData": {},
                        "options": [
                          {
                            "name": "status",
                            "value": "Revoked"
                          }
                        ],
                        "dataSource": "database",
                        "documentType": "document",
                        "stopPropagation": true,
                        "dataType": "vc-documents",
                        "tag": "save_revoke_reassign_report",
                        "children": [],
                        "events": [
                          {
                            "target": "report_grid_sr",
                            "source": "save_revoke_reassign_report",
                            "input": "RefreshEvent",
                            "output": "RefreshEvent",
                            "actor": "",
                            "disabled": false
                          },
                          {
                            "target": "report_grid_pp",
                            "source": "save_revoke_reassign_report",
                            "input": "RefreshEvent",
                            "output": "RefreshEvent",
                            "actor": "",
                            "disabled": false
                          },
                          {
                            "target": "report_grid_vvb",
                            "source": "save_revoke_reassign_report",
                            "input": "RefreshEvent",
                            "output": "RefreshEvent",
                            "actor": "",
                            "disabled": false
                          },
                          {
                            "target": "tokens_grid",
                            "source": "save_revoke_reassign_report",
                            "input": "RefreshEvent",
                            "output": "RefreshEvent",
                            "actor": "",
                            "disabled": false
                          },
                          {
                            "target": "vp_grid",
                            "source": "save_revoke_reassign_report",
                            "input": "RefreshEvent",
                            "output": "RefreshEvent",
                            "actor": "",
                            "disabled": false
                          }
                        ],
                        "artifacts": []
                      }
                    ],
                    "events": [],
                    "artifacts": []
                  }
                ],
                "events": [],
                "artifacts": []
              },
              {
                "id": "0b877fa3-2bfb-4e07-9d39-f5dd83bf1a0d",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "VVB"
                ],
                "uiMetaData": {},
                "entityType": "vvb",
                "dataType": "did-documents",
                "options": [],
                "onErrorAction": "no-action",
                "dataSource": "database",
                "documentType": "vc",
                "tag": "update_approve_document_status_2",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "8b704639-6f22-47d7-981f-4dd0e5816f52",
                "blockType": "reassigningBlock",
                "defaultActive": false,
                "permissions": [
                  "VVB"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "issuer": "policyOwner",
                "actor": "owner",
                "tag": "reassign_rejected_vvb",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "35df7de9-adb3-4c1f-bf0c-b18eca943417",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "VVB"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {},
                "options": [],
                "dataSource": "hedera",
                "documentType": "vc",
                "topic": "Project",
                "topicOwner": "",
                "entityType": "rejected_vvb",
                "stopPropagation": false,
                "forceNew": false,
                "dataType": "hedera",
                "tag": "reassign_rejected_vvb_hedera",
                "children": [],
                "events": [],
                "artifacts": []
              },
              {
                "id": "0dd87d32-3d31-418e-a741-4f6f3f97dae3",
                "blockType": "sendToGuardianBlock",
                "defaultActive": false,
                "permissions": [
                  "VVB"
                ],
                "uiMetaData": {},
                "entityType": "rejected_vvb",
                "dataType": "did-documents",
                "onErrorAction": "no-action",
                "options": [],
                "dataSource": "database",
                "documentType": "vc",
                "forceNew": true,
                "tag": "save_reassign_rejected_vvb",
                "children": [],
                "events": [
                  {
                    "target": "vvb_grid_sr",
                    "source": "save_reassign_rejected_vvb",
                    "input": "RefreshEvent",
                    "output": "RefreshEvent",
                    "actor": "",
                    "disabled": false
                  }
                ],
                "artifacts": []
              },
              {
                "id": "80b3c1a6-6e95-46aa-8f1d-38c50d2c472e",
                "blockType": "interfaceContainerBlock",
                "defaultActive": true,
                "permissions": [
                  "VVB"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {
                  "type": "blank"
                },
                "tag": "rewrite_vvb",
                "children": [
                  {
                    "id": "72a8ecd7-6060-4e66-ae97-67ba0e6b153f",
                    "blockType": "informationBlock",
                    "defaultActive": true,
                    "permissions": [
                      "VVB"
                    ],
                    "uiMetaData": {
                      "description": "Your application was rejected",
                      "title": "Rejected",
                      "type": "text",
                      "bindBlock": "return_vvb_btn"
                    },
                    "stopPropagation": true,
                    "onErrorAction": "no-action",
                    "tag": "vvb_rejected",
                    "children": [],
                    "events": [],
                    "artifacts": []
                  },
                  {
                    "id": "a0fed66a-5dda-45b1-98f6-8fa12e534651",
                    "blockType": "buttonBlock",
                    "defaultActive": true,
                    "permissions": [
                      "VVB"
                    ],
                    "onErrorAction": "no-action",
                    "uiMetaData": {
                      "buttons": [
                        {
                          "tag": "Button_0",
                          "name": "Return",
                          "type": "selector",
                          "filters": []
                        }
                      ]
                    },
                    "tag": "return_vvb_btn",
                    "children": [],
                    "events": [
                      {
                        "target": "create_new_vvb",
                        "source": "return_vvb_btn",
                        "input": "RunEvent",
                        "output": "Button_0",
                        "actor": "",
                        "disabled": false
                      }
                    ],
                    "artifacts": []
                  }
                ],
                "events": [],
                "artifacts": []
              }
            ],
            "events": [],
            "artifacts": []
          }
        ],
        "events": [],
        "artifacts": []
      }
    ],
    "events": [],
    "artifacts": []
  }
}