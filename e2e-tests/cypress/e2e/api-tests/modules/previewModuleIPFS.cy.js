import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Modules", { tags: '@modules' },() => {
    const authorization = Cypress.env("authorization");

    it("Previews the module from IPFS without loading it into the local DB", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ModuleImportMessagePreview,
            headers: {
                authorization,
            },
            body: {
                "messageId": Cypress.env('module_for_import')
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body.module).to.have.property("name");
            expect(response.body.module).to.have.property("description");
            expect(response.body.module).to.have.property("creator");
            expect(response.body.module).to.have.property("owner");
            expect(response.body.module.config.blockType).eql("module");
        });
    });

    it("Previews the module from IPFS without loading it into the local DB as User - Negative", () => {
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
                    url: API.ApiServer + API.ModuleImportMessagePreview,
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

    it("Previews the module from IPFS without loading it into the local DB without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ModuleImportMessagePreview,
            body: {
                "messageId": Cypress.env('module_for_import')
            },
            failOnStatusCode:false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Previews the module from IPFS without loading it into the local DB with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ModuleImportMessagePreview,
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

    it("Previews the module from IPFS without loading it into the local DB with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ModuleImportMessagePreview,
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

    it("Previews the module from IPFS without loading it into the local DB with invalid message id - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ModuleImportMessagePreview,
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

    it("Previews the module from IPFS without loading it into the local DB with empty message id - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ModuleImportMessagePreview,
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
