import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Tools", { tags: ['tools', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let toolId, policy, policyId;
    const toolBlockConfigUUID = Math.floor(Math.random() * 99999).toString();

    before("Import tool", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture("toolDryRunTest.tool", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                .then((file) => {
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.ToolsImportFile,
                        body: file,
                        headers: {
                            "content-type": "binary/octet-stream",
                            authorization,
                        },
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        toolId = JSON.parse(new TextDecoder().decode(response.body)).id;
                    });
                });
        })
    })

    before("Import policy and add tool block", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture("policyForToolTest.policy", "binary")
                .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                .then((file) => {
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.PolicisImportFile,
                        body: file,
                        headers: {
                            "content-type": "binary/octet-stream",
                            authorization,
                        },
                        timeout: 18000000,
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        policyId = JSON.parse(new TextDecoder().decode(response.body)).at(0).id;
                        cy.request({
                            method: METHOD.GET,
                            url: API.ApiServer + API.Policies + policyId,
                            headers: {
                                authorization,
                            },
                        }).then((response) => {
                            policy = response.body;
                        })
                    })
                });
        })
    })

    it("Dry Run tool without auth token - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Tools + toolId + "/" + API.DryRun,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Dry Run tool with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Tools + toolId + "/" + API.DryRun,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Dry Run tool with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Tools + toolId + "/" + API.DryRun,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Dry Run tool", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.PUT,
                url: API.ApiServer + API.Tools + toolId + "/" + API.DryRun,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body.isValid).to.eq(true);
            });
        });
    })

    it("Dry Run tool for tool in Dry Run", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.PUT,
                url: API.ApiServer + API.Tools + toolId + "/" + API.DryRun,
                headers: {
                    authorization,
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.ERROR);
                expect(response.body.message).eql("Tool already in Dry Run");
            })
        });
    })

    it("Check that tool appear as policy block and include tool into policy", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ToolsAsBlock,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                response.body.forEach(element => {
                    if (element.name == "toolDryRunTest")
                        policy.config.children.at(0)["children"].splice(2, 0,
                            {
                                "id": toolBlockConfigUUID,
                                "blockType": "tool",
                                "defaultActive": true,
                                "hash": element.hash,
                                "messageId": element.messageId,
                                "permissions": [],
                                "onErrorAction": "no-action",
                                "tag": "Tool_1",
                                "children": [],
                                "events": [
                                    {
                                        "target": "save",
                                        "source": "Tool_1",
                                        "input": "RunEvent",
                                        "output": "output_tool",
                                        "actor": "",
                                        "disabled": false
                                    }
                                ],
                                "artifacts": [],
                                "variables": [],
                                "inputEvents": [
                                    {
                                        "name": "input_tool",
                                        "description": ""
                                    }
                                ],
                                "outputEvents": [
                                    {
                                        "name": "output_tool",
                                        "description": ""
                                    }
                                ],
                                "innerEvents": []
                            });
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.Policies + policyId,
                        body: policy,
                        headers: {
                            authorization,
                        },
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                        cy.request({
                            method: METHOD.PUT,
                            url:
                                API.ApiServer + API.Policies + policyId + "/" + API.DryRun,
                            headers: {
                                authorization,
                            },
                            timeout: 180000,
                        }).then((response) => {
                            expect(response.status).to.eq(STATUS_CODE.OK);
                        });
                    })
                });
            })
        });
    })
});
