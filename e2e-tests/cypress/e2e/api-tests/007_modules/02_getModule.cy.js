
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get Module", { tags: ['modules', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = "FirstAPIModule";

    const modulesUrl = `${API.ApiServer}${API.ListOfAllModules}`;
    const profilesUrl = `${API.ApiServer}${API.Profiles}`;

    let lastModule, did;

    const getModulesWithAuth = (authorization) =>
        cy.request({
            method: METHOD.GET,
            url: modulesUrl,
            headers: { authorization },
        });

    const getProfileWithAuth = (authorization, username) =>
        cy.request({
            method: METHOD.GET,
            url: profilesUrl + username,
            headers: { authorization },
        });

    const getModuleWithAuth = (authorization, uuid) =>
        cy.request({
            method: METHOD.GET,
            url: modulesUrl + uuid,
            headers: { authorization },
        });

    const getModuleWithoutAuth = (uuid, headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: modulesUrl + uuid,
            headers,
            failOnStatusCode: false,
        });

    before("Get module id and did", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getModulesWithAuth(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                lastModule = response.body.at(0);
                getProfileWithAuth(authorization, SRUsername).then((profileRes) => {
                    expect(profileRes.status).eql(STATUS_CODE.OK);
                    did = profileRes.body.did;
                });
            });
        });
    });

    it("Get module", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getModuleWithAuth(authorization, lastModule.uuid).then((response) => {
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
            });
        });
    });

    it("Get module without auth token - Negative", () => {
        getModuleWithoutAuth(lastModule.uuid).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get module with invalid auth token - Negative", () => {
        getModuleWithoutAuth(lastModule.uuid, { authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get module with empty auth token - Negative", () => {
        getModuleWithoutAuth(lastModule.uuid, { authorization: "" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
