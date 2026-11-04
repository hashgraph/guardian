import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import * as Checks from '../../../support/checkingMethods';

context('Policy autotest', { tags: ['policyAT'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let policyId;
    let testId;

    it('Import policy ACM0001', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.readFile('../Methodology Library/Clean Development Mechanism (CDM)/CDM ACM0001/ACM0001.policy', 'binary')
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
                        expect(imported[0].name).to.match(/^ACM0001(_\d+)?$/);
                        expect(imported[0].tools).to.have.length(4);
                        policyId = imported[0].id;
                    });
                });
        });
    });

    it('Prepare the imported policy for the test run', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId,
                headers: { authorization },
                timeout: 180000,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body.id).to.eq(policyId);
                // The archive ships one sample record; the import created the test from it.
                expect(response.body.tests).to.have.length(1);
                testId = response.body.tests.at(0).id;

                // The engine only runs tests on dry-run policies; a fresh import is a draft.
                if (response.body.status !== 'DRY-RUN') {
                    cy.request({
                        method: METHOD.PUT,
                        url: `${API.ApiServer}${API.Policies}${policyId}/${API.DryRun}`,
                        headers: { authorization },
                        timeout: 180000,
                    }).then((dryRun) => {
                        expect(dryRun.status).to.eq(STATUS_CODE.OK);
                    });
                }
            });
        });
    });

    it('Run the sample record and collect the result', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + '/' + API.Test + testId + '/' + API.Start,
                headers: { authorization },
                timeout: 180000,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body.id).to.eq(testId);
                expect(response.body.progress).to.eq(0);
            });

            const getPolicy = {
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId,
                headers: { authorization },
            };

            Checks.whilePolicyTestExecuting(getPolicy);

            cy.request(getPolicy).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                const test = response.body.tests.at(0);
                expect(test.status).to.eq('Success');
                expect(test.result.total).to.eq(100);
            });
        });
    });
});
