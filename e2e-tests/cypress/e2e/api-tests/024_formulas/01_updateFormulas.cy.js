import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Update formula", { tags: ['formulas', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    let firstFormula;

    before("Get first formula and prepare updated formula", () => {
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
                firstFormula.name = firstFormula.name + "Edited";
                firstFormula.config = {
                    formulas: [
                        {
                            description: "testLink desc",
                            name: `testLink`,
                            type: "variable",
                            uuid: Math.floor(Math.random() * 99999),
                            link: {
                                item: "field0",
                                type: "schema",
                                entityId: ``
                            }
                        }
                    ],
                    files: []
                };
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Formulas + firstFormula.id + "/" + API.Relationships,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    firstFormula.config.formulas[0].link.entityId = `#${response.body.schemas[0].uuid}&${response.body.schemas[0].version}`;
                });
            });
        })
    });

    it("Update formula", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.PUT,
                url: API.ApiServer + API.Formulas + firstFormula.id,
                body: firstFormula,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
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

                expect(response.body.description).eql(firstFormula.description);
                expect(response.body.name).eql(firstFormula.name);
                expect(response.body.policyId).eql(firstFormula.policyId);
                expect(response.body.policyInstanceTopicId).eql(firstFormula.policyInstanceTopicId);
                expect(response.body.policyTopicId).eql(firstFormula.policyTopicId);
                expect(response.body?.config).eql(firstFormula?.config);
            });
        })
    });

    it("Update formula without auth - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Formulas + firstFormula.id,
            body: firstFormula,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Update formula with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Formulas + firstFormula.id,
            body: firstFormula,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Update formula with empty auth - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Formulas + firstFormula.id,
            body: firstFormula,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
