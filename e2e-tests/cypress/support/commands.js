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
  
import { METHOD } from "./api/api-const";
import API from "./ApiUrls";

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
            name: name,
            description: name,
            entity: entity,
            target: target,
        },
        failOnStatusCode: false,
    });
});

Cypress.Commands.add('searchTags', (token, targetId, entity) => {
    return cy.request({
        method: METHOD.POST,
        url: API.ApiServer + API.Tags + "search",
        headers: token ? { authorization: token } : {},
        body: {
            entity: entity,
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
    return cy.fixture(fileName, "binary")
        .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
        .then((file) => {
            return cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.PolicisImportFile,
                body: file,
                headers: {
                    "content-type": "binary/octet-stream",
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
        if (!policy) throw new Error(`Policy with name "${policyName}" not found`);
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

Cypress.Commands.add('getHederaKeys', (token) => {
    return cy.request({
        method: 'GET',
        url: `${API.ApiServer}${API.RandomKey}`,
        headers: { authorization: token },
        timeout: 600000
    }).then((res) => {
        cy.wait(3000); // Wait for Hedera propagation
        return { id: res.body.id, key: res.body.key };
    });
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