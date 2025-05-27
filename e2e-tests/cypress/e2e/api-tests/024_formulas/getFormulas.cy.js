import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get formulas", { tags: ['formulas', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    let firstFormula;

    it("Get formulas", () => {
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
                response.body.forEach(item => {
                    expect(item).to.have.property("creator");
                    expect(item).to.have.property("description");
                    expect(item).to.have.property("id");
                    expect(item).to.have.property("name");
                    expect(item).to.have.property("owner");
                    expect(item).to.have.property("policyId");
                    expect(item).to.have.property("policyInstanceTopicId");
                    expect(item).to.have.property("policyTopicId");
                    expect(item).to.have.property("status");
                });
            });
        })
    });

    it("Get formulas without auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Formulas,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get formulas with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Formulas,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get formulas with empty auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Formulas,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get formulas by policy id", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Formulas,
                qs: {
                    policyId: firstFormula.policyId
                },
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                response.body.forEach(item => {
                    expect(item).to.have.property("creator");
                    expect(item).to.have.property("description");
                    expect(item).to.have.property("id");
                    expect(item).to.have.property("name");
                    expect(item).to.have.property("owner");
                    expect(item).to.have.property("policyId");
                    expect(item).to.have.property("policyInstanceTopicId");
                    expect(item).to.have.property("policyTopicId");
                    expect(item).to.have.property("status");
                    expect(item.policyId).eql(firstFormula.policyId);
                });
            });
        })
    });

    it("Get formulas by policy id without auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Formulas,
            qs: {
                policyId: firstFormula.policyId
            },
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get formulas by policy id with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Formulas,
            qs: {
                policyId: firstFormula.policyId
            },
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get formulas by policy id with empty auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Formulas,
            qs: {
                policyId: firstFormula.policyId
            },
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get formula", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Formulas + firstFormula.id,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.have.property("createDate");
                expect(response.body).to.have.property("updateDate");
                expect(response.body).to.have.property("uuid");
                expect(response.body.creator).eql(firstFormula.creator);
                expect(response.body.description).eql(firstFormula.description);
                expect(response.body.id).eql(firstFormula.id);
                expect(response.body.name).eql(firstFormula.name);
                expect(response.body.owner).eql(firstFormula.owner);
                expect(response.body.policyId).eql(firstFormula.policyId);
                expect(response.body.policyInstanceTopicId).eql(firstFormula.policyInstanceTopicId);
                expect(response.body.policyTopicId).eql(firstFormula.policyTopicId);
                expect(response.body.status).eql(firstFormula.status);
            });
        });
    })

    it("Get formula without auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Formulas + firstFormula.id,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get formula with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Formulas + firstFormula.id,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get formula with empty auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Formulas + firstFormula.id,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
