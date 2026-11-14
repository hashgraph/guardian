import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { newestPolicyCopy, parseImportResponse } from '../../../support/cdmTools';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

context('Import policy test', { tags: ['policies', 'secondPool', 'api-all', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let policyId;

    const importPolicyTest = (policyId, fileName, headers = {}) =>
        cy.fixture(fileName, 'binary')
            .then((file) => Cypress.Blob.binaryStringToBlob(file))
            .then((blob) => {
                const formdata = new FormData();
                formdata.append('tests', blob, fileName);

                const reqHeaders = headers.authorization
                    ? { authorization: headers.authorization }
                    : {};

                return cy.request({
                    method: METHOD.POST,
                    url: `${API.ApiServer}${API.Policies}${policyId}/${API.Test}`,
                    body: formdata,
                    headers: reqHeaders,
                    failOnStatusCode: false,
                    timeout: TIMEOUTS.backend,
                });
            });

    // Every run works on a copy of its own, put in dry run here and deleted by 003_deletePolicyTest:
    // a copy left by an earlier run may have been published or carry its tests.
    before('Import a copy of the policy and put it in dry run', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.importPolicyFile(authorization, 'iRecDRF.policy').then((response) => {
                // The import answers with every policy of the registry
                const policy = newestPolicyCopy([].concat(parseImportResponse(response)), 'iRecDRF');
                expect(policy?.status, 'the copy of iRecDRF just imported').to.eq('DRAFT');
                policyId = policy.id;
                cy.request({
                    method: METHOD.PUT,
                    url: `${API.ApiServer}${API.Policies}${policyId}/${API.DryRun}`,
                    headers: { authorization },
                    timeout: TIMEOUTS.longOperation,
                }).then((dryRunResponse) => {
                    expect(dryRunResponse.status).to.eq(STATUS_CODE.OK);
                });
            });
        });
    });

    it('Import a new policy test', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            importPolicyTest(policyId, 'iRecFullFlow.record', { authorization }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                const decodedBody = JSON.parse(new TextDecoder().decode(response.body));
                expect(decodedBody.at(0).policyId).to.eq(policyId);
            });
        });
    });

    it('Import a new policy test without auth token - Negative', () => {
        importPolicyTest(policyId, 'iRecFullFlow.record', {}).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Import a new policy test with invalid auth token - Negative', () => {
        importPolicyTest(policyId, 'iRecFullFlow.record', { authorization: 'Bearer wqe' }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Import a new policy test with empty auth token - Negative', () => {
        importPolicyTest(policyId, 'iRecFullFlow.record', { authorization: '' }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Import a new policy test without policy test file', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: `${API.ApiServer}${API.Policies}${policyId}/${API.Test}`,
                headers: { authorization },
                failOnStatusCode: false,
                timeout: TIMEOUTS.backend,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.BAD_REQUEST);
            });
        });
    });
});
