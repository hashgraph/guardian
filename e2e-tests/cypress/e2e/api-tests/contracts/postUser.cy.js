import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Contracts", { tags: '@contracts' },() => {
    const authorization = Cypress.env("authorization");
    let contractId;
    let userId;

    it("get contract id for user addition", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization,
            }
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            expect(resp.status).eql(STATUS_CODE.OK);
            contractId = resp.body.at(-1).contractId;
        });
    });

    it("get user id for user addition", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: 'Registrant',
                password: 'test'
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            cy.wrap(resp.body.accessToken).as("accessToken");
            cy.get("@accessToken").then((accessToken) =>{
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Profiles + "Registrant",
                    headers: {
                        "authorization": "bearer " + accessToken,
                    },
                }).then((resp) => {
                    expect(resp.status).eql(STATUS_CODE.OK);
                    userId = resp.body.hederaAccountId;
                });
            });
        });
    });

    it("user addition", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfContracts + contractId + "/user",
            headers: {
                authorization,
            },
            body: {
                "userId": userId
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            expect(resp.body).to.eq(true);
        });
    });
});
