import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Modules", { tags: ['modules', 'thirdPool'] }, () => {
    const authorization = Cypress.env("authorization");
    let moduleId;
    const moduleName = Math.floor(Math.random() * 999) + "APIModule";

    before(() => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfAllModules,
            headers: {
                authorization,
            },
            body: {
                "name": moduleName,
                "description": moduleName,
                "menu": "show",
                "config": {
                    "blockType": "module"
                }
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.SUCCESS);
            moduleId = response.body.uuid;
        });
    });

    it("Deletes the module with the provided module ID with invalid artifact id - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.ListOfAllModules + "21231231321321321",
            headers: {
                authorization,
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.ERROR);
            expect(response.body.message).eql("Invalid module");
        });
    });

    it("Deletes the module with the provided module ID by user - Negative", () => {
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
                let accessToken = response.body.accessToken
                cy.request({
                    url: API.ApiServer + API.ListOfAllModules + moduleId,
                    method: METHOD.DELETE,
                    headers: {
                        authorization: "Bearer " + accessToken,
                    },
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.FORBIDDEN);
                });
            });
        })
    });

    it("Deletes the module with the provided module ID without auth token - Negative", () => {
        cy.request({
            url: API.ApiServer + API.ListOfAllModules + moduleId,
            method: METHOD.DELETE,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Deletes the module with the provided module ID with invalid auth token - Negative", () => {
        cy.request({
            url: API.ApiServer + API.ListOfAllModules + moduleId,
            method: METHOD.DELETE,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Deletes the module with the provided module ID with empty auth token - Negative", () => {
        cy.request({
            url: API.ApiServer + API.ListOfAllModules + moduleId,
            method: METHOD.DELETE,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Deletes the module with the provided module ID", { tags: ['smoke'] }, () => {
        cy.request({
            url: API.ApiServer + API.ListOfAllModules + moduleId,
            method: METHOD.DELETE,
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
        });
    });

    it("Deletes already deleted module - Negative", () => {
        cy.request({
            url: API.ApiServer + API.ListOfAllModules + moduleId,
            method: METHOD.DELETE,
            headers: {
                authorization,
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.ERROR);
            expect(response.body.message).eql("Invalid module");
        });
    });
});
