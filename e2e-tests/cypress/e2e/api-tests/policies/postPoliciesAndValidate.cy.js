import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context(" Policies", { tags: '@policies' }, () => {
    const authorization = Cypress.env("authorization");


    before(() => {
        cy.request({
          method: 'POST',
          url: API.ApiServer + 'policies/import/message',
          body: { "messageId":"1707125414.999819805"}, //iRec5
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
            url: API.ApiServer + 'policies/' + firstPolicyId + '/publish',
            body: { policyVersion: "1.2.5" },
            headers: { authorization },
            timeout: 600000
          })
            .then((response) => {
              let secondPolicyId = response.body.policies.at(-1).id
              let policyStatus = response.body.policies.at(-1).status
              expect(response.status).to.eq(200)
              expect(response.body).to.not.be.oneOf([null, ""])
              expect(firstPolicyId).to.equal(secondPolicyId)
              expect(policyStatus).to.equal('PUBLISH')
            })
        })
      })

    it("Validate the policy", () => {
        cy.request({
            method: "GET",
            url: API.ApiServer + "policies",
            headers: { authorization }
        }).then((response) => {
                expect(response.status).to.eq(200);
                const policyId = response.body.at(-1).id;
                cy.request({
                    method: 'GET',
                    url: API.ApiServer + 'policies/' + policyId,
                    headers: {
                        authorization,
                    }}).then((response) => {
                    const config = response.body.config;
                    const policyGroups = response.body.policyGroups;
                    const policyRoles = response.body.policyRoles;
                    const policyTokens = response.body.policyTokens;
                    const policyTopics = response.body.policyTopics;
                    const topicId = response.body.topicId;

                    cy.request({
                        method: "POST",
                        url: API.ApiServer + "policies/validate",
                        headers: { authorization },
                        body:
                            {
                                config,
                                policyGroups,
                                policyRoles,
                                policyTokens,
                                policyTopics,
                                topicId
                            }
                    }).then((response) => {
                        expect(response.status).to.eq(200);
                    });
                })
            });
    });
});

