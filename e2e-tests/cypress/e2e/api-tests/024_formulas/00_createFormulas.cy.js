import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Create formulas", { tags: ['formulas', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const formulaName = "testFormulaAPI";

    let policyId, policyTopicId, policyInstanceTopicId, policy;

    before("Get policy ids", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
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
                        policyId = response.body.at(0).id;
                        policyTopicId = response.body.at(0).topicId;
                        policyInstanceTopicId = response.body.at(0).instanceTopicId;
                    }
                })
            });
        });
    })

    it("Create formulas", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Formulas,
                body: {
                    name: formulaName,
                    description: formulaName + " desc",
                    policy,
                    policyTopicId,
                    policyInstanceTopicId
                },
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                expect(response.body).to.have.property("createDate");
                expect(response.body).to.have.property("creator");
                expect(response.body).to.have.property("description");
                expect(response.body).to.have.property("id");
                expect(response.body).to.have.property("name");
                expect(response.body).to.have.property("owner");
                expect(response.body).to.have.property("policyId");
                expect(response.body).to.have.property("policyInstanceTopicId");
                expect(response.body).to.have.property("policyTopicId");
                expect(response.body).to.have.property("status");
                expect(response.body).to.have.property("uuid");

                expect(response.body.description).eql(formulaName + " desc");
                expect(response.body.name).eql(formulaName);
                expect(response.body.policyId).eql(policyId);
                expect(response.body.policyInstanceTopicId).eql(policyInstanceTopicId);
                expect(response.body.policyTopicId).eql(policyTopicId);
            });
        })
    });

    it("Create formulas without auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Formulas,
            body: {
                name: formulaName,
                description: formulaName + " desc",
                policyId,
                policyTopicId,
                policyInstanceTopicId
            },
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create formulas with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Formulas,
            body: {
                name: formulaName,
                description: formulaName + " desc",
                policyId,
                policyTopicId,
                policyInstanceTopicId
            },
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create formulas with empty auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Formulas,
            body: {
                name: formulaName,
                description: formulaName + " desc",
                policyId,
                policyTopicId,
                policyInstanceTopicId
            },
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
