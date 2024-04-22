import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Contracts", { tags: '@contracts' },() => {
    const authorization = Cypress.env("authorization");
    before(() => {

        const contractNameR = Math.floor(Math.random() * 999) + "RCon4GetTests";
        const contractNameW = Math.floor(Math.random() * 999) + "WCon4GetTests";

        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization,
            },
            body: {
                "description": contractNameR,
                "type": "RETIRE",
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.SUCCESS);
        });
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization,
            },
            body: {
                "description": contractNameW,
                "type": "WIPE",
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.SUCCESS);
        });
    })

    it("Get list of retire contracts", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization,
            },
            qs: {
                type: "RETIRE"
            }
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body.at(-1)).to.have.property("_id");
            expect(response.body.at(-1)).to.have.property("contractId");
            expect(response.body.at(-1)).to.have.property("type");
            expect(response.body.at(-1).type).eql("RETIRE");
            expect(response.body.at(-1)).to.have.property("description");
            expect(response.body.at(-1)).to.have.property("owner");
        });
    });

    it("Get list of wipe contracts", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization,
            },
            qs: {
                type: "WIPE"
            }
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body.at(-1)).to.have.property("_id");
            expect(response.body.at(-1)).to.have.property("contractId");
            expect(response.body.at(-1)).to.have.property("type");
            expect(response.body.at(-1).type).eql("WIPE");
            expect(response.body.at(-1)).to.have.property("description");
            expect(response.body.at(-1)).to.have.property("owner");
        });
    });

    it("Get list of contracts without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of contracts with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of contracts with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of contracts as User - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: "Registrant",
                password: "test"
            }
        }).then((response) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.AccessToken,
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                let accessToken = "Bearer " + response.body.accessToken
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfContracts,
                    headers: {
                        authorization: accessToken
                    },
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.ERROR);
                    //expect(response.status).eql(STATUS_CODE.FORBIDDEN);
                });
            });
        });
    });
});
