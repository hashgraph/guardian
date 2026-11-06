import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

context('Policies', { tags: ['policies', 'secondPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it('Imports new policy and all associated artifacts from IPFS', { tags: ['analytics'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture('exportedPolicy.policy', 'binary')
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
                        timeout: TIMEOUTS.longOperation,
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                    });
                });
        });
    })
})
