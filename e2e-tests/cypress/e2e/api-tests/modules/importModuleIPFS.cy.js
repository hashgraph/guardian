import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Modules", { tags: ['modules', 'thirdPool'] },() => {
    const authorization = Cypress.env("authorization");

    it("Imports new module and all associated artifacts from IPFS into the local DB", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfAllModules + API.ImportMessage,
            headers: {
                authorization,
            },
            body: {
                "messageId": Cypress.env('module_for_import')
            },
            timeout: 180000
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.SUCCESS);
            expect(response.body).to.have.property("name");
            expect(response.body).to.have.property("description");
            expect(response.body).to.have.property("creator");
            expect(response.body).to.have.property("owner");
            expect(response.body.config.blockType).eql("module");
        });
    });

    it("Imports new module and all associated artifacts from IPFS into the local DB as User - Negative", () => {
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
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfAllModules + API.ImportMessage,
                    headers: {
                        authorization: accessToken
                    }, 
                    body: {
                        "messageId": Cypress.env('module_for_import')
                    },
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.FORBIDDEN);
                });
            });
        });
    });

    it("Imports new module and all associated artifacts from IPFS into the local DB without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfAllModules + API.ImportMessage,
            body: {
                "messageId": Cypress.env('module_for_import')
            },
            failOnStatusCode:false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Imports new module and all associated artifacts from IPFS into the local DB with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfAllModules + API.ImportMessage,
            headers: {
                authorization: "Bearer wqe",
            },
            body: {
                "messageId": Cypress.env('module_for_import')
            },
            failOnStatusCode:false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Imports new module and all associated artifacts from IPFS into the local DB with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfAllModules + API.ImportMessage,
            headers: {
                authorization: "",
            },
            body: {
                "messageId": Cypress.env('module_for_import')
            },
            failOnStatusCode:false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Imports new module and all associated artifacts from IPFS into the local DB with invalid message id - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfAllModules + API.ImportMessage,
            headers: {
                authorization,
            },
            body: {
                "messageId": Cypress.env('module_for_import') + "777121"
            },
            failOnStatusCode:false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.ERROR);
            expect(response.body.message).eql("Request failed with status code 400");
        });
    });

    it("Imports new module and all associated artifacts from IPFS into the local DB with empty message id - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfAllModules + API.ImportMessage,
            headers: {
                authorization,
            },
            failOnStatusCode:false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNPROCESSABLE);
            expect(response.body.message).eql("Message ID in body is empty");
        });
    });
});
