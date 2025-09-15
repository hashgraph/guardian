import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get policy labels", { tags: ['policy_labels', 'firstPool', 'all'] }, () => {
    const UserUsername = Cypress.env('User');

    let policyLabel, policy;

    before("Get policy label and policy", () => {
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

    it("Get policy labels", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.Relationships,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);

                //expect(response.body.documentsSchemas.length).eql(14);
                expect(response.body.policySchemas.length).eql(8);

                expect(response.body.policy.description).eql(policy.description);
                expect(response.body.policy.id).eql(policy.id);
                expect(response.body.policy.instanceTopicId).eql(policy.instanceTopicId);
                expect(response.body.policy.messageId).eql(policy.messageId);
                expect(response.body.policy.name).eql(policy.name);
                expect(response.body.policy.owner).eql(policy.owner);
                expect(response.body.policy.status).eql(policy.status);
                expect(response.body.policy.topicId).eql(policy.topicId);
                expect(response.body.policy.policyRoles).eql(policy.userRoles);
                expect(response.body.policy.uuid).eql(policy.uuid);
                expect(response.body.policy.version).eql(policy.version);
            });
        })
    });

    it("Get policy labels without auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.Relationships,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get policy labels with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.Relationships,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get policy labels with empty auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.Relationships,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
