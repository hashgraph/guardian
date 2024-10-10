import { METHOD } from "./api-const";

/**
 * Method to send request
 * @param {String} method Request method
 * @param {String} endpoint Endpoint resource
 * @param {Object} [data] Body data
 * @param {Object} [headers] Ane specific headers for the request
 * @return {Object} response
 */
Cypress.Commands.add("sendRequest", (method, endpoint, headers) => {
    let requestParams = {
        method: method,
        url: endpoint,
        failOnStatusCode: false,
        headers: headers,
    };

    return cy.request(requestParams);
});

// Cypress.Commands.add("generateUID", () => {
//     "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
//         const r = (Math.random() * 16) | 0,
//             v = c == "x" ? r : (r & 0x3) | 0x8;
//         return v.toString(16);
//     });
// });
