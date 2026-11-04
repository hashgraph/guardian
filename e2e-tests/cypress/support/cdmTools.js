import { METHOD, STATUS_CODE } from './api/api-const';
import API from './ApiUrls';

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
            form.append('metadata', JSON.stringify({ tools: overrides }), 'metadata.json');
            return cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ToolsImportFileMetadata,
                body: form,
                headers: { authorization },
                timeout: 180000,
            });
        })
        .then((response) => {
            expect(response.status, `importing tool ${name}`).to.eq(STATUS_CODE.SUCCESS);
            return response.body;
        })
        .then((tool) => {
            expect(tool.id, `importing tool ${name}`).to.not.be.undefined;
            return cy.request({
                method: METHOD.PUT,
                url: `${API.ApiServer}${API.Tools}${tool.id}/${API.Publish}`,
                body: { toolVersion: '1.0.0' },
                headers: { authorization, 'content-type': 'application/json' },
                timeout: 180000,
            });
        })
        .then((response) => {
            expect(response.status, `publishing tool ${name}`).to.eq(STATUS_CODE.OK);
            expect(response.body.isValid, `publishing tool ${name}: ${JSON.stringify(response.body.errors)}`).to.be.true;
            local[name] = response.body.tool.messageId;
        });
};

/**
 * Import and publish the CDM library tools an archive references, in the
 * given (dependency-first) order. Returns a map of tool name -> local
 * published messageId: the values a policy import must remap its references
 * to. Every referenced tool must appear exactly once, with each of its
 * dependencies listed before it.
 */
export const prepareTools = (toolNames, authorization) => {
    const local = {};
    return toolNames
        .reduce((chain, name) => chain.then(() => importAndPublishTool(name, authorization, local)), Promise.resolve())
        .then(() => local);
};

// `cy.request` returns the parsed object for JSON responses but an ArrayBuffer
// (or a string) for anything else; normalize all shapes to the decoded object.
export const parseImportResponse = (body) => {
    if (body instanceof ArrayBuffer) {
        return JSON.parse(new TextDecoder('utf-8').decode(body));
    }
    if (typeof body === 'string') {
        return JSON.parse(body);
    }
    return body;
};
