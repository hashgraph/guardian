
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Create Module", { tags: ['modules', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = "FirstAPIModule";

    const modulesUrl = `${API.ApiServer}${API.ListOfAllModules}`;
    const profilesUrl = `${API.ApiServer}${API.Profiles}`;

    let did;

    const getProfileWithAuth = (authorization, username) =>
        cy.request({
            method: METHOD.GET,
            url: profilesUrl + username,
            headers: { authorization },
        });

    const createModuleWithAuth = (authorization, body) =>
        cy.request({
            method: METHOD.POST,
            url: modulesUrl,
            headers: { authorization },
            body,
        });

    const createModuleWithoutAuth = (body, headers = {}) =>
        cy.request({
            method: METHOD.POST,
            url: modulesUrl,
            headers,
            body,
            failOnStatusCode: false,
        });

    const baseModuleBody = (includeMenu = false) => ({
        name: moduleName,
        description: `${moduleName} desc`,
        ...(includeMenu ? { menu: "show" } : {}),
        config: { blockType: "module" },
    });

    before("Get user data", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getProfileWithAuth(authorization, SRUsername).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                did = response.body.did;
            });
        });
    });

    it("Create a new module", { tags: ['smoke', 'tags', 'analytics'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            createModuleWithAuth(authorization, baseModuleBody()).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);

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
                expect(response.body).to.have.property("id");
                expect(response.body).to.have.property("updateDate");
                expect(response.body).to.have.property("uuid");
                expect(response.body).to.have.property("_id");

                expect(response.body.codeVersion).eql("1.0.0");
                expect(response.body.config.blockType).eql("module");
                expect(response.body.creator).eql(did);
                expect(response.body.description).eql(`${moduleName} desc`);
                expect(response.body.name).eql(moduleName);
                expect(response.body.owner).eql(did);
                expect(response.body.status).eql("DRAFT");
                expect(response.body.type).eql("CUSTOM");
            });
        });
    });

    it("Create a new module without auth token - Negative", () => {
        createModuleWithoutAuth(baseModuleBody(true)).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create a new module with invalid auth token - Negative", () => {
        createModuleWithoutAuth(baseModuleBody(true), { authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create a new module with empty auth token - Negative", () => {
        createModuleWithoutAuth(baseModuleBody(true), { authorization: "" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
