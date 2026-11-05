import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

context('Get Policy Themes', { tags: ['themes', 'secondPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const themeName = 'ThemeAPI';

    it('Get theme', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Themes,
                headers: {
                    authorization,
                },
                timeout: TIMEOUTS.backend,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.at(0).name).eql(themeName);
            });
        })
    });

    it('Get theme without auth token - Negative', () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Themes,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get theme with invalid auth token - Negative', () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Themes,
            headers: {
                authorization: 'Bearer wqe',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get theme with empty auth token - Negative', () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Themes,
            headers: {
                authorization: '',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
})
