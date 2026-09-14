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

import { METHOD, STATUS_CODE } from './api/api-const';
import API from './ApiUrls';
import { randomInt } from './random';
import * as Authorization from './authorization';
import { importPolicyFromMessage, seededMessageId } from './CustomHelpers/ipfsSeeding';

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

// Several 010_tokens specs need a fungible "test" token to exist and normally rely on
// postTokens.cy.js/postPushTokens.cy.js (which create it unconditionally) having already
// run earlier in the same folder. That assumption breaks whenever specs are filtered by
// tag (e.g. `--env grepTags=smoke`) and those creator specs get skipped. This command makes
// each caller self-sufficient: reuse the token if one already exists, otherwise create it.
Cypress.Commands.add('getOrCreateTestToken', (srToken, listToken, listQs = {}) => {
    // `.then()` yields the *previous* subject whenever its callback returns undefined, so a
    // lookup that finds nothing would yield the whole cy.request response here: a truthy object
    // with no `tokenId`, which silently passes the "already exists" check below and leaves every
    // caller building `tokens/undefined/...` URLs. Yield an explicit null instead.
    const findTestToken = () => cy.request({
        method: METHOD.GET,
        url: `${API.ApiServer}${API.ListOfTokens}`,
        qs: listQs,
        headers: { authorization: listToken },
    }).then(({ body }) => cy.wrap(
        // a token still without its Hedera id is of no use to the callers either
        body.filter((t) => t.tokenName === 'test' && t.tokenId).at(-1) ?? null,
        { log: false }
    ));

    return findTestToken().then((existing) => {
        if (existing) { return existing; }

        return cy.request({
            method: METHOD.POST,
            url: `${API.ApiServer}${API.ListOfTokens}`,
            headers: { authorization: srToken },
            body: {
                changeSupply: true,
                decimals: 'string',
                enableAdmin: true,
                enableFreeze: true,
                enableKYC: true,
                enableWipe: true,
                initialSupply: 'string',
                tokenName: 'test',
                tokenSymbol: 'string',
                tokenType: 'string',
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eql(STATUS_CODE.SUCCESS);
            // The POST response doesn't include tokenId, so re-fetch to find the token
            // we just created.
            return findTestToken();
        }).then((created) => {
            expect(created, 'the "test" token just created').to.not.be.null;
            return created;
        });
    });
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
        // a single entry is enough here, and the full schema listing grows with every run
        qs: { pageIndex: 0, pageSize: 1 },
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
                method: METHOD.GET,
                url: API.ApiServer + API.Schemas + policy.topicId,
                headers: { authorization },
            }).then((list) => {
                const created = list.body.find((item) => item?.name === schemaName);
                expect(created, `schema ${schemaName} in topic ${policy.topicId}`).to.not.be.undefined;
                return created.id;
            }));
        });
    });
});

/**
 * Yields the published `iRec_4` policy, importing it from its Hedera message and publishing it when
 * the instance does not hold it yet.
 *
 * Several API specs (contracts, trustchains, formulas, policy labels) are written against this
 * policy, and no API spec creates it: it is imported here so those folders run on their own and
 * keep working across runs, reusing the policy already present instead of importing a second copy.
 *
 * Pass `{ publish: false }` when the caller has to work on the policy while it is still a draft,
 * as the specs that attach a wipe contract to its token do, and publishes it itself afterwards.
 */
Cypress.Commands.add('getOrCreateIRec4Policy', (username, { publish: shouldPublish = true } = {}) => {
    const policyName = 'iRec_4';

    const findPolicy = (authorization) => cy.request({
        method: METHOD.GET,
        url: API.ApiServer + API.Policies,
        headers: { authorization },
        timeout: 180000,
    }).then((response) => {
        expect(response.status).to.eq(STATUS_CODE.OK);
        //Guardian keeps policy names unique by appending a timestamp, so every import after the
        //first is called `iRec_4_<ms>`: the whole family has to be matched, or an imported copy is
        //invisible to the very lookup that asked for it.
        //Newest first, because every run that publishes leaves another copy behind and a caller
        //that has just published one has to get that one back rather than a predecessor.
        const matches = response.body
            .filter((policy) => policy?.name === policyName || String(policy?.name).startsWith(`${policyName}_`))
            .sort((a, b) => String(b.createDate ?? '').localeCompare(String(a.createDate ?? '')));
        //A caller that publishes takes the published copy, or a draft it can publish itself. A
        //caller that asked for a draft gets a draft or nothing: handing it a published policy would
        //let it carry on against a policy whose token can no longer be configured, and fail later
        //and further away.
        const preferred = shouldPublish
            ? (matches.find((policy) => policy.status === 'PUBLISH') ?? matches.at(0))
            : matches.find((policy) => policy.status === 'DRAFT');
        //`null` rather than `undefined`: a `.then()` returning undefined yields the previous
        //subject, which would make the "not found" case look like a hit
        return cy.wrap(preferred ?? null, { log: false });
    });

    const publish = (authorization, policy) => {
        if (!shouldPublish || policy.status === 'PUBLISH') {
            return cy.wrap(policy, { log: false });
        }
        return cy.request({
            method: METHOD.PUT,
            url: `${API.ApiServer}${API.Policies}${policy.id}/${API.Publish}`,
            body: { policyVersion: '1.2.5' },
            headers: { authorization },
            timeout: 600000,
            failOnStatusCode: false,
        }).then((response) => {
            const message = String(response.body?.message ?? '');
            if (response.status !== STATUS_CODE.OK && message !== 'Policy already published') {
                throw new Error(`Publishing ${policyName} failed: ${response.status} ${message}`);
            }
            return findPolicy(authorization).then((published) => {
                expect(published, `${policyName} after publishing`).to.not.be.null;
                return published;
            });
        });
    };

    return Authorization.getAccessToken(username).then((authorization) =>
        findPolicy(authorization).then((existing) => {
            if (existing) {
                return publish(authorization, existing);
            }
            return seededMessageId('policy_for_compare1')
                .then((messageId) => importPolicyFromMessage(username, messageId))
                .then(() => findPolicy(authorization))
                .then((imported) => {
                    expect(imported, `${policyName} after importing it from its message`).to.not.be.null;
                    return publish(authorization, imported);
                });
        }));
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