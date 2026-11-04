import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import * as Checks from '../../../support/checkingMethods';
import { prepareTools, parseImportResponse } from '../../../support/cdmTools';

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

context('Policy autotest', { tags: ['policyAT'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let policyId;
    let testId;

    it('Import policy ACM0001', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            return prepareTools(TOOL_IMPORT_ORDER, authorization).then((local) => {
                const metadata = { tools: Object.fromEntries(Object.entries(TOOL_REFS).map(([name, sourceMessageId]) => [sourceMessageId, local[name]])) };

                return cy.readFile(CDM_ARCHIVE, 'binary')
                    .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                    .then((file) => {
                        const form = new FormData();
                        form.append('policyFile', file, CDM_ARCHIVE.split('/').pop());
                        form.append('metadata', JSON.stringify(metadata), 'metadata.json');
                        return cy.request({
                            method: METHOD.POST,
                            url: API.ApiServer + API.PolicisImportFileMetadata,
                            body: form,
                            headers: { authorization },
                            timeout: 180000,
                        });
                    })
                    .then((response) => {
                        const imported = parseImportResponse(response.body);

                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        expect(imported).to.be.an('array');
                        expect(imported[0].name).to.match(/^ACM0001(_\d+)?$/);
                        expect(imported[0].tools).to.have.length(4);
                        policyId = imported[0].id;
                    });
            });
        });
    });

    it('Upload the sample record as a test', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
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
                        timeout: 180000,
                    });
                })
                .then((response) => {
                    const tests = parseImportResponse(response.body);

                    expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                    expect(tests).to.have.length(1);
                    expect(tests[0].policyId).to.eq(policyId);
                    testId = tests[0].id;
                });
        });
    });

    it('Run the sample record and collect the result', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId,
                headers: { authorization },
                timeout: 180000,
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
                        timeout: 180000,
                    }).then((dryRun) => {
                        expect(dryRun.status).to.eq(STATUS_CODE.OK);
                    });
                }
            });

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
