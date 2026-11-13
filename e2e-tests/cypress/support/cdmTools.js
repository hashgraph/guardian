import { METHOD, STATUS_CODE } from './api/api-const';
import API from './ApiUrls';
import { TIMEOUTS, POLL_INTERVAL } from './CustomHelpers/timeouts';

// The CDM library tool archives were exported from testnet, so the nested tool
// references they contain carry testnet messageIds. Those messages do not
// exist on the network the stack runs on: the import cannot fetch them, and a
// policy import answers 500 for every reference it cannot resolve locally.
//
// The import metadata remaps references by messageId to locally imported
// copies. A remap only applies when the target tool is PUBLISHED, and
// publishing assigns the tool a new messageId, so each tool is imported and
// published before the tools that nest it.
//
// The sub-reference messageIds below are part of the committed .tool files,
// so they are stable.
const TOOLS_DIR = '../Methodology Library/Clean Development Mechanism (CDM)/Tools/';

const TOOL_SUB_REFS = {
    'Tool 05': {
        '1706867530.884259218': 'Tool 07',
    },
    'Tool 12': {
        '1706867833.676387003': 'Tool 03',
    },
    'Tool 13': {
        '1706867833.676387003': 'Tool 03',
        '1707833182.503204122': 'Tool 05',
        '1706867530.884259218': 'Tool 07',
        '1719308234.078552003': 'Tool 04',
    },
    'Tool 14': {
        '1707068762.886477003': 'Tool 06',
        '1719308448.665936003': 'Tool 13',
        '1706867833.676387003': 'Tool 03',
        '1707833182.503204122': 'Tool 05',
        '1706867530.884259218': 'Tool 07',
        '1719308234.078552003': 'Tool 04',
    },
    'Tool 16': {
        '1707834520.925981198': 'Tool 01',
        '1709106946.913157840': 'Tool 12',
        '1706867833.676387003': 'Tool 03',
        '1719310223.735760003': 'Tool 14',
        '1707068762.886477003': 'Tool 06',
        '1719308448.665936003': 'Tool 13',
        '1707833182.503204122': 'Tool 05',
        '1706867530.884259218': 'Tool 07',
        '1719308234.078552003': 'Tool 04',
    },
};

// A re-import of an existing name is renamed with a `_timestamp` suffix.
export const namePattern = (name) => new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(_\\d+)?$`);

// The last imported copy of a policy, among the original and its renamed re-imports.
export const newestPolicyCopy = (policies, name) => policies
    .filter((policy) => namePattern(name).test(policy?.name ?? ''))
    .sort((a, b) => String(b.createDate ?? '').localeCompare(String(a.createDate ?? '')))
    .at(0);

// Chromium's FormData rejects a three-argument append whose value is a string
// (the filename is only valid on a blob part), so metadata parts are wrapped
// in a native blob.
export const metadataPart = (metadata) => new Blob([JSON.stringify(metadata)], { type: 'application/json' });

// `cy.request` hands the response back as an ArrayBuffer whenever the request
// body was binary (FormData / Blob), even though the response is JSON. The
// buffer is created in another JS realm, so `instanceof ArrayBuffer` fails
// across the boundary and the buffer must be duck-typed instead.
export const decodeBody = (body) => {
    if (body && typeof body === 'object' && body.byteLength !== undefined) {
        return new TextDecoder('utf-8').decode(body);
    }
    if (typeof body === 'string') {
        return body;
    }
    return JSON.stringify(body);
};

// Parsed view of an import response: the import routes answer with the
// freshly imported entity (tool) or the full policy list, newest first.
export const parseImportResponse = (response) => {
    const text = decodeBody(response.body);
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch (error) {
        throw new Error(`import response is not JSON (${error.message}): ${text.slice(0, 500)}`, { cause: error });
    }
    if (!parsed) {
        throw new Error(`import response body is empty: ${text.slice(0, 500)}`);
    }
    return parsed;
};

// The import flow runs live Hedera steps (account/topic resolution, publish);
// a flaky node answers 500 that a plain retry clears, so retry a bounded
// number of times and then fail with the decoded error body.
const requestWithRetry = (options, label, expectedStatus, attempts = 3) => {
    return cy.request({ ...options, failOnStatusCode: false }).then((response) => {
        if (response.status === expectedStatus) {
            return response;
        }
        if (response.status === 500 && attempts > 1) {
            return cy.wait(POLL_INTERVAL).then(() => requestWithRetry(options, label, expectedStatus, attempts - 1));
        }
        throw new Error(`${label}: status ${response.status} (expected ${expectedStatus}), body: ${decodeBody(response.body).slice(0, 500)}`);
    });
};

// Import one tool archive with its sub-reference remaps applied, then publish
// it and record the published messageId. `local` maps tool name -> published
// messageId of the tools imported so far; the remap targets must already be
// published, so dependencies must be listed first.
const importAndPublishTool = (name, authorization, local) => {
    const overrides = Object.fromEntries(
        Object.entries(TOOL_SUB_REFS[name] ?? {}).map(([sourceMessageId, targetName]) => [sourceMessageId, local[targetName]])
    );

    return cy.readFile(`${TOOLS_DIR}${name}/${name}.tool`, 'binary')
        .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
        .then((file) => {
            const form = new FormData();
            form.append('file', file, `${name}.tool`);
            form.append('metadata', metadataPart({ tools: overrides }), 'metadata.json');
            return requestWithRetry({
                method: METHOD.POST,
                url: API.ApiServer + API.ToolsImportFileMetadata,
                body: form,
                headers: { authorization },
                timeout: TIMEOUTS.longOperation,
            }, `importing tool ${name}`, STATUS_CODE.SUCCESS);
        })
        .then((response) => {
            // The import answers with the freshly created draft tool.
            const tool = parseImportResponse(response);
            expect(tool.name, `importing tool ${name}`).to.satisfy((value) => namePattern(name).test(value ?? ''));
            return requestWithRetry({
                method: METHOD.PUT,
                url: `${API.ApiServer}${API.Tools}${tool.id}/publish`,
                body: { toolVersion: '1.0.0' },
                headers: { authorization, 'content-type': 'application/json' },
                timeout: TIMEOUTS.longOperation,
            }, `publishing tool ${name}`, STATUS_CODE.OK);
        })
        .then((response) => {
            // The publish DTO carries the new messageId the policy import must
            // remap its references to.
            const result = parseImportResponse(response);
            expect(result.isValid, `publishing tool ${name}: ${JSON.stringify(result.errors ?? {})}`).to.be.true;
            expect(result.tool?.messageId, `publishing tool ${name}: no messageId in the publish response`).to.be.a('string');
            local[name] = result.tool.messageId;
        });
};

/**
 * Import and publish the CDM library tools an archive references, in the
 * given (dependency-first) order. Returns a Cypress chain that yields a map
 * of tool name -> local published messageId: the values a policy import must
 * remap its references to. Every referenced tool must appear exactly once,
 * with each of its dependencies listed before it.
 *
 * The sequence must stay in the Cypress queue (seeded with cy.then, not a
 * real Promise): a real Promise adopts the returned chain by settling it from
 * the chain's *current* tail, but the import/publish requests are enqueued
 * lazily from later callbacks — after that settle point — so the Promise
 * would resolve with an empty map before any request ran.
 */
export const prepareTools = (toolNames, authorization) => {
    const local = {};
    return toolNames
        .reduce((chain, name) => chain.then(() => importAndPublishTool(name, authorization, local)), cy.then(() => null))
        .then(() => local);
};

// Import a policy archive with its tool-reference remaps applied. The import
// answers with the full policy list (newest first), so the imported row is
// located by name and returned for the caller to assert on.
export const importPolicyArchive = (archivePath, fileName, displayName, authorization, toolRemaps) => {
    return cy.readFile(archivePath, 'binary')
        .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
        .then((file) => {
            const form = new FormData();
            form.append('policyFile', file, fileName);
            form.append('metadata', metadataPart({ tools: toolRemaps }), 'metadata.json');
            return requestWithRetry({
                method: METHOD.POST,
                url: API.ApiServer + API.PolicisImportFileMetadata,
                body: form,
                headers: { authorization },
                timeout: TIMEOUTS.longOperation,
            }, `importing policy ${displayName}`, STATUS_CODE.SUCCESS);
        })
        .then((response) => {
            const policies = parseImportResponse(response);
            const rows = Array.isArray(policies) ? policies : [policies];
            const policy = rows.find((row) => namePattern(displayName).test(row?.name ?? ''));
            expect(policy, `importing policy ${displayName}: no row named "${displayName}" in the import response (${rows.length} rows)`).to.exist;
            return policy;
        });
};

// The cdmAR3 archive references no tools, so it goes through the plain import
// route (no metadata part). The route answers with the full policy list.
export const importPolicyFile = (archivePath, fileName, displayName, authorization) => {
    return cy.readFile(archivePath, 'binary')
        .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
        .then((file) => requestWithRetry({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicisImportFile,
            body: file,
            headers: { 'content-type': 'binary/octet-stream', authorization },
            timeout: TIMEOUTS.longOperation,
        }, `importing policy ${displayName}`, STATUS_CODE.SUCCESS))
        .then((response) => {
            const policies = parseImportResponse(response);
            const rows = Array.isArray(policies) ? policies : [policies];
            const policy = rows.find((row) => namePattern(displayName).test(row?.name ?? ''));
            expect(policy, `importing policy ${displayName}: no row named "${displayName}" in the import response (${rows.length} rows)`).to.exist;
            return policy;
        });
};
