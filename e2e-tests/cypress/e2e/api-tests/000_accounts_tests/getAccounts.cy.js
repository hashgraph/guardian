import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get accounts", { tags: ['accounts', 'firstPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const accountsUrl = API.ApiServer + API.Accounts;

    it("Get list of users", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: accountsUrl,
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

    const getAccounts = ({authorization, failOnStatusCode = true} = {}) =>
        cy.request({
            method: METHOD.GET,
            url: accountsUrl,
            headers: authorization ? { authorization } : {},
            failOnStatusCode,
        });

    it("Get list of users as SR", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getAccounts({ authorization }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body)
                    .to.be.an('array')
                    .and.not.be.empty;
                expect(response.body[0]).to.have.property('username');
            });
        });
    });

    it("Get list of users without auth - Negative", () => {
        getAccounts({ failOnStatusCode: false }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of users with invalid auth - Negative", () => {
        getAccounts({
            authorization: 'bearer 11111111111111111111@#$',
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of users with empty auth - Negative", () => {
        getAccounts({
            authorization: '',
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of users as regular User - Forbidden", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            getAccounts({
                authorization,
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.FORBIDDEN);
            });
        });
    });
    
});