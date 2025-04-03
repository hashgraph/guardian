import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get formula data", { tags: ['formulas', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    let firstFormula, documentId;

    before("Get policy, document and schema id", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Formulas,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                firstFormula = response.body.at(0);
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + firstFormula.policyId + "/" + API.GetApplications,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    documentId = response.body.data.at(0).id;
                });
            });
        })
    });

    it("Get formula data", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Formulas + API.Data,
                body: {
                    documentId,
                    policyId: firstFormula.policyId,
                    schemaId: firstFormula.config.formulas.at(0).link.entityId
                },
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                expect(response.body).to.have.property("document");
                expect(response.body).to.have.property("relationships");
                expect(response.body).to.have.property("schemas");
                expect(response.body.formulas.at(0).config).eql(firstFormula.config);
                expect(response.body.formulas.at(0).creator).eql(firstFormula.creator);
                expect(response.body.formulas.at(0).id).eql(firstFormula.id);
                expect(response.body.formulas.at(0).description).eql(firstFormula.description);
                expect(response.body.formulas.at(0).name).eql(firstFormula.name);
                expect(response.body.formulas.at(0).owner).eql(firstFormula.owner);
                expect(response.body.formulas.at(0).policyId).eql(firstFormula.policyId);
                expect(response.body.formulas.at(0).policyInstanceTopicId).eql(firstFormula.policyInstanceTopicId);
                expect(response.body.formulas.at(0).policyTopicId).eql(firstFormula.policyTopicId);
                expect(response.body.formulas.at(0).status).eql(firstFormula.status);
                expect(response.body.formulas.at(0).status).eql(firstFormula.status);
            });
        })
    });

    it("Get formula data without auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Formulas + API.Data,
            body: {
                documentId,
                policyId: firstFormula.policyId,
                schemaId: firstFormula.config.formulas.at(0).link.entityId
            },
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get formula data with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Formulas + API.Data,
            body: {
                documentId,
                policyId: firstFormula.policyId,
                schemaId: firstFormula.config.formulas.at(0).link.entityId
            },
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get formula data with empty auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Formulas + API.Data,
            body: {
                documentId,
                policyId: firstFormula.policyId,
                schemaId: firstFormula.config.formulas.at(0).link.entityId
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
