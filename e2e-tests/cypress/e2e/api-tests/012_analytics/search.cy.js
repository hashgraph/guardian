import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Analytics', { tags: ['analytics', 'thirdPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    let policyId;

    // Both tests need a policy with an actual root block config (`config.children`), which a bare
    // `POST /policies` policy doesn't have. Importing a real fixture guarantees that, instead of
    // grabbing an arbitrary policy from the account's list (`GET /policies` doesn't even return
    // `config`) and hoping it happens to have blocks.
    before('Import a policy with blocks', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture('exportedPolicy.policy', 'binary')
                .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                .then((file) => cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.PolicisImportFile,
                    body: file,
                    headers: {
                        'content-type': 'binary/octet-stream',
                        authorization,
                    },
                    timeout: 180000,
                })).then((response) => {
                    expect(response.status, 'policy import').to.eq(STATUS_CODE.SUCCESS);
                    policyId = JSON.parse(new TextDecoder().decode(response.body)).at(0).id;
                });
        });
    });

    it('Search policy', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.PolicySearch,
                body: {
                    policyId,
                },
                headers: {
                    authorization,
                }
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body.result.at(0)).exist;
                expect(response.body.target.id).to.eq(policyId);
            })
        })
    });

    it('Search blocks', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId,
                headers: {
                    authorization,
                }
            }).then((response) => {
                const config = response.body.config;
                const blockId = config.children.at(0).id;
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.BlockSearch,
                    body: {
                        id: blockId,
                        config,
                    },
                    headers: {
                        authorization,
                    }
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK);
                })
            })
        })
    });
});
