import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Delete formula", { tags: ['formulas', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    let firstFormulaId;

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
                firstFormulaId = response.body.at(0).id;
            });
        })
    });

    it("Delete formula", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.Formulas + firstFormulaId,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
            });
        })
    });

    it("Delete formula without auth - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.Formulas + firstFormulaId,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete formula with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.Formulas + firstFormulaId,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete formula with empty auth - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.Formulas + firstFormulaId,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
