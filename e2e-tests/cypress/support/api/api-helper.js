/**
 * Method to send request
 * @param {String} method Request method
 * @param {String} endpoint Endpoint resource
 * @param {Object} [data] Body data
 * @param {Object} [headers] Ane specific headers for the request
 * @return {Object} response
 */
Cypress.Commands.add('sendRequest', (method, endpoint, data, headers) => {
    let requestParams = {
        method,
        url: endpoint,
        failOnStatusCode: false,
        headers,
        body: data,
    };

    return cy.request(requestParams);
});
