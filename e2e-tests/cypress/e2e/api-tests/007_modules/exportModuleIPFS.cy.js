import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Modules", { tags: ['modules', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const moduleName = Math.floor(Math.random() * 999) + "APIModuleExp";
    let moduleUuid;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
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
                moduleUuid = response.body.uuid;
            });
        })
    });

    it("Returns the Hedera message ID for the specified module published onto IPFS", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfAllModules + moduleUuid + "/" + API.ExportMessage,
                headers: {
                    authorization,
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.be.not.eql("");
            });
        })
    });

    it("Returns the Hedera message ID for the specified module published onto IPFS as User - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfAllModules + moduleUuid + "/" + API.ExportMessage,
                headers: {
                    authorization
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

    it("Returns the Hedera message ID for the specified module published onto IPFS without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules + moduleUuid + "/" + API.ExportMessage,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns the Hedera message ID for the specified module published onto IPFS with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules + moduleUuid + "/" + API.ExportMessage,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns the Hedera message ID for the specified module published onto IPFS with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules + moduleUuid + "/" + API.ExportMessage,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
