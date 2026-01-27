
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Delete Module", { tags: ['modules', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const moduleName = Math.floor(Math.random() * 999) + "APIModule";

    const modulesUrl = `${API.ApiServer}${API.ListOfAllModules}`;

    let moduleId;

    const postModuleWithAuth = (authorization, body) =>
        cy.request({
            method: METHOD.POST,
            url: modulesUrl,
            headers: { authorization },
            body,
        });

    const deleteModuleWithAuth = (authorization, uuid, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.DELETE,
            url: modulesUrl + uuid,
            headers: { authorization },
            failOnStatusCode,
        });

    const deleteModuleWithoutAuth = (uuid, headers = {}) =>
        cy.request({
            method: METHOD.DELETE,
            url: modulesUrl + uuid,
            headers,
            failOnStatusCode: false,
        });

    const listModulesWithAuth = (authorization) =>
        cy.request({
            method: METHOD.GET,
            url: modulesUrl,
            headers: { authorization },
        });

    before("Create module for delete", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            postModuleWithAuth(authorization, {
                name: moduleName,
                description: moduleName,
                config: { blockType: "module" },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                moduleId = response.body.uuid;
            });
        });
    });

    it("Deletes the module with the provided module ID with invalid artifact id - Negative", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            deleteModuleWithAuth(authorization, "21231231321321321", false).then((response) => {
                expect(response.status).eql(STATUS_CODE.ERROR);
                expect(response.body.message).eql("Invalid module");
            });
        });
    });

    it("Deletes the module with the provided module ID without auth token - Negative", () => {
        deleteModuleWithoutAuth(moduleId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Deletes the module with the provided module ID with invalid auth token - Negative", () => {
        deleteModuleWithoutAuth(moduleId, { authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Deletes the module with the provided module ID with empty auth token - Negative", () => {
        deleteModuleWithoutAuth(moduleId, { authorization: "" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Deletes the module with the provided module ID by user", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            deleteModuleWithAuth(authorization, moduleId, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

    it("Deletes the module with the provided module ID", { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            deleteModuleWithAuth(authorization, moduleId).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
            });
        });
    });

    it("Verify deletion", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            listModulesWithAuth(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                response.body.forEach(item => {
                    if (item.name === moduleName) throw new Error("Deleted module exist!");
                });
            });
        });
    });

    it("Deletes already deleted module - Negative", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            deleteModuleWithAuth(authorization, moduleId, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.ERROR);
                expect(response.body.message).eql("Invalid module");
            });
        });
    });

});
