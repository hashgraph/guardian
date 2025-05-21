import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get roles", { tags: ['permissions', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it("Get users permissions", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Permissions + API.Users,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                response.body.forEach(item => {expect(response.status).eql(STATUS_CODE.OK);
                    expect(item).to.have.property("did");
                    expect(item).to.have.property("hederaAccountId");
                    expect(item).to.have.property("id");
                    expect(item).to.have.property("permissions");
                    expect(item).to.have.property("permissionsGroup");
                    expect(item).to.have.property("role");
                    expect(item).to.have.property("username");
                    expect(item.permissionsGroup.at(0)).to.have.property("owner");
                    expect(item.permissionsGroup.at(0)).to.have.property("roleId");
                    expect(item.permissionsGroup.at(0)).to.have.property("roleName");
                    expect(item.permissionsGroup.at(0)).to.have.property("uuid");
                });
            });
        })
    });

    it("Get users permissions without auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Permissions + API.Users,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get users permissions with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Permissions + API.Users,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get users permissions with empty auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Permissions + API.Users,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
