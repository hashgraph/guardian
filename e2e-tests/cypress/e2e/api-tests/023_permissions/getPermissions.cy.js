import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get permissions", { tags: ['permissions', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it("Get all permissions", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Permissions,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                response.body.forEach(item => {
                    expect(item).to.have.property("action");
                    expect(item).to.have.property("category");
                    expect(item).to.have.property("disabled");
                    expect(item).to.have.property("entity");
                    expect(item).to.have.property("name");
                    expect(item.disabled).eql(false);
                });
            });
        })
    });

    it("Get all permissions without auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Permissions,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get all permissions with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Permissions,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get all permissions with empty auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Permissions,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
