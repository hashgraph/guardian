import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

context('Export Policy Themes', { tags: ['themes', 'secondPool', 'api-all', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    let themeId;

    before('Get theme id', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Themes,
                headers: {
                    authorization,
                },
                timeout: TIMEOUTS.backend,
            }).then((response) => {
                themeId = response.body.at(0).id;
            });
        })
    })

    it('Export theme', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Themes + themeId + '/' + API.ExportFile,
                headers: {
                    authorization,
                },
                timeout: TIMEOUTS.backend,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.headers).to.have.property('content-type','application/zip');
                expect(response.body).not.eql(null);
            })
        });
    });

    it('Export theme without auth token - Negative', () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Themes + themeId + '/' + API.ExportFile,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Export theme with invalid auth token - Negative', () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Themes + themeId + '/' + API.ExportFile,
            headers: {
                authorization: 'Bearer wqe',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Export theme with empty auth token - Negative', () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Themes + themeId + '/' + API.ExportFile,
            headers: {
                authorization: '',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
})
