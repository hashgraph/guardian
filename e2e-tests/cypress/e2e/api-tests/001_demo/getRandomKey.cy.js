
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Demo", { tags: ['demo', 'secondPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const randomKeyUrl = `${API.ApiServer}${API.RandomKey}`;

    const getRandomKeyWithAuth = (authorization) =>
        cy.request({
            method: METHOD.GET,
            url: randomKeyUrl,
            headers: { authorization },
        });

    const getRandomKeyWithoutAuth = (headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: randomKeyUrl,
            headers,
            failOnStatusCode: false,
        });

    it("Generates a new Hedera account with a random private key", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getRandomKeyWithAuth(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.have.property("id");
                expect(response.body).to.have.property("key");
            });
        });
    });

    it("Generates a new Hedera account with a random private key without auth token - Negative", () => {
        getRandomKeyWithoutAuth().then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Generates a new Hedera account with a random private key with invalid auth token - Negative", () => {
        getRandomKeyWithoutAuth({ authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Generates a new Hedera account with a random private key with empty auth token - Negative", () => {
        getRandomKeyWithoutAuth({ authorization: "" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
