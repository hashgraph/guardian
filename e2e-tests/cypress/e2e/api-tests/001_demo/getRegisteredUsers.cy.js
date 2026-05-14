import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Demo", { tags: ['demo', 'secondPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const regUsersUrl = `${API.ApiServer}${API.RegUsers}`;

    const getRegisteredUsersWithAuth = (authorization) =>
        cy.request({
            method: METHOD.GET,
            url: regUsersUrl,
            headers: { authorization },
        });

    const getRegisteredUsersWithoutAuth = (headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: regUsersUrl,
            headers,
            failOnStatusCode: false,
        });

    it("Returns list of registered users", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getRegisteredUsersWithAuth(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.at(0)).to.have.property("username");
                expect(response.body.at(0)).to.have.property("role");
                expect(response.body.at(0)).to.have.property("policyRoles");
            });
        });
    });

    it("Returns list of registered users without auth token - Negative", () => {
        getRegisteredUsersWithoutAuth().then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns list of registered users with invalid auth token - Negative", () => {
        getRegisteredUsersWithoutAuth({ authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns list of registered users with empty auth token - Negative", () => {
        getRegisteredUsersWithoutAuth({ authorization: "" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
