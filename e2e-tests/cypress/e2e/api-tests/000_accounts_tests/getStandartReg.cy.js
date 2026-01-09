
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context('Get Standard Registries', () => {
  const SRUsername = Cypress.env('SRUser');
  const UserUsername = Cypress.env('User');
  const registriesUrl = `${API.ApiServer}${API.StandartRegistries}`;

  const getRegistriesWithAuth = (authorization, { failOnStatusCode = true } = {}) =>
    cy.request({
      method: METHOD.GET,
      url: registriesUrl,
      headers: { authorization },
      failOnStatusCode,
    });

  const getRegistriesWithoutAuth = (headers = {}) =>
    cy.request({
      method: METHOD.GET,
      url: registriesUrl,
      headers,
      failOnStatusCode: false,
    });

  it("Get list of Standard Registries", () => {
    Authorization.getAccessToken(SRUsername).then((authorization) => {
      getRegistriesWithAuth(authorization).then((response) => {
        expect(response.status).eql(STATUS_CODE.OK);
        expect(response.body.at(0)).to.have.property("username");
      });
    });
  });

  it("Get list of Standard Registries as User", () => {
    Authorization.getAccessToken(UserUsername).then((authorization) => {
      getRegistriesWithAuth(authorization, { failOnStatusCode: false }).then((response) => {
        expect(response.status).eql(STATUS_CODE.OK);
        expect(response.body.at(0).username).to.be.oneOf([SRUsername, "StandardRegistry"]);
      });
    });
  });

  it("Get list of Standard Registries without auth token - Negative", () => {
    getRegistriesWithoutAuth().then((response) => {
      expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
    });
  });

  it("Get list of Standard Registries with invalid auth token - Negative", () => {
    getRegistriesWithoutAuth({ authorization: "Bearer wqe" }).then((response) => {
      expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
    });
  });

  it("Get list of Standard Registries with empty auth token - Negative", () => {
    getRegistriesWithoutAuth({ authorization: "" }).then((response) => {
      expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
    });
  });

});
