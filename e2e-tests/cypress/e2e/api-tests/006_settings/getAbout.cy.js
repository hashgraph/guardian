
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context('Settings', { tags: ['settings', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const settingsUrl = `${API.ApiServer}${API.SettingsAbout}`;

    const getSettingsWithAuth = (authorization) =>
        cy.request({
            method: METHOD.GET,
            url: settingsUrl,
            headers: { authorization },
        });

    const getSettingsWithoutAuth = (headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: settingsUrl,
            headers,
            failOnStatusCode: false,
        });

    it('Get current settings', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getSettingsWithAuth(authorization).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body).to.have.property('version');
            });
        });
    });

    it("Get current settings without auth token - Negative", () => {
        getSettingsWithoutAuth().then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get current settings with invalid auth token - Negative", () => {
        getSettingsWithoutAuth({ authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get current settings with empty auth token - Negative", () => {
        getSettingsWithoutAuth({ authorization: "" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
