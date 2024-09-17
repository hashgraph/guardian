import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Policies", { tags: ['policies', 'secondPool'] }, () => {
  const SRUsername = Cypress.env('SRUser');

  before(() => {
    Authorization.getAccessToken(SRUsername).then((authorization) => {
      cy.request({
        method: 'POST',
        url: API.ApiServer + 'policies/import/message',
        body: { messageId: (Cypress.env('irec_policy')) },
        headers: {
          authorization,
        },
        timeout: 180000
      }).then(response => {
        expect(response.status).to.eq(201);
        let firstPolicyId = response.body.at(0).id
        let firstPolicyStatus = response.body.at(0).status
        expect(firstPolicyStatus).to.equal('DRAFT')
        cy.request({
          method: 'PUT',
          url: API.ApiServer + 'policies/' + firstPolicyId + '/publish',
          body: { policyVersion: "1.2.5" },
          headers: { authorization },
          timeout: 600000
        })
          .then((response) => {
            let secondPolicyId = response.body.policies.at(0).id
            let policyStatus = response.body.policies.at(0).status
            expect(response.status).to.eq(200)
            expect(firstPolicyId).to.equal(secondPolicyId)
            expect(policyStatus).to.equal('PUBLISH')
          })
      })
    })
  })

  it("Get data from the root policy block", () => {
    Authorization.getAccessToken(SRUsername).then((authorization) => {
      const urlPolicies = {
        method: METHOD.GET,
        url: API.ApiServer + API.Policies,
        headers: {
          authorization,
        },
        timeout: 180000
      };

      cy.request(urlPolicies).then((response) => {
        expect(response.status).to.eq(STATUS_CODE.OK);
        const policyId = response.body.at(0).id;

        const url = {
          method: METHOD.GET,
          url:
            API.ApiServer +
            "policies/" +
            policyId +
            "/blocks",
          headers: {
            authorization,
          },
          timeout: 180000
        };
        cy.request(url).then((response) => {
          expect(response.status).to.eq(STATUS_CODE.OK);
          expect(response.body).to.not.be.oneOf([null, ""]);
        });
      });
    })
  });
});
