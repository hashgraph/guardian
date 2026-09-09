import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Settings', { tags: ['settings', 'thirdPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it('Get current environment name', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.SettingsEnv,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                // The endpoint reports Environment.network, i.e. the network Guardian is configured
                // for -- which is the network the suite was pointed at.
                expect(response.body).eql(Cypress.env('hederaNet'));
            });
        });
    })
});
