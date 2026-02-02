
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Modules", { tags: ['modules', 'thirdPool', 'all'] }, () => {

  const SRUsername = Cypress.env('SRUser');

  const modulesUrl = `${API.ApiServer}${API.ListOfAllModules}`;
  const validateUrl = `${modulesUrl}${API.Validate}`;

  let invalidModule;

  const getModulesWithAuth = (authorization) =>
    cy.request({
      method: METHOD.GET,
      url: modulesUrl,
      headers: { authorization },
    });

  const getModuleWithAuth = (authorization, uuid) =>
    cy.request({
      method: METHOD.GET,
      url: modulesUrl + uuid,
      headers: { authorization },
    });

  const putModuleWithAuth = (authorization, uuid, body) =>
    cy.request({
      method: METHOD.PUT,
      url: modulesUrl + uuid,
      headers: { authorization },
      body,
    });

  const postValidateWithAuth = (authorization, body) =>
    cy.request({
      method: METHOD.POST,
      url: validateUrl,
      headers: { authorization },
      body,
    });

  const postValidateWithoutAuth = (body, headers = {}) =>
    cy.request({
      method: METHOD.POST,
      url: validateUrl,
      headers,
      body,
      failOnStatusCode: false,
    });

  before("Get and prepare module for validate", () => {
    Authorization.getAccessToken(SRUsername).then((authorization) => {
      getModulesWithAuth(authorization).then((response) => {
        expect(response.status).eql(STATUS_CODE.OK);
        const uuid = response.body.at(1).uuid;
        getModuleWithAuth(authorization, uuid).then((res) => {
          expect(res.status).eql(STATUS_CODE.OK);
          invalidModule = res.body;

          delete invalidModule.configFileId;
          delete invalidModule.type;
          delete invalidModule.updateDate;
          delete invalidModule._id;
          invalidModule.config.children = [];

          putModuleWithAuth(authorization, invalidModule.uuid, invalidModule).then((putRes) => {
            expect(putRes.status).eql(STATUS_CODE.SUCCESS);

            expect(putRes.body.codeVersion).eql(invalidModule.codeVersion);
            expect(putRes.body.createDate).eql(invalidModule.createDate);
            expect(putRes.body.creator).eql(invalidModule.creator);
            expect(putRes.body.description).eql(invalidModule.description);
            expect(putRes.body.id).eql(invalidModule.id);
            expect(putRes.body.name).eql(invalidModule.name);
            expect(putRes.body.owner).eql(invalidModule.owner);
            expect(putRes.body.status).eql(invalidModule.status);
            expect(putRes.body.uuid).eql(invalidModule.uuid);

            expect(putRes.body.config).eql(invalidModule.config);
          });
        });
      });
    });
  });

  it("Validates selected module", { tags: ['analytics'] }, () => {
    Authorization.getAccessToken(SRUsername).then((authorization) => {
      postValidateWithAuth(authorization, invalidModule).then((response) => {
        expect(response.status).eql(STATUS_CODE.OK);
        expect(response.body.results.isValid).eql(true);
        expect(response.body.module).eql(invalidModule);
      });
    });
  });

  it("Validates selected module without auth token - Negative", () => {
    postValidateWithoutAuth(invalidModule).then((response) => {
      expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
    });
  });

  it("Validates selected module with invalid auth token - Negative", () => {
    postValidateWithoutAuth(invalidModule, { authorization: "Bearer wqe" }).then((response) => {
      expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
    });
  });

  it("Validates selected module with empty auth token - Negative", () => {
    postValidateWithoutAuth(invalidModule, { authorization: "" }).then((response) => {
      expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
    });
  });
  
});
