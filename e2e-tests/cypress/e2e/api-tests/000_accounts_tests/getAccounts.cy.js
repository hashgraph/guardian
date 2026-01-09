import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get accounts", { tags: ['accounts', 'firstPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    it("Get list of users", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Accounts,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.map(v => {
                    delete v.did;
                    delete v.parent;
                    return v;
                })).eql([
                    {
                        username: 'Installer'
                    },
                    {
                        username: 'Installer2'
                    },
                    {
                        username: 'Registrant'
                    },
                    {
                        username: 'VVB'
                    },
                    {
                        username: 'ProjectProponent'
                    }
                ]);
            });
        })
    });

    it("Get list of users without auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Accounts,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of users with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Accounts,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of users with empty auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Accounts,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of users as User - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Accounts,
                headers: {
                    authorization
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });
});