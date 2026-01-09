
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context('Get balance', () => {

    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const balanceUrl = `${API.ApiServer}${API.Balance}`;

    const getBalanceWithAuth = (authorization) =>
        cy.request({
            method: METHOD.GET,
            url: balanceUrl,
            headers: { authorization },
        });

    const getBalanceWithoutAuth = (headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: balanceUrl,
            headers,
            failOnStatusCode: false,
        });

    it("Get Standard Registry balance", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getBalanceWithAuth(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.unit).eql("Hbar");
                expect(response.body.user.username).eql(SRUsername);
            });
        });
    });

    it("Get User balance", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            getBalanceWithAuth(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.unit).eql("Hbar");
                expect(response.body.user.username).eql(UserUsername);
            });
        });
    });

    it("Get balance without auth token - Negative", () => {
        getBalanceWithoutAuth().then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get balance with invalid auth token - Negative", () => {
        getBalanceWithoutAuth({
            authorization: "Bearer wqe",
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get balance with empty auth token - Negative", () => {
        getBalanceWithoutAuth({
            authorization: "",
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
