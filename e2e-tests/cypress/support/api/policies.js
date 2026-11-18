import { METHOD, STATUS_CODE } from './api-const';
import API from '../ApiUrls';
import { TIMEOUTS } from '../CustomHelpers/timeouts';

const policiesUrl = `${API.ApiServer}${API.Policies}`;

// Creates an empty DRAFT policy of the spec's own, for what only a draft allows (uploading
// artifacts, editing): the policies other specs leave in the list may be published or belong to
// another registry. The name doubles as the policy tag, which has to be unique. Yields its id.
export const createDraftPolicy = (authorization, name) =>
    cy.request({
        method: METHOD.POST,
        url: policiesUrl,
        headers: { authorization },
        body: { name, policyTag: name },
        timeout: TIMEOUTS.backend,
    }).then((response) => {
        expect(response.status, `creation of the draft policy ${name}`).to.eq(STATUS_CODE.SUCCESS);
        // Creating a policy answers with the whole policy list.
        return response.body.find((policy) => policy.name === name).id;
    });

// Deletes a DRAFT policy through the task endpoint.
export const deleteDraftPolicy = (authorization, policyId) =>
    cy.request({
        method: METHOD.DELETE,
        url: `${policiesUrl}${API.Async}${policyId}`,
        headers: { authorization },
        timeout: TIMEOUTS.backend,
    });
