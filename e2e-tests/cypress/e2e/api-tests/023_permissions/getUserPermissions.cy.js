import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get user's permissions", { tags: ['permissions', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');


    it("Get permission for user", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Permissions + API.Users + UserUsername,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.have.property("did");
                expect(response.body).to.have.property("hederaAccountId");
                expect(response.body).to.have.property("id");
                expect(response.body).to.have.property("parent");
                expect(response.body).to.have.property("permissions");
                expect(response.body).to.have.property("permissionsGroup");
                expect(response.body).to.have.property("role");
                expect(response.body).to.have.property("username");
                expect(response.body.role).eql("USER");
                expect(response.body.username).eql(UserUsername);
                expect(response.body.permissionsGroup.at(0)).to.have.property("owner");
                expect(response.body.permissionsGroup.at(0)).to.have.property("roleId");
                expect(response.body.permissionsGroup.at(0)).to.have.property("roleName");
                expect(response.body.permissionsGroup.at(0)).to.have.property("uuid");
                expect(response.body.permissionsGroup.at(0).roleName).eql("Default policy user");
            });
        })
    });

    it("Get permission for user without auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Permissions + API.Users + UserUsername,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get permission for user with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Permissions + API.Users + UserUsername,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get permission for user with empty auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Permissions + API.Users + UserUsername,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
