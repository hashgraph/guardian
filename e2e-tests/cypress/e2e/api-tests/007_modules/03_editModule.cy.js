import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Edit Module", { tags: ['modules', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const tagBlock = "APIBlockModule1";
    const tagBlock2 = "APIBlockModule2";

    let lastModule, moduleForCompare;

    before("Prepare JSON with edited module", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfAllModules,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfAllModules + response.body.at(0).uuid,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    lastModule = response.body;
                    moduleForCompare = JSON.parse(JSON.stringify(lastModule));
                    delete lastModule.configFileId;
                    delete lastModule.type;
                    delete lastModule.updateDate;
                    delete lastModule._id;
                    lastModule.config.description = lastModule.description;
                    lastModule.config.id = Math.floor(Math.random() * 99999);
                    lastModule.config.name = lastModule.name;
                    lastModule.config.tag = "Module";
                    lastModule.config.children = [
                        {
                            artifacts: [],
                            blockType: "interfaceActionBlock",
                            children: [],
                            defaultActive: true,
                            events: [],
                            id: Math.floor(Math.random() * 99999),
                            permissions: [],
                            tag: tagBlock
                        },
                        {
                            artifacts: [],
                            blockType: "interfaceActionBlock",
                            children: [],
                            defaultActive: true,
                            events: [],
                            id: Math.floor(Math.random() * 99999),
                            permissions: [],
                            tag: tagBlock2
                        }]
                })
            })
        })
    });

    it("Edit module", { tags: ['analytics'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.PUT,
                url: API.ApiServer + API.ListOfAllModules + lastModule.uuid,
                body: lastModule,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);

                expect(response.body._id).eql(moduleForCompare._id);
                expect(response.body.codeVersion).eql(moduleForCompare.codeVersion);
                expect(response.body.createDate).eql(moduleForCompare.createDate);
                expect(response.body.creator).eql(moduleForCompare.creator);
                expect(response.body.description).eql(moduleForCompare.description);
                expect(response.body.id).eql(moduleForCompare.id);
                expect(response.body.name).eql(moduleForCompare.name);
                expect(response.body.owner).eql(moduleForCompare.owner);
                expect(response.body.status).eql(moduleForCompare.status);
                expect(response.body.type).eql(moduleForCompare.type);
                expect(response.body.uuid).eql(moduleForCompare.uuid);

                expect(response.body.config).eql(lastModule.config);

                expect(response.body.configFileId).not.eql(moduleForCompare.configFileId);
                expect(response.body.updateDate).not.eql(moduleForCompare.updateDate);
            })
        })
    });

    it("Edit module without auth token - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.ListOfAllModules + lastModule.uuid,
            body: lastModule,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Edit module with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.ListOfAllModules + lastModule.uuid,
            body: lastModule,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Edit module with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.ListOfAllModules + lastModule.uuid,
            body: lastModule,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        })
    });
});