import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

context('Tokens', { tags: ['tokens', 'thirdPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it('Create a new token', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ListOfTokens,
                headers: { authorization },
                body: {
                    'changeSupply': true,
                    'decimals': 'string',
                    'enableAdmin': true,
                    'enableFreeze': true,
                    'enableKYC': true,
                    'enableWipe': true,
                    'initialSupply': 'string',
                    'tokenName': 'test',
                    'tokenSymbol': 'string',
                    'tokenType': 'string'
                },
                timeout: TIMEOUTS.backend,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
            });
        });
    })
});
