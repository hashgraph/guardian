import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context('Set Policy Themes', { tags: ['themes', 'secondPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const themeName = "ThemeAPI";

    let themeId;

    before('Get theme id', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Themes,
                headers: {
                    authorization,
                },
                timeout: 60000,
            }).then((response) => {
                themeId = response.body.at(0).id;
            });
        })
    })

    it('Set theme', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.PUT,
                url: API.ApiServer + API.Themes + themeId,
                body: {
                    "name": themeName,
                    "id": themeId,
                    "readonly": false,
                    "rules": [
                        {
                            "description": "UI Components",
                            "text": "#000",
                            "background": "#efe5fc",
                            "border": "#c396fa",
                            "shape": "0",
                            "borderWidth": "2px",
                            "filterType": "type",
                            "filterValue": [
                                "interfaceActionBlock",
                                "buttonBlock",
                                "interfaceContainerBlock",
                                "createTokenBlock",
                                "interfaceDocumentsSourceBlock",
                                "groupManagerBlock",
                                "informationBlock",
                                "multiSignBlock",
                                "reportBlock",
                                "requestVcDocumentBlock",
                                "uploadVcDocumentBlock",
                                "policyRolesBlock",
                                "interfaceStepBlock",
                                "tagsManager",
                                "tokenConfirmationBlock",
                                "externalTopicBlock",
                                "messagesReportBlock"
                            ]
                        },
                        {
                            "description": "Server Components",
                            "text": "#000",
                            "background": "#e2f9fe",
                            "border": "#7bd0e3",
                            "shape": "2",
                            "borderWidth": "2px",
                            "filterType": "type",
                            "filterValue": [
                                "aggregateDocumentBlock",
                                "calculateContainerBlock",
                                "customLogicBlock",
                                "externalDataBlock",
                                "mintDocumentBlock",
                                "reassigningBlock",
                                "httpRequestBlock",
                                "revokeBlock",
                                "revocationBlock",
                                "sendToGuardianBlock",
                                "setRelationshipsBlock",
                                "splitBlock",
                                "switchBlock",
                                "tokenActionBlock",
                                "retirementDocumentBlock",
                                "notificationBlock",
                                "extractDataBlock"
                            ]
                        },
                        {
                            "description": "Addons",
                            "text": "#000",
                            "background": "#ffeeda",
                            "border": "#f9b465",
                            "shape": "1",
                            "borderWidth": "2px",
                            "filterType": "type",
                            "filterValue": [
                                "filtersAddon",
                                "historyAddon",
                                "impactAddon",
                                "calculateMathAddon",
                                "calculateMathVariables",
                                "paginationAddon",
                                "reportItemBlock",
                                "selectiveAttributes",
                                "documentsSourceAddon",
                                "timerBlock",
                                "documentValidatorBlock",
                                "buttonBlockAddon",
                                "dropdownBlockAddon",
                                "requestVcDocumentBlockAddon",
                                "dataTransformationAddon"
                            ]
                        },
                        {
                            "description": "Default",
                            "text": "#000",
                            "background": "#fff",
                            "border": "#000",
                            "shape": "0",
                            "borderWidth": "2px",
                            "filterType": "all",
                            "filterValue": null,
                            "default": true
                        }
                    ],
                    "syntaxGroups": [
                        {
                            "id": "policy-id",
                            "color": "#3F51B5"
                        },
                        {
                            "id": "policy-name",
                            "color": "#9C27B0"
                        },
                        {
                            "id": "policy-type",
                            "color": "#795548"
                        },
                        {
                            "id": "policy-version",
                            "color": "darkgoldenrod"
                        },
                        {
                            "id": "policy-user",
                            "color": "darkolivegreen"
                        },
                        {
                            "id": "policy-tag",
                            "color": "darkslategray"
                        },
                        {
                            "id": "policy-complex",
                            "color": "orchid"
                        },
                        {
                            "id": "policy-simple",
                            "color": "midnightblue"
                        },
                        {
                            "id": "policy-date",
                            "color": "salmon"
                        },
                        {
                            "id": "policy-array",
                            "color": "darkslateblue"
                        },
                        {
                            "id": "policy-flag",
                            "color": "green"
                        },
                        {
                            "id": "policy-error",
                            "color": "crimson"
                        }
                    ]
                },
                headers: {
                    authorization,
                },
                timeout: 60000,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
            })
        });
    });

    it("Set theme without auth token - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Themes + themeId,
            body: {
                "name": themeName,
                "id": themeId,
                "readonly": false,
                "rules": [
                    {
                        "description": "UI Components",
                        "text": "#000",
                        "background": "#efe5fc",
                        "border": "#c396fa",
                        "shape": "0",
                        "borderWidth": "2px",
                        "filterType": "type",
                        "filterValue": [
                            "interfaceActionBlock",
                            "buttonBlock",
                            "interfaceContainerBlock",
                            "createTokenBlock",
                            "interfaceDocumentsSourceBlock",
                            "groupManagerBlock",
                            "informationBlock",
                            "multiSignBlock",
                            "reportBlock",
                            "requestVcDocumentBlock",
                            "uploadVcDocumentBlock",
                            "policyRolesBlock",
                            "interfaceStepBlock",
                            "tagsManager",
                            "tokenConfirmationBlock",
                            "externalTopicBlock",
                            "messagesReportBlock"
                        ]
                    },
                    {
                        "description": "Server Components",
                        "text": "#000",
                        "background": "#e2f9fe",
                        "border": "#7bd0e3",
                        "shape": "2",
                        "borderWidth": "2px",
                        "filterType": "type",
                        "filterValue": [
                            "aggregateDocumentBlock",
                            "calculateContainerBlock",
                            "customLogicBlock",
                            "externalDataBlock",
                            "mintDocumentBlock",
                            "reassigningBlock",
                            "httpRequestBlock",
                            "revokeBlock",
                            "revocationBlock",
                            "sendToGuardianBlock",
                            "setRelationshipsBlock",
                            "splitBlock",
                            "switchBlock",
                            "tokenActionBlock",
                            "retirementDocumentBlock",
                            "notificationBlock",
                            "extractDataBlock"
                        ]
                    },
                    {
                        "description": "Addons",
                        "text": "#000",
                        "background": "#ffeeda",
                        "border": "#f9b465",
                        "shape": "1",
                        "borderWidth": "2px",
                        "filterType": "type",
                        "filterValue": [
                            "filtersAddon",
                            "historyAddon",
                            "impactAddon",
                            "calculateMathAddon",
                            "calculateMathVariables",
                            "paginationAddon",
                            "reportItemBlock",
                            "selectiveAttributes",
                            "documentsSourceAddon",
                            "timerBlock",
                            "documentValidatorBlock",
                            "buttonBlockAddon",
                            "dropdownBlockAddon",
                            "requestVcDocumentBlockAddon",
                            "dataTransformationAddon"
                        ]
                    },
                    {
                        "description": "Default",
                        "text": "#000",
                        "background": "#fff",
                        "border": "#000",
                        "shape": "0",
                        "borderWidth": "2px",
                        "filterType": "all",
                        "filterValue": null,
                        "default": true
                    }
                ],
                "syntaxGroups": [
                    {
                        "id": "policy-id",
                        "color": "#3F51B5"
                    },
                    {
                        "id": "policy-name",
                        "color": "#9C27B0"
                    },
                    {
                        "id": "policy-type",
                        "color": "#795548"
                    },
                    {
                        "id": "policy-version",
                        "color": "darkgoldenrod"
                    },
                    {
                        "id": "policy-user",
                        "color": "darkolivegreen"
                    },
                    {
                        "id": "policy-tag",
                        "color": "darkslategray"
                    },
                    {
                        "id": "policy-complex",
                        "color": "orchid"
                    },
                    {
                        "id": "policy-simple",
                        "color": "midnightblue"
                    },
                    {
                        "id": "policy-date",
                        "color": "salmon"
                    },
                    {
                        "id": "policy-array",
                        "color": "darkslateblue"
                    },
                    {
                        "id": "policy-flag",
                        "color": "green"
                    },
                    {
                        "id": "policy-error",
                        "color": "crimson"
                    }
                ]
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Set theme with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Themes + themeId,
            body: {
                "name": themeName,
                "id": themeId,
                "readonly": false,
                "rules": [
                    {
                        "description": "UI Components",
                        "text": "#000",
                        "background": "#efe5fc",
                        "border": "#c396fa",
                        "shape": "0",
                        "borderWidth": "2px",
                        "filterType": "type",
                        "filterValue": [
                            "interfaceActionBlock",
                            "buttonBlock",
                            "interfaceContainerBlock",
                            "createTokenBlock",
                            "interfaceDocumentsSourceBlock",
                            "groupManagerBlock",
                            "informationBlock",
                            "multiSignBlock",
                            "reportBlock",
                            "requestVcDocumentBlock",
                            "uploadVcDocumentBlock",
                            "policyRolesBlock",
                            "interfaceStepBlock",
                            "tagsManager",
                            "tokenConfirmationBlock",
                            "externalTopicBlock",
                            "messagesReportBlock"
                        ]
                    },
                    {
                        "description": "Server Components",
                        "text": "#000",
                        "background": "#e2f9fe",
                        "border": "#7bd0e3",
                        "shape": "2",
                        "borderWidth": "2px",
                        "filterType": "type",
                        "filterValue": [
                            "aggregateDocumentBlock",
                            "calculateContainerBlock",
                            "customLogicBlock",
                            "externalDataBlock",
                            "mintDocumentBlock",
                            "reassigningBlock",
                            "httpRequestBlock",
                            "revokeBlock",
                            "revocationBlock",
                            "sendToGuardianBlock",
                            "setRelationshipsBlock",
                            "splitBlock",
                            "switchBlock",
                            "tokenActionBlock",
                            "retirementDocumentBlock",
                            "notificationBlock",
                            "extractDataBlock"
                        ]
                    },
                    {
                        "description": "Addons",
                        "text": "#000",
                        "background": "#ffeeda",
                        "border": "#f9b465",
                        "shape": "1",
                        "borderWidth": "2px",
                        "filterType": "type",
                        "filterValue": [
                            "filtersAddon",
                            "historyAddon",
                            "impactAddon",
                            "calculateMathAddon",
                            "calculateMathVariables",
                            "paginationAddon",
                            "reportItemBlock",
                            "selectiveAttributes",
                            "documentsSourceAddon",
                            "timerBlock",
                            "documentValidatorBlock",
                            "buttonBlockAddon",
                            "dropdownBlockAddon",
                            "requestVcDocumentBlockAddon",
                            "dataTransformationAddon"
                        ]
                    },
                    {
                        "description": "Default",
                        "text": "#000",
                        "background": "#fff",
                        "border": "#000",
                        "shape": "0",
                        "borderWidth": "2px",
                        "filterType": "all",
                        "filterValue": null,
                        "default": true
                    }
                ],
                "syntaxGroups": [
                    {
                        "id": "policy-id",
                        "color": "#3F51B5"
                    },
                    {
                        "id": "policy-name",
                        "color": "#9C27B0"
                    },
                    {
                        "id": "policy-type",
                        "color": "#795548"
                    },
                    {
                        "id": "policy-version",
                        "color": "darkgoldenrod"
                    },
                    {
                        "id": "policy-user",
                        "color": "darkolivegreen"
                    },
                    {
                        "id": "policy-tag",
                        "color": "darkslategray"
                    },
                    {
                        "id": "policy-complex",
                        "color": "orchid"
                    },
                    {
                        "id": "policy-simple",
                        "color": "midnightblue"
                    },
                    {
                        "id": "policy-date",
                        "color": "salmon"
                    },
                    {
                        "id": "policy-array",
                        "color": "darkslateblue"
                    },
                    {
                        "id": "policy-flag",
                        "color": "green"
                    },
                    {
                        "id": "policy-error",
                        "color": "crimson"
                    }
                ]
            },
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Set theme with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Themes + themeId,
            body: {
                "name": themeName,
                "id": themeId,
                "readonly": false,
                "rules": [
                    {
                        "description": "UI Components",
                        "text": "#000",
                        "background": "#efe5fc",
                        "border": "#c396fa",
                        "shape": "0",
                        "borderWidth": "2px",
                        "filterType": "type",
                        "filterValue": [
                            "interfaceActionBlock",
                            "buttonBlock",
                            "interfaceContainerBlock",
                            "createTokenBlock",
                            "interfaceDocumentsSourceBlock",
                            "groupManagerBlock",
                            "informationBlock",
                            "multiSignBlock",
                            "reportBlock",
                            "requestVcDocumentBlock",
                            "uploadVcDocumentBlock",
                            "policyRolesBlock",
                            "interfaceStepBlock",
                            "tagsManager",
                            "tokenConfirmationBlock",
                            "externalTopicBlock",
                            "messagesReportBlock"
                        ]
                    },
                    {
                        "description": "Server Components",
                        "text": "#000",
                        "background": "#e2f9fe",
                        "border": "#7bd0e3",
                        "shape": "2",
                        "borderWidth": "2px",
                        "filterType": "type",
                        "filterValue": [
                            "aggregateDocumentBlock",
                            "calculateContainerBlock",
                            "customLogicBlock",
                            "externalDataBlock",
                            "mintDocumentBlock",
                            "reassigningBlock",
                            "httpRequestBlock",
                            "revokeBlock",
                            "revocationBlock",
                            "sendToGuardianBlock",
                            "setRelationshipsBlock",
                            "splitBlock",
                            "switchBlock",
                            "tokenActionBlock",
                            "retirementDocumentBlock",
                            "notificationBlock",
                            "extractDataBlock"
                        ]
                    },
                    {
                        "description": "Addons",
                        "text": "#000",
                        "background": "#ffeeda",
                        "border": "#f9b465",
                        "shape": "1",
                        "borderWidth": "2px",
                        "filterType": "type",
                        "filterValue": [
                            "filtersAddon",
                            "historyAddon",
                            "impactAddon",
                            "calculateMathAddon",
                            "calculateMathVariables",
                            "paginationAddon",
                            "reportItemBlock",
                            "selectiveAttributes",
                            "documentsSourceAddon",
                            "timerBlock",
                            "documentValidatorBlock",
                            "buttonBlockAddon",
                            "dropdownBlockAddon",
                            "requestVcDocumentBlockAddon",
                            "dataTransformationAddon"
                        ]
                    },
                    {
                        "description": "Default",
                        "text": "#000",
                        "background": "#fff",
                        "border": "#000",
                        "shape": "0",
                        "borderWidth": "2px",
                        "filterType": "all",
                        "filterValue": null,
                        "default": true
                    }
                ],
                "syntaxGroups": [
                    {
                        "id": "policy-id",
                        "color": "#3F51B5"
                    },
                    {
                        "id": "policy-name",
                        "color": "#9C27B0"
                    },
                    {
                        "id": "policy-type",
                        "color": "#795548"
                    },
                    {
                        "id": "policy-version",
                        "color": "darkgoldenrod"
                    },
                    {
                        "id": "policy-user",
                        "color": "darkolivegreen"
                    },
                    {
                        "id": "policy-tag",
                        "color": "darkslategray"
                    },
                    {
                        "id": "policy-complex",
                        "color": "orchid"
                    },
                    {
                        "id": "policy-simple",
                        "color": "midnightblue"
                    },
                    {
                        "id": "policy-date",
                        "color": "salmon"
                    },
                    {
                        "id": "policy-array",
                        "color": "darkslateblue"
                    },
                    {
                        "id": "policy-flag",
                        "color": "green"
                    },
                    {
                        "id": "policy-error",
                        "color": "crimson"
                    }
                ]
            },
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
})
