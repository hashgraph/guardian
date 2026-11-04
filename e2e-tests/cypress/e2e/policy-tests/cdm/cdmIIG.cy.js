import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Policy autotest', { tags: ['policyAT'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it('Import policy CDM AMS-II.G Policy', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.readFile('../Methodology Library/Clean Development Mechanism (CDM)/CDM AMS-II.G/CDM AMS-II.G Policy.policy', 'binary')
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
                        timeout: 180000,
                    }).then((response) => {
                        // `cy.request` returns the body as an ArrayBuffer for binary
                        // requests, so decode it back to JSON before asserting.
                        const imported = JSON.parse(new TextDecoder('utf-8').decode(response.body));

                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        expect(imported).to.be.an('array');
                        expect(imported[0].name).to.match(/^CDM AMS-II\.G Policy(_\d+)?$/);
                        expect(imported[0].tools).to.have.length(4);
                    });
                });
        });
    });
});
