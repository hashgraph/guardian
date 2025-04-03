import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Import formulas", { tags: ['formulas', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    let firstFormula;

    before("Get first formula", () => {
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
            });
        })
    });

    it("Import formulas", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture("exportedFormula.formula", "binary")
                .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                .then((file) => {
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Formulas + firstFormula.policyId + "/" + API.ImportFile,
                        body: file,
                        headers: {
                            "content-type": "binary/octet-stream",
                            authorization,
                        },
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.SUCCESS);
                        let formula = JSON.parse(new TextDecoder('utf-8').decode(response.body));
                        expect(formula).to.have.property("createDate");
                        expect(formula).to.have.property("creator");
                        expect(formula).to.have.property("description");
                        expect(formula).to.have.property("id");
                        expect(formula).to.have.property("name");
                        expect(formula).to.have.property("owner");
                        expect(formula).to.have.property("policyId");
                        expect(formula).to.have.property("policyInstanceTopicId");
                        expect(formula).to.have.property("policyTopicId");
                        expect(formula).to.have.property("status");
                        expect(formula).to.have.property("uuid");

                        expect(formula.description).eql(firstFormula.description);
                        expect(formula.name).eql(firstFormula.name);
                        expect(formula.policyId).eql(firstFormula.policyId);
                        expect(formula.policyInstanceTopicId).eql(firstFormula.policyInstanceTopicId);
                        expect(formula.policyTopicId).eql(firstFormula.policyTopicId);
                        expect(formula?.config).eql(firstFormula?.config);
                    });
                })
        })
    });

    it("Import formulas without auth - Negative", () => {
        cy.fixture("exportedFormula.formula", "binary")
            .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Formulas + firstFormula.policyId + "/" + API.ImportFile,
                    body: file,
                    headers: {
                        "content-type": "binary/octet-stream",
                    },
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
                });
            });
    });

    it("Import formulas with incorrect auth - Negative", () => {
        cy.fixture("exportedFormula.formula", "binary")
            .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Formulas + firstFormula.policyId + "/" + API.ImportFile,
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

    it("Import formulas with empty auth - Negative", () => {
        cy.fixture("exportedFormula.formula", "binary")
            .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Formulas + firstFormula.policyId + "/" + API.ImportFile,
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
    })
});
