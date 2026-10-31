import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Policy autotest', { tags: ['policyAT'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const isTestnet = Cypress.env('hederaNet') === 'testnet';

    it('Import policy CDM AMS-I.A', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.readFile('../Methodology Library/Clean Development Mechanism (CDM)/CDM AMS-I.A/CDM AMS-I.A.policy', 'binary')
                .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                .then((file) => {
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.PolicisImportFile,
                        body: file,
                        headers: {
                            'content-type': 'binary/octet-stream',
                            authorization,
                        },
                        failOnStatusCode: false,
                        timeout: 180000,
                    }).then((response) => {
                        // `cy.request` returns the body as an ArrayBuffer for binary
                        // requests, so decode it back to JSON before asserting.
                        const imported = JSON.parse(new TextDecoder('utf-8').decode(response.body));

                        if (isTestnet) {
                            expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                            expect(imported[0].name).to.match(/^CDM AMS-I\.A(_\d+)?$/);
                        } else {
                            // The tools embedded in this archive reference Hedera testnet consensus
                            // messages. They cannot be retrieved on a local network, so the import
                            // fails with MESSAGE_NOT_FOUND; on testnet they resolve and the import
                            // succeeds.
                            expect(response.status).to.eq(STATUS_CODE.ERROR);
                            expect(imported.message).to.contain('MESSAGE_NOT_FOUND');
                        }
                    });
                });
        });
    });
});
