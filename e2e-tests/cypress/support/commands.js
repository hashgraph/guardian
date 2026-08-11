// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

import { METHOD } from './api/api-const';
import API from './ApiUrls';
import { randomInt } from './random';

Cypress.Commands.add('checkIfFileExistByPartialName', (partialName) => {
    cy.task('checkFile', partialName).then(fileExists => {
        expect(fileExists).to.be.true;
    });
});

Cypress.Commands.add('createTag', (token, name, target, entity) => {
    return cy.request({
        method: METHOD.POST,
        url: API.ApiServer + API.Tags,
        headers: token ? { authorization: token } : {},
        body: {
            name,
            description: name,
            entity,
            target,
        },
        failOnStatusCode: false,
    });
});

Cypress.Commands.add('searchTags', (token, targetId, entity) => {
    return cy.request({
        method: METHOD.POST,
        url: API.ApiServer + API.Tags + 'search',
        headers: token ? { authorization: token } : {},
        body: {
            entity,
            targets: [targetId]
        },
        failOnStatusCode: false,
        timeout: 200000
    });
});

Cypress.Commands.add('deleteTag', (token, tagId) => {
    return cy.request({
        method: METHOD.DELETE,
        url: API.ApiServer + API.Tags + tagId,
        headers: token ? { authorization: token } : {},
        failOnStatusCode: false,
    });
});

Cypress.Commands.add('getPublishedTagSchemas', (token) => {
    return cy.request({
        method: METHOD.GET,
        url: `${API.ApiServer}${API.Tags}schemas/published`,
        headers: token ? { authorization: token } : {},
        failOnStatusCode: false,
        timeout: 200000
    });
});

Cypress.Commands.add('importPolicyFile', (token, fileName) => {
    return cy.fixture(fileName, 'binary')
        .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
        .then((file) => {
            return cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.PolicisImportFile,
                body: file,
                headers: {
                    'content-type': 'binary/octet-stream',
                    authorization: token,
                },
                timeout: 180000,
            });
        });
});

Cypress.Commands.add('getPolicyByName', (token, policyName) => {
    return cy.request({
        method: METHOD.GET,
        url: `${API.ApiServer}${API.Policies}`,
        headers: { authorization: token }
    }).then((res) => {
        const policy = res.body.find(p => p.name === policyName);
        if (!policy) {throw new Error(`Policy with name "${policyName}" not found`);}
        return policy;
    });
});

Cypress.Commands.add('getUserProfile', (token, username) => {
    return cy.request({
        method: METHOD.GET,
        url: `${API.ApiServer}${API.Profiles}${username}`,
        headers: { authorization: token }
    }).then(res => res.body);
});

Cypress.Commands.add('getTokenByPolicyId', (token, policyId) => {
    return cy.request({
        method: METHOD.GET,
        url: `${API.ApiServer}${API.ListOfTokens}`,
        headers: { authorization: token }
    }).then(({ body }) => {
        return body.find(t => t.policyIds.includes(policyId));
    });
});

Cypress.Commands.add('assignPolicyToUser', (token, username, policyId) => {
    return cy.request({
        method: METHOD.POST,
        url: `${API.ApiServer}${API.Permissions}${API.Users}${username}/${API.Policies}${API.Assign}`,
        body: { policyIds: [policyId], assign: true },
        headers: { authorization: token },
    });
});

Cypress.Commands.add('getPolicyLabels', (token) => {
    return cy.request({
        method: METHOD.GET,
        url: `${API.ApiServer}${API.PolicyLabels}`,
        headers: token ? { authorization: token } : {},
        failOnStatusCode: false
    });
});

// The specs below reuse whatever entity the earlier pools happened to leave behind, so running a
// spec on its own (or against a fresh DB) used to fail in the `before` hook with a bare
// "Cannot read properties of undefined". These helpers create the entity on demand instead, which
// keeps each spec runnable in isolation without changing what it asserts.

Cypress.Commands.add('getOrCreateRetireContractId', (authorization) => {
    return cy.request({
        method: METHOD.GET,
        url: API.ApiServer + API.ListOfContracts,
        headers: { authorization },
        qs: { type: 'RETIRE' },
    }).then((response) => {
        const contract = response.body.at(0);
        if (contract) {
            return contract.id;
        }
        return cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfContracts,
            headers: { authorization, 'api-version': 2 },
            body: { description: `TagsAPIContractR_${randomInt(999999)}`, type: 'RETIRE' },
            timeout: 180000,
        }).then((created) => created.body.id ?? created.body._id);
    });
});

Cypress.Commands.add('getOrCreateModuleId', (authorization) => {
    return cy.request({
        method: METHOD.GET,
        url: API.ApiServer + API.ListOfAllModules,
        headers: { authorization },
    }).then((response) => {
        const module = response.body.at(0);
        if (module) {
            return module.id;
        }
        const moduleName = `TagsAPIModule_${randomInt(999999)}`;
        return cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfAllModules,
            headers: { authorization },
            body: {
                name: moduleName,
                description: `${moduleName} desc`,
                config: { blockType: 'module' },
            },
        }).then((created) => created.body.id ?? created.body._id);
    });
});

Cypress.Commands.add('getOrCreatePolicy', (authorization) => {
    return cy.request({
        method: METHOD.GET,
        url: API.ApiServer + API.Policies,
        headers: { authorization },
    }).then((response) => {
        const policy = response.body.at(0);
        if (policy) {
            return policy;
        }
        // policyTag is unique in the DB, so it has to be randomised per run
        const runId = randomInt(999999);
        return cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Policies,
            headers: { authorization },
            body: { name: `TagsAPIPolicy_${runId}`, policyTag: `TagsAPIPolicyTag_${runId}` },
            timeout: 180000,
            // creating a policy answers with the full policy list
        }).then((created) => created.body.at(0));
    });
});

Cypress.Commands.add('getOrCreateSchemaId', (authorization) => {
    return cy.request({
        method: METHOD.GET,
        url: API.ApiServer + API.Schemas,
        headers: { authorization },
    }).then((response) => {
        const schema = response.body.at(0);
        if (schema) {
            return schema.id;
        }
        // A schema needs a topic to live in, and only a policy provides one
        return cy.getOrCreatePolicy(authorization).then((policy) => {
            const schemaName = `TagsAPISchema_${randomInt(999999)}`;
            return cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Schemas + policy.topicId,
                headers: { authorization },
                body: {
                    name: schemaName,
                    description: schemaName,
                    entity: 'VC',
                    topicId: policy.topicId,
                    document: {
                        $id: `#${schemaName}`,
                        $comment: `{ "term": "${schemaName}", "@id": "#${schemaName}" }`,
                        title: schemaName,
                        description: schemaName,
                        type: 'object',
                        properties: {
                            '@context': { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }], readOnly: true },
                            type: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }], readOnly: true },
                            id: { type: 'string', readOnly: true },
                        },
                        required: [],
                        additionalProperties: false,
                    },
                },
                timeout: 180000,
            }).then(() => cy.request({
                // Schema listings are cached by request URL for 10 minutes, so a plain listing
                // straight after the creation keeps serving the pre-creation (empty) view.
                // A unique query parameter (ignored by the API) gives an uncached read.
                method: METHOD.GET,
                url: API.ApiServer + API.Schemas + policy.topicId,
                headers: { authorization },
                qs: { cacheBust: `${randomInt(999999)}_${Date.now()}` },
            }).then((list) => {
                const created = list.body.find((item) => item?.name === schemaName);
                expect(created, `schema ${schemaName} in topic ${policy.topicId}`).to.not.be.undefined;
                return created.id;
            }));
        });
    });
});

Cypress.Commands.add('registerUserIfNeededOrMissing', (username, password, role) => {
    cy.request({ method: 'GET', url: `${API.ApiServer}${API.RegUsers}` }).then((res) => {
        const exists = res.body.some(u => u.username === username);
        if (!exists) {
            cy.request({
                method: 'POST',
                url: `${API.ApiServer}${API.AccountRegister}`,
                body: { username, password, password_confirmation: password, role }
            });
        }
    });
});

Cypress.Commands.add('getBlockByTag', (authorization, policyId, tag) => {
    return cy.request({
        method: METHOD.GET,
        url: API.BlockByTag(policyId, tag),
        headers: { authorization },
        timeout: 600000
    })
});

Cypress.Commands.add('getHederaKeys', (token) => {
    return cy.request({
        method: 'GET',
        url: `${API.ApiServer}${API.RandomKey}`,
        headers: { authorization: token },
        timeout: 600000
    }).then((res) =>
        // The value has to be returned from inside the wait: a `.then()` callback that
        // enqueues cy commands does not yield a synchronously returned value.
        cy.wait(3000) // Wait for Hedera propagation
            .then(() => ({ id: res.body.id, key: res.body.key }))
    );
});

Cypress.Commands.add('setupLocalProfile', (username, auth, additionalBody = {}) => {
    cy.request({
        method: 'GET',
        url: `${API.ApiServer}profiles/${username}`,
        headers: { authorization: auth }
    }).then((res) => {
        if (!res.body.confirmed) {
            cy.request({
                method: 'GET',
                url: API.ApiServer + API.RandomKey,
                headers: { authorization: auth }
            }).then((keyRes) => {
                cy.wait(3000); // Wait for Hedera propagation
                const baseBody = {
                    hederaAccountId: keyRes.body.id,
                    hederaAccountKey: keyRes.body.key,
                    didDocument: null,
                    didKeys: []
                };
                cy.request({
                    method: 'PUT',
                    url: `${API.ApiServer}profiles/${username}`,
                    headers: { authorization: auth },
                    body: { ...baseBody, ...additionalBody },
                    timeout: 400000
                });
            });
        }
    });
});