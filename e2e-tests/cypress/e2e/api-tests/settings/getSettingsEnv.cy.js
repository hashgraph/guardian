import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Settings', () => {
  const authorization = Cypress.env('authorization');

  it('Returns current environment name.', () => {
    cy.sendRequest(METHOD.GET, Cypress.env("api_server") + API.SettingsEnv, {authorization,}).then((resp) => {
      expect(resp.status).eql(STATUS_CODE.OK);
      expect(resp.body).eql('testnet')})
})
})