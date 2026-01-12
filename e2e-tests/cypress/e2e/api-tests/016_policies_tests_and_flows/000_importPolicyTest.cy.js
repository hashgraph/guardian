import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context('Import policy test', { tags: ['policies', 'secondPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let policyId;

    before('Get policy id', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            // 1. Import File
            cy.importPolicyFile(authorization, "iRecDRF.policy").then(() => {
                // 2. Get List and find ID
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies,
                    headers: { authorization },
                    timeout: 180000
                }).then((response) => {
                    policyId = response.body.find(p => p.name === "iRecDRF")?.id;
                    
                    // 3. Set to Dry Run
                    cy.request({
                        method: METHOD.PUT,
                        url: `${API.ApiServer}${API.Policies}${policyId}/${API.DryRun}`,
                        headers: { authorization },
                        timeout: 180000,
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.OK);
                    });
                });
            });
        });
    });

    it('Import a new policy test', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.importPolicyTest(authorization, policyId, "iRecFullFlow.record").then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                const decodedBody = JSON.parse(new TextDecoder().decode(response.body));
                expect(decodedBody.at(0).policyId).to.eq(policyId);
            });
        });
    });

    it("Import a new policy test without auth token - Negative", () => {
        cy.importPolicyTest(null, policyId, "iRecFullFlow.record").then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Import a new policy test with invalid auth token - Negative", () => {
        cy.importPolicyTest("Bearer wqe", policyId, "iRecFullFlow.record").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Import a new policy test with empty auth token - Negative", () => {
        cy.importPolicyTest("", policyId, "iRecFullFlow.record").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Import a new policy test without policy test file", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: `${API.ApiServer}${API.Policies}${policyId}/${API.Test}`,
                headers: { authorization },
                failOnStatusCode: false,
                timeout: 180000,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.BAD_REQUEST);
            });
        });
    });
    
});