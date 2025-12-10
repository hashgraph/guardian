import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Import policy label", { tags: ['policy_labels', 'firstPool', 'all'] }, () => {
    const UserUsername = Cypress.env('User');

    let policyLabel, policy;

    before("Get policy label", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.PolicyLabels,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                policyLabel = response.body.at(-1);
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    response.body.forEach(element => {
                        if (element.name == "iRec_4") {
                            policy = element;
                        }
                    })
                })
            })
        });
    })

    it("Import policy label", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.fixture("exportedLabel.label", "binary")
                .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                .then((file) => {
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.PolicyLabels + policy.id + "/" + API.ImportFile,
                        body: file,
                        headers: {
                            "content-type": "binary/octet-stream",
                            authorization,
                        },
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.SUCCESS);
                        let importedPolicyLabel = JSON.parse(new TextDecoder('utf-8').decode(response.body));
                        expect(importedPolicyLabel.id).not.eql(policyLabel.id);
                        expect(importedPolicyLabel.creator).eql(policyLabel.creator);
                        expect(importedPolicyLabel.owner).eql(policyLabel.owner);
                        expect(importedPolicyLabel.name).eql(policyLabel.name);
                        expect(importedPolicyLabel.description).eql(policyLabel.description);
                        expect(importedPolicyLabel.policyId).eql(policyLabel.policyId);
                        expect(importedPolicyLabel.policyTopicId).eql(policy.topicId);
                        expect(importedPolicyLabel.policyInstanceTopicId).eql(policy.instanceTopicId);
                        expect(importedPolicyLabel.status).eql(policyLabel.status);
                        importedPolicyLabel.config.children.forEach((child, index) => {
                            child.config.variables[0].schemaId = "";
                            policyLabel.config.children[index].config.variables[0].schemaId = "";
                        })
                        expect(importedPolicyLabel.config).eql(policyLabel.config);
                    });
                })
        })
    });

    it("Import policy label without auth - Negative", () => {
        cy.fixture("exportedLabel.label", "binary")
            .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.PolicyLabels + policy.id + "/" + API.ImportFile,
                    body: file,
                    headers: {
                        "content-type": "binary/octet-stream",
                    },
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
                });
            })
    });

    it("Import policy label with incorrect auth - Negative", () => {
        cy.fixture("exportedLabel.label", "binary")
            .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.PolicyLabels + policy.id + "/" + API.ImportFile,
                    body: file,
                    headers: {
                        "content-type": "binary/octet-stream",
                        authorization: "bearer 11111111111111111111@#$",
                    },
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
                });
            });
    })

    it("Import policy label with empty auth - Negative", () => {
        cy.fixture("exportedLabel.label", "binary")
            .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.PolicyLabels + policy.id + "/" + API.ImportFile,
                    body: file,
                    headers: {
                        "content-type": "binary/octet-stream",
                        authorization: "",
                    },
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
                });
            })
    });
});
