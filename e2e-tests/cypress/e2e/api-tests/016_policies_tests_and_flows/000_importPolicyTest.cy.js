import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Import policy test', { tags: ['policies', 'secondPool', 'all', 'all-no-mgs'] }, () => {
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
                    timeout: 180000,
                });
            });

    before('Get policy id', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            // 1. Import File
            cy.importPolicyFile(authorization, 'iRecDRF.policy').then(() => {
                // 2. Get List and find ID
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies,
                    headers: { authorization },
                    timeout: 180000
                }).then((response) => {
                    const policy = response.body.find(p => p.name === 'iRecDRF');
                    expect(policy, 'the imported iRecDRF policy').to.not.be.undefined;
                    policyId = policy.id;

                    // 3. Set to Dry Run, unless the policy already is in it: asking for the
                    // transition a second time answers 500
                    if (policy.status !== 'DRY-RUN') {
                        cy.request({
                            method: METHOD.PUT,
                            url: `${API.ApiServer}${API.Policies}${policyId}/${API.DryRun}`,
                            headers: { authorization },
                            timeout: 180000,
                        }).then((response) => {
                            expect(response.status).to.eq(STATUS_CODE.OK);
                        });
                    }
                });
            });
        });
    });

    //Importing a record whose test is already on the policy answers 409, and the test is only
    //removed by the deletion spec at the end of the folder: a run that stopped earlier leaves one
    //behind, so the policy is emptied of its tests before importing.
    before('Remove the tests of earlier runs', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId,
                headers: { authorization },
                timeout: 180000,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                (response.body.tests ?? []).forEach((test) => {
                    cy.request({
                        method: METHOD.DELETE,
                        url: API.ApiServer + API.Policies + policyId + '/' + API.Test + test.id,
                        headers: { authorization },
                        failOnStatusCode: false,
                        timeout: 180000,
                    });
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
                timeout: 180000,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.BAD_REQUEST);
            });
        });
    });
});
