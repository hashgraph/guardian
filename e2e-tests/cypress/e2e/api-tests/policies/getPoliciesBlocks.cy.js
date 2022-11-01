import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";



context("Policies", { tags: '@policies' },() => {
    const authorization = Cypress.env("authorization");

    before(() => {
        cy.request({
          method: 'POST',
          url: `${Cypress.env('api_server')}policies/import/message`,
          body: { messageId: (Cypress.env('irec_policy')) },
          headers: {
            authorization,
          },
          timeout: 180000
        }).then(response => {
          let firstPolicyId = response.body.at(-1).id
          let firstPolicyStatus = response.body.at(-1).status
          expect(firstPolicyStatus).to.equal('DRAFT')
          cy.request({
            method: 'PUT',
            url: Cypress.env('api_server') + 'policies/' + firstPolicyId + '/publish',
            body: { policyVersion: "1.2.5" },
            headers: { authorization },
            timeout: 600000
          })
            .should((response) => {
              let secondPolicyId = response.body.policies.at(-1).id
              let policyStatus = response.body.policies.at(-1).status
              expect(response.status).to.eq(200)
              expect(response.body).to.not.be.oneOf([null, ""])
              expect(firstPolicyId).to.equal(secondPolicyId)
              expect(policyStatus).to.equal('PUBLISH')
            })
        })
      })
    it("check returns of the blocks", () => {
        const urlPolicies = {
            method: "GET",
            url: API.ApiServer + "policies",
            headers: {
                authorization,
            },
        };

        cy.request(urlPolicies).should((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(-1).id;
            
            const url = {
                method: "GET",
                url:
                    API.ApiServer +
                    "policies/" +
                    policyId +
                    "/blocks",
                headers: {
                    authorization,
                },
            };
            cy.request(url).should((response) => {

                expect(response.status).to.eq(200);
                expect(response.body).to.not.be.oneOf([null, ""]);
                // //Wrong check. Response.body.id - is block id, not policy id.
                // //expect(response.body.id).to.equal(policyId)
                // cy.writeFile("cypress/fixtures/blockId.json", {
                //     policyId: policyId,
                //     policyUuid: policyUuid,
                //     blockId: blockId,
                // });
            });
        });
    });
});
