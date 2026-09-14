import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { seededMessageId } from '../../../support/CustomHelpers/ipfsSeeding';

context('External', { tags: ['external', 'thirdPool', 'all', 'all-no-mgs'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    let policyTag; let owner;

    before('Import policy', () => {
        seededMessageId('policy_with_artifacts').then((messageId) => { //Remote GHG Policy
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.PolicisImportMsg,
                    body: { messageId },
                    headers: {
                        authorization,
                    },
                    timeout: 480000,
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                });

                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    policyTag = response.body[0].policyTag;
                    owner = response.body[0].owner;
                })
            })
        });
    });

    it('Sends data from an external source', { tags: ['notifications', 'ipfs', 'tags', 'policies', 'smoke', 'artifacts'] }, () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.External,
            body: {
                owner,
                policyTag,
                document: {},
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).eql(true);
        });
    });
});