import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Update policy labels", { tags: ['policy_labels', 'firstPool', 'all'] }, () => {
    const UserUsername = Cypress.env('User');
    const labelConfigUUID = Math.floor(Math.random() * 99999).toString();

    let policyLabel, issueSchema;

    before("Get policy label id", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.PolicyLabels,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                policyLabel = response.body.at(0);
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.Relationships,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    issueSchema = response.body.policySchemas.at(2);
                    cy.request({
                        method: METHOD.GET,
                        url: API.ApiServer + API.PolicyLabels + policyLabel.id,
                        headers: {
                            authorization,
                        },
                    }).then((response) => {
                        policyLabel = response.body;
                    })
                });
            })
        });
    })

    it("Update policy labels", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            policyLabel.config.children = [{
                config: {
                    variables: [
                        {
                            id: "A1",
                            schemaId: `#${issueSchema.uuid}&${issueSchema.version}`,
                            path: "field7",
                            schemaName: "I-REC Issue Request",
                            schemaPath: "Total kWh Produced in this period",
                            fieldType: "number",
                            fieldArray: false,
                            fieldRef: false,
                            fieldDescription: "Total kWh Produced in this period",
                            fieldProperty: null
                        }
                    ],
                    formulas: [
                        {
                            id: "C1",
                            type: "number",
                            description: "valid",
                            formula: "A1",
                            rule: {
                                type: "range",
                                min: 1,
                                max: 15
                            }
                        }
                    ],
                    scores: []
                },
                id: labelConfigUUID,
                name: "Rules",
                tag: "rules",
                title: "Rules",
                type: "rules"
            }];
            cy.request({
                method: METHOD.PUT,
                url: API.ApiServer + API.PolicyLabels + policyLabel.id,
                body: policyLabel,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                policyLabel.config.children[0].config.variables[0].fieldPropertyName = "";
                policyLabel.config.children[0].config.variables[0].fieldProperty = "";
                policyLabel.config.children[0].schemaId = "";

                expect(response.body.id).eql(policyLabel.id);
                expect(response.body.creator).eql(policyLabel.creator);
                expect(response.body.owner).eql(policyLabel.owner);
                expect(response.body.name).eql(policyLabel.name);
                expect(response.body.description).eql(policyLabel.description);
                expect(response.body.policyId).eql(policyLabel.policyId);
                expect(response.body.policyTopicId).eql(policyLabel.policyTopicId);
                expect(response.body.policyInstanceTopicId).eql(policyLabel.policyInstanceTopicId);
                expect(response.body.status).eql(policyLabel.status);
                expect(response.body.config).eql(policyLabel.config);
            });
        })
    });

    it("Update policy labels without auth - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.PolicyLabels + policyLabel.id,
            body: policyLabel,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Update policy labels with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.PolicyLabels + policyLabel.id,
            body: policyLabel,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Update policy labels with empty auth - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.PolicyLabels + policyLabel.id,
            body: policyLabel,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
