import { METHOD, STATUS_CODE } from './api-const';
import API from '../ApiUrls';
import { randomInt } from '../random';

// Shared helpers for the modules specs (007_modules and the module part of 012_analytics).
//
// Every spec is meant to be idempotent: it must build the modules it needs and must not
// depend on the position of a module in the list, nor on modules left behind by other
// specs or by previous runs.

export const modulesUrl = `${API.ApiServer}${API.ListOfAllModules}`;

// Omit the header entirely when no authorization is given, so the "without auth token"
// negative tests differ from the "empty auth token" ones
const headersFor = (authorization, extra = {}) => ({
    ...(authorization === undefined ? {} : { authorization }),
    ...extra,
});

// Merges the caller options into the request without letting `opts.headers` drop the
// authorization header, and lets `opts` override the defaults of each wrapper
const requestOptions = (authorization, opts = {}, extraHeaders = {}) => {
    const { headers, ...rest } = opts;
    return {
        headers: headersFor(authorization, { ...extraHeaders, ...headers }),
        ...rest,
    };
};

// --- requests ---------------------------------------------------------------

export const listModules = (authorization, opts = {}) =>
    cy.request({
        method: METHOD.GET,
        url: modulesUrl,
        ...requestOptions(authorization, opts),
    });

export const getModule = (authorization, uuid, opts = {}) =>
    cy.request({
        method: METHOD.GET,
        url: modulesUrl + uuid,
        ...requestOptions(authorization, opts),
    });

export const createModule = (authorization, body, opts = {}) =>
    cy.request({
        method: METHOD.POST,
        url: modulesUrl,
        body,
        ...requestOptions(authorization, opts),
    });

export const updateModule = (authorization, uuid, body, opts = {}) =>
    cy.request({
        method: METHOD.PUT,
        url: modulesUrl + uuid,
        body,
        ...requestOptions(authorization, opts),
    });

export const deleteModule = (authorization, uuid, opts = {}) =>
    cy.request({
        method: METHOD.DELETE,
        url: modulesUrl + uuid,
        ...requestOptions(authorization, opts),
    });

export const publishModule = (authorization, uuid, opts = {}) =>
    cy.request({
        method: METHOD.PUT,
        url: `${modulesUrl}${uuid}/${API.Publish}`,
        timeout: 180000,
        ...requestOptions(authorization, opts),
    });

export const validateModule = (authorization, body, opts = {}) =>
    cy.request({
        method: METHOD.POST,
        url: `${modulesUrl}${API.Validate}`,
        body,
        timeout: 180000,
        ...requestOptions(authorization, opts),
    });

export const exportModuleMessage = (authorization, uuid, opts = {}) =>
    cy.request({
        method: METHOD.GET,
        url: `${modulesUrl}${uuid}/${API.ExportMessage}`,
        timeout: 600000,
        ...requestOptions(authorization, opts),
    });

export const exportModuleFileResponse = (authorization, uuid, opts = {}) =>
    cy.request({
        method: METHOD.GET,
        url: `${modulesUrl}${uuid}/${API.ExportFile}`,
        encoding: null,
        timeout: 180000,
        ...requestOptions(authorization, opts),
    });

// Returns the exported archive as a Blob, ready to be posted back to an import endpoint
export const exportModuleFile = (authorization, uuid, opts = {}) =>
    exportModuleFileResponse(authorization, uuid, opts).then((response) => {
        expect(response.status).eql(STATUS_CODE.OK);
        return Cypress.Blob.binaryStringToBlob(Cypress.Blob.arrayBufferToBinaryString(response.body));
    });

export const importModuleFile = (authorization, file, opts = {}) =>
    cy.request({
        method: METHOD.POST,
        url: `${modulesUrl}${API.ImportFile}`,
        body: file,
        timeout: 180000,
        ...requestOptions(authorization, opts, { 'content-type': 'binary/octet-stream' }),
    });

// --- payloads ---------------------------------------------------------------

export const uniqueModuleName = (suffix) => randomInt(999999) + suffix;

export const moduleBody = (name, config = {}) => ({
    name,
    description: `${name} desc`,
    config: { blockType: 'module', ...config },
});

// An action block with no events is not valid on its own, which is what makes
// the module containing it invalid
export const actionBlock = (tag) => ({
    artifacts: [],
    blockType: 'interfaceActionBlock',
    children: [],
    defaultActive: true,
    events: [],
    id: randomInt(99999),
    permissions: [],
    tag,
});

export const invalidChildren = (tag = 'APIBlockModule1', tag2 = 'APIBlockModule2') =>
    [actionBlock(tag), actionBlock(tag2)];

// Fields the server regenerates: they have to be dropped before sending a module back
export const stripVolatileFields = (module) => {
    delete module._id;
    delete module.configFileId;
    delete module.type;
    delete module.updateDate;
    return module;
};

// An import response is binary, because the request body is a Blob. The buffer comes
// from another realm, so instanceof cannot be used to detect it.
export const parseBinaryJson = (body) => {
    if (Object.prototype.toString.call(body) === '[object ArrayBuffer]') {
        return JSON.parse(Cypress.Blob.arrayBufferToBinaryString(body));
    }
    return typeof body === 'string' ? JSON.parse(body) : body;
};

// --- fixtures ---------------------------------------------------------------

export const deleteModulesByName = (authorization, name) =>
    listModules(authorization).then((response) => {
        expect(response.status).eql(STATUS_CODE.OK);
        response.body
            .filter((item) => item.name === name)
            .forEach((item) => deleteModule(authorization, item.uuid, { failOnStatusCode: false }));
    });

// Resolves the draft module shared by the suite, creating it when it is missing. Only a draft
// can be edited, and the API rejects duplicate names, so a published namesake left by an
// earlier run is removed first.
export const resolveDraftModule = (authorization, name) =>
    listModules(authorization).then((response) => {
        expect(response.status).eql(STATUS_CODE.OK);
        const namesakes = response.body.filter((item) => item.name === name);
        const draft = namesakes.find((item) => item.status === 'DRAFT');
        if (draft) {
            return draft;
        }
        namesakes.forEach((item) => deleteModule(authorization, item.uuid, { failOnStatusCode: false }));
        return createModule(authorization, moduleBody(name)).then((res) => {
            expect(res.status).eql(STATUS_CODE.SUCCESS);
            return res.body;
        });
    });

// Creates a module that fails validation, and returns it as stored, ready to be sent
// back to the validate or publish endpoints
export const createInvalidModule = (authorization, name) =>
    createModule(authorization, moduleBody(name, { children: invalidChildren() })).then((response) => {
        expect(response.status).eql(STATUS_CODE.SUCCESS);
        return getModule(authorization, response.body.uuid).then((res) => {
            expect(res.status).eql(STATUS_CODE.OK);
            return stripVolatileFields(res.body);
        });
    });
