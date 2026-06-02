
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/checkingMethods";

context("Contracts", { tags: ['contracts', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    const contractsUrl = `${API.ApiServer}${API.ListOfContracts}`;

    const getContractsWithAuth = (authorization, qs = {}, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.GET,
            url: contractsUrl,
            headers: { authorization },
            qs,
            failOnStatusCode,
        });

    const getContractsWithoutAuth = (qs = {}, headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: contractsUrl,
            headers,
            qs,
            failOnStatusCode: false,
        });

    it("Get list of retire contracts", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getContractsWithAuth(authorization, { type: "RETIRE" }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.at(-1)).to.have.property("_id");
                expect(response.body.at(-1)).to.have.property("contractId");
                expect(response.body.at(-1)).to.have.property("type");
                expect(response.body.at(-1).type).eql("RETIRE");
                expect(response.body.at(-1)).to.have.property("description");
                expect(response.body.at(-1)).to.have.property("owner");
            });
        });
    });

    it("Get list of wipe contracts", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getContractsWithAuth(authorization, { type: "WIPE" }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.at(-1)).to.have.property("_id");
                expect(response.body.at(-1)).to.have.property("contractId");
                expect(response.body.at(-1)).to.have.property("type");
                expect(response.body.at(-1).type).eql("WIPE");
                expect(response.body.at(-1)).to.have.property("description");
                expect(response.body.at(-1)).to.have.property("owner");
            });
        });
    });

    it("Get list of contracts without auth token - Negative", () => {
        getContractsWithoutAuth().then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of contracts with invalid auth token - Negative", () => {
        getContractsWithoutAuth({}, { authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of contracts with empty auth token - Negative", () => {
        getContractsWithoutAuth({}, { authorization: "" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of contracts as User", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            getContractsWithAuth(authorization, {}, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.at(-1)).to.have.property("_id");
                expect(response.body.at(-1)).to.have.property("contractId");
                expect(response.body.at(-1)).to.have.property("type");
                expect(response.body.at(-1).type).eql("RETIRE");
                expect(response.body.at(-1)).to.have.property("description");
                expect(response.body.at(-1)).to.have.property("owner");
            });
        });
    });

});
