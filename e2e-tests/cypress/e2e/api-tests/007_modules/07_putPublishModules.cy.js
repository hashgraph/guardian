import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Publish Module", { tags: ['modules', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = "APIModuleForPublish";

    let createdModule, invalidModule;

    before("Get valid and invalid modules for publish", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ListOfAllModules,
                headers: {
                    authorization,
                },
                body: {
                    "name": moduleName,
                    "description": moduleName + " desc",
                    "config": {
                        "blockType": "module"
                    }
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                createdModule = response.body;
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfAllModules,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    invalidModule = response.body.at(1);
                })
            });
        })
    });

    it("Publish the module", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.PUT,
                url: API.ApiServer + API.ListOfAllModules + createdModule.uuid + "/" + API.Publish,
                headers: {
                    authorization,
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);

                expect(response.body.errors.isValid).eql(true);
                expect(response.body.isValid).eql(true);

                expect(response.body.module.id).eql(createdModule.id);
                expect(response.body.module.codeVersion).eql(createdModule.codeVersion);
                expect(response.body.module.config).eql(createdModule.config);
                expect(response.body.module.configFileId).not.eql(createdModule.configFileId);
                expect(response.body.module.createDate).eql(createdModule.createDate);
                expect(response.body.module.creator).eql(createdModule.creator);
                expect(response.body.module.description).eql(createdModule.description);
                expect(response.body.module.id).eql(createdModule.id);
                expect(response.body.module.messageId).to.match(new RegExp("^\\d+\.\\d+$", "g"));
                expect(response.body.module.name).eql(createdModule.name);
                expect(response.body.module.owner).eql(createdModule.owner);
                expect(response.body.module.status).eql("PUBLISHED");
                expect(response.body.module.topicId).to.match(new RegExp("^0\.0\.\\d+$", "g"));
                expect(response.body.module.type).eql(createdModule.type);
                expect(response.body.module.updateDate).not.eql(createdModule.updateDate);
                expect(response.body.module.uuid).eql(createdModule.uuid);
            });
        })
    });

    it("Publish the invalid module", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.PUT,
                url: API.ApiServer + API.ListOfAllModules + invalidModule.uuid + "/" + API.Publish,
                headers: {
                    authorization,
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);

                expect(response.body.errors.isValid).eql(false);
                expect(response.body.isValid).eql(false);
            });
        })
    });

    it("Verify publish process", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfAllModules,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.at(0).status).eql("PUBLISHED");
                expect(response.body.at(1).status).eql("DRAFT");

            })
        })
    });

    it("Publish the module without auth token - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.ListOfAllModules + createdModule.uuid + "/" + API.Publish,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Publish the module with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.ListOfAllModules + createdModule.uuid + "/" + API.Publish,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Publish the module with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.ListOfAllModules + createdModule.uuid + "/" + API.Publish,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        })
    });
});
