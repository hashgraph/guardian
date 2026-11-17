import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import * as Checks from '../../../support/checkingMethods';
import { prepareTools, importPolicyArchive, parseImportResponse } from '../../../support/cdmTools';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

const CDM_ARCHIVE = '../Methodology Library/Clean Development Mechanism (CDM)/CDM ACM0001/ACM0001.policy';

// The archive references the library's tools by their testnet messageIds; the
// import metadata remaps each reference to its locally published copy.
const TOOL_REFS = {
    'Tool 03': '1706867833.676387003',
    'Tool 06': '1707068762.886477003',
    'Tool 05': '1707833182.503204122',
    'Tool 07': '1706867530.884259218'
};

// Dependencies before dependents (see cdmTools.js).
const TOOL_IMPORT_ORDER = ['Tool 07', 'Tool 03', 'Tool 06', 'Tool 05'];

context('Policy autotest', { tags: ['policyAT', 'policy-all', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let policyId;
    let testId;

    it('Import policy ACM0001', () => {
        return Authorization.getAccessToken(SRUsername).then((authorization) => {
            return prepareTools(TOOL_IMPORT_ORDER, authorization).then((local) => {
                const toolRemaps = Object.fromEntries(Object.entries(TOOL_REFS).map(([name, sourceMessageId]) => [sourceMessageId, local[name]]));

                return importPolicyArchive(CDM_ARCHIVE, CDM_ARCHIVE.split('/').pop(), 'ACM0001', authorization, toolRemaps)
                    .then((policy) => {
                        expect(policy.name).to.match(/^ACM0001(_\d+)?$/);
                        expect(policy.tools).to.have.length(4);
                        policyId = policy.id;
                    });
            });
        });
    });

    it('Upload the sample record as a test', () => {
        return Authorization.getAccessToken(SRUsername).then((authorization) => {
            // The archive ships no test; the sample recorded on testnet is replayed
            // from the fixture instead.
            cy.fixture('cdm1Sample.record', 'binary')
                .then((file) => Cypress.Blob.binaryStringToBlob(file))
                .then((blob) => {
                    const formdata = new FormData();
                    formdata.append('tests', blob, 'cdm1Sample.record');
                    return cy.request({
                        method: METHOD.POST,
                        url: `${API.ApiServer}${API.Policies}${policyId}/${API.Test}`,
                        body: formdata,
                        headers: { authorization },
                        timeout: TIMEOUTS.backend,
                    });
                })
                .then((response) => {
                    // The upload answers with the freshly created test; the upload
                    // request is binary, so the JSON body arrives as an
                    // ArrayBuffer and must be decoded.
                    expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                    const tests = parseImportResponse(response);
                    const rows = Array.isArray(tests) ? tests : [tests];
                    expect(rows, `uploading the sample test: no test in the response`).to.have.length(1);
                    testId = rows[0].id;
                    expect(testId, `uploading the sample test: no id on the created test`).to.be.a('string');
                });
        });
    });

    it('Run the sample record and collect the result', () => {
        return Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId,
                headers: { authorization },
                timeout: TIMEOUTS.backend,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body.id).to.eq(policyId);
                expect(response.body.tests).to.have.length(1);

                // The engine only runs tests on dry-run policies; a fresh import is a draft.
                if (response.body.status !== 'DRY-RUN') {
                    cy.request({
                        method: METHOD.PUT,
                        url: `${API.ApiServer}${API.Policies}${policyId}/${API.DryRun}`,
                        headers: { authorization },
                        timeout: TIMEOUTS.longOperation,
                    }).then((dryRun) => {
                        expect(dryRun.status).to.eq(STATUS_CODE.OK);
                    });
                }
            });

            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + '/' + API.Test + testId + '/' + API.Start,
                headers: { authorization },
                timeout: TIMEOUTS.backend,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
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
