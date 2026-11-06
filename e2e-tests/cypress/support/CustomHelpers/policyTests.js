import { METHOD, STATUS_CODE } from '../api/api-const';
import API from '../ApiUrls';
import * as Checks from '../checkingMethods';
import { parseImportResponse } from '../cdmTools';
import { waitForTask } from './tasks';
import { TIMEOUTS } from './timeouts';

const FINAL_TEST_STATUSES = ['Success', 'Failure', 'Stopped'];

const policyUrl = (policyId) => API.ApiServer + API.Policies + policyId;

/** Uploads a `.record` fixture as a test of the policy and yields the test id. */
export const uploadPolicyTest = (authorization, policyId, recordFixture) =>
    cy.fixture(recordFixture, 'binary')
        .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
        .then((blob) => {
            const formdata = new FormData();
            formdata.append('tests', blob, recordFixture);
            return cy.request({
                method: METHOD.POST,
                url: `${policyUrl(policyId)}/${API.Test}`,
                body: formdata,
                headers: { authorization },
                timeout: TIMEOUTS.backend,
            });
        })
        .then((response) => {
            expect(response.status, `uploading ${recordFixture}`).to.eq(STATUS_CODE.SUCCESS);
            const [test] = [].concat(parseImportResponse(response));
            expect(test?.id, `uploading ${recordFixture}: id of the created test`).to.be.a('string');
            return test.id;
        });

/**
 * Puts the policy in dry run, replays the test and yields `{ test, details }`: the test row of the
 * policy (status, result, error) and the comparison of the recorded documents with the replayed ones
 * (`null` when the replay ended with an error).
 */
export const runPolicyTest = (authorization, policyId, testId) => {
    const getPolicy = { method: METHOD.GET, url: policyUrl(policyId), headers: { authorization } };
    return cy.request({
        method: METHOD.PUT,
        url: `${policyUrl(policyId)}/${API.DryRun}`,
        headers: { authorization },
        timeout: TIMEOUTS.longOperation,
    })
        .then((response) => {
            expect(response.status, 'dry run of the policy').to.eq(STATUS_CODE.OK);
            return cy.request({
                method: METHOD.POST,
                url: `${policyUrl(policyId)}/${API.Test}${testId}/${API.Start}`,
                headers: { authorization },
                timeout: TIMEOUTS.backend,
            });
        })
        .then((response) => {
            expect(response.status, 'start of the policy test').to.eq(STATUS_CODE.OK);
            // A test that cannot replay ends as `Failure` with an `error` and no `result`.
            return Checks.pollUntil({
                request: getPolicy,
                predicate: (policyResponse) => {
                    const test = policyResponse.body.tests?.find((row) => row.id === testId);
                    return FINAL_TEST_STATUSES.includes(test?.status) && test;
                },
                description: `policy test ${testId} to finish`,
                timeout: TIMEOUTS.longOperation,
            });
        })
        .then((test) => {
            if (!test.result) {
                return { test, details: null };
            }
            return cy.request({
                method: METHOD.GET,
                url: `${policyUrl(policyId)}/${API.Test}${testId}/details`,
                headers: { authorization },
                timeout: TIMEOUTS.backend,
            }).then((detailsResponse) => ({ test, details: detailsResponse.body }));
        });
};

/** Returns a dry-run policy to draft and deletes it. */
export const deleteDryRunPolicy = (authorization, policyId) =>
    cy.request({
        method: METHOD.PUT,
        url: `${policyUrl(policyId)}/${API.Draft}`,
        headers: { authorization },
        timeout: TIMEOUTS.longOperation,
    })
        .then(() => cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.Policies + API.Async + policyId,
            headers: { authorization },
        }))
        .then((response) => {
            expect(response.status, 'deletion of the policy').to.eq(STATUS_CODE.ACCEPTED);
            return waitForTask(authorization, response.body.taskId);
        });
