import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get Module", { tags: ['modules', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = "FirstAPIModule";

    let lastModule, did;

    before("Get module id and did", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfAllModules,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                lastModule = response.body.at(0);
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Profiles + SRUsername,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    did = response.body.did;
                })
            })
        })
    });

    it("Get module", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfAllModules + lastModule.uuid,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);

                expect(response.body.config).to.have.property("artifacts");
                expect(response.body.config).to.have.property("children");
                expect(response.body.config).to.have.property("events");
                expect(response.body.config).to.have.property("innerEvents");
                expect(response.body.config).to.have.property("inputEvents");
                expect(response.body.config).to.have.property("outputEvents");
                expect(response.body.config).to.have.property("permissions");
                expect(response.body.config).to.have.property("variables");
                expect(response.body).to.have.property("configFileId");
                expect(response.body).to.have.property("createDate");
                expect(response.body).to.have.property("updateDate");

                expect(response.body.codeVersion).eql("1.0.0");
                expect(response.body.config.blockType).eql("module");
                expect(response.body.creator).eql(did);
                expect(response.body.description).eql(moduleName + " desc");
                expect(response.body.name).eql(moduleName);
                expect(response.body.owner).eql(did);
                expect(response.body.status).eql("DRAFT");
                expect(response.body.type).eql("CUSTOM");
                expect(response.body.uuid).eql(lastModule.uuid);
                expect(response.body.id).eql(lastModule.id);
                expect(response.body._id).eql(lastModule._id);
            })
        })
    });

    it("Get module without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules + lastModule.uuid,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Get module with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules + lastModule.uuid,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Get module with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules + lastModule.uuid,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        })
    });
});