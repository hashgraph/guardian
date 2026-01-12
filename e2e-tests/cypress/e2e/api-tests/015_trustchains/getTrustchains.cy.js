import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Trustchains", { tags: ['trustchains', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let policyId;

    before("Get policy id for trustchain", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: { authorization }
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                // Optimized search for the specific policy
                const targetPolicy = response.body.find(p => p.name === "iRec_4");
                policyId = targetPolicy ? targetPolicy.id : response.body.at(0).id;
            });
        });
    });

    it('Get all VP documents and hash', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.getTrustChain(authorization, policyId).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.have.property("hash");
            });
        });
    });

    it("Get all VP documents and hash without auth token - Negative", () => {
        cy.getTrustChain(null, policyId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get all VP documents and hash with invalid auth token - Negative", () => {
        cy.getTrustChain("Bearer wqe", policyId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get all VP documents and hash with empty auth token - Negative", () => {
        cy.getTrustChain("", policyId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});