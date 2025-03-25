import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Create Policy by Wizard", { tags: ['notifications', 'firstPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const policyName = "wizardPolicyEdited";
    let policyId;

    before('Get policy id', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: {
                    authorization,
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                response.body.forEach(element => {
                    if (element.name == "wizardPolicyAsync") {
                        policyId = element.id
                    }
                })
            })
        })
    });

    it("Get policy config by wizard without auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Wizard + policyId + "/" + API.Config,
            body:
            {
                policy: {
                    name: policyName,
                    topicDescription: "",
                    description: ""
                },
                roles: [
                    "OWNER"
                ],
                schemas: [],
                trustChain: []
            },
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get policy config by wizard with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Wizard + policyId + "/" + API.Config,
            body:
            {
                policy: {
                    name: policyName,
                    topicDescription: "",
                    description: ""
                },
                roles: [
                    "OWNER"
                ],
                schemas: [],
                trustChain: []
            },
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get policy config by wizard with empty auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Wizard + policyId + "/" + API.Config,
            body:
            {
                policy: {
                    name: policyName,
                    topicDescription: "",
                    description: ""
                },
                roles: [
                    "OWNER"
                ],
                schemas: [],
                trustChain: []
            },
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get policy config by wizard", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Wizard + policyId + "/" + API.Config,
                body:
                {
                    policy: {
                        name: policyName,
                        topicDescription: "",
                        description: ""
                    },
                    roles: [
                        "OWNER"
                    ],
                    schemas: [],
                    trustChain: []
                },
                headers: {
                    authorization,
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.wizardConfig.policy.name).eql(policyName);
            });
        })
    });
});
