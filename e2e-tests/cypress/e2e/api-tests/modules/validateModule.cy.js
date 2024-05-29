import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Modules", { tags: '@modules' }, () => {
    const authorization = Cypress.env("authorization");
    const moduleName = Math.floor(Math.random() * 999) + "APIModule";
    let moduleUuid, moduleConfiguration;
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
                    "blockType": "module",
                    "tag": "Module",
                    "name": moduleName,
                    "description": moduleName,
                    "id": "b7bb3805-e7e4-4723-8586-2f987bb4eac8"
                }
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.SUCCESS);
            moduleUuid = response.body.uuid
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfAllModules + moduleUuid,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                moduleConfiguration = response.body;
                delete moduleConfiguration["configFileId"];
                delete moduleConfiguration["type"];
                delete moduleConfiguration["updateDate"];
                delete moduleConfiguration["_id"];
            });
        });
    });

    it("Validates selected module", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfAllModules + API.Validate,
            headers: {
                authorization,
            },
            body: moduleConfiguration,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
        });
    });

    it("Validates selected module without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules + API.Validate,
            body: {
                moduleConfiguration
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Validates selected module with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules + API.Validate,
            headers: {
                authorization: "Bearer wqe",
            },
            body: {
                moduleConfiguration
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Validates selected module with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules + API.Validate,
            headers: {
                authorization: "",
            },
            body: {
                moduleConfiguration
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
