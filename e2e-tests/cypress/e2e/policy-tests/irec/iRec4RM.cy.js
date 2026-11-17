import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

context('Policy autotest', { tags: ['policyAT', 'policy-all', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it('Import policy iRec 4 Retry Mint', () => {
        return Authorization.getAccessToken(SRUsername).then((authorization) => {
            return cy.readFile('../Methodology Library/International Renewable Energy Certificate (iREC)/Policies/iRec Policy 4 (Retry Mint).policy', 'binary')
                .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                .then((file) => {
                    return cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.PolicisImportFile,
                        body: file,
                        headers: {
                            'content-type': 'binary/octet-stream',
                            authorization,
                        },
                        timeout: TIMEOUTS.longOperation,
                    }).then((response) => {
                        // `cy.request` returns the body as an ArrayBuffer for binary
                        // requests, so decode it back to JSON before asserting.
                        const imported = JSON.parse(new TextDecoder('utf-8').decode(response.body));

                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        expect(imported).to.be.an('array');
                        expect(imported[0].name).to.match(/^iRec 4 Retry Mint(_\d+)?$/);
                    });
                });
        });
    });
});
