import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context('Settings', { tags: ['settings', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    it('Get current settings', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.SettingsAbout,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK)
                expect(response.body).to.have.property('version')
            })
        })
    })

    it("Get current settings without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.SettingsAbout,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get current settings with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.SettingsAbout,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get current settings with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.SettingsAbout,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
})
