import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get roles", { tags: ['permissions', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it("Get all roles", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Permissions + API.Roles,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                response.body.forEach(item => {
                    expect(item).to.have.property("createDate");
                    expect(item).to.have.property("default");
                    expect(item).to.have.property("id");
                    expect(item).to.have.property("name");
                    expect(item).to.have.property("owner");
                    expect(item).to.have.property("permissions");
                    expect(item).to.have.property("readonly");
                    expect(item).to.have.property("uuid");
                    expect(item).to.have.property("updateDate");
                });
            });
        })
    });

    it("Get all roles without auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Permissions + API.Roles,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get all roles with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Permissions + API.Roles,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get all roles with empty auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Permissions + API.Roles,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
