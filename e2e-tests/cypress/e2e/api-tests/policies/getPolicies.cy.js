import {METHOD, STATUS_CODE} from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Policies', {tags: '@policies'}, () => {
    const authorization = Cypress.env('authorization');

    before(() => {
        cy.request({
            method: 'POST',
            url: API.ApiServer + 'policies/import/message',
            body: {messageId: (Cypress.env('irec_policy'))},
            headers: {
                authorization,
            },
            timeout: 180000
        }).then(response => {
            expect(response.status).to.eq(201);
            let firstPolicyId = response.body.at(-1).id
            let firstPolicyStatus = response.body.at(-1).status
            expect(firstPolicyStatus).to.equal('DRAFT')
            cy.request({
                method: 'PUT',
                url: API.ApiServer + 'policies/' + firstPolicyId + '/publish',
                body: {policyVersion: "1.2.5"},
                headers: {authorization},
                timeout: 600000
            })
                .should((response) => {
                    let secondPolicyId = response.body.policies.at(-1).id
                    let policyStatus = response.body.policies.at(-1).status
                    expect(response.status).to.eq(200)
                    expect(firstPolicyId).to.equal(secondPolicyId)
                    expect(policyStatus).to.equal('PUBLISH')
                })
        })
    })

    it('Get all policies', () => {
        const urlPolicies = {
            method: 'GET',
            url: API.ApiServer + 'policies',
            headers: {
                authorization,
            }
        };

        cy.request(urlPolicies)
            .then((response) => {
                expect(response.status).to.eq(200)
                let createDate = response.body.at(-1).createDate
                let policyId = response.body.at(-1).id
                let policyUuid = response.body.at(-1).uuid
                let creator = response.body.at(-1).creator
                let description = response.body.at(-1).description
                let messageId = response.body.at(-1).messageId
                let name = response.body.at(-1).name
                let owner = response.body.at(-1).owner
                let policyTag = response.body.at(-1).policyTag
                let version = response.body.at(-1).version
                cy.writeFile('cypress/fixtures/policy.json',
                    {
                        policyId: policyId,
                        policyUuid: policyUuid,
                        createDate: createDate,
                        creator: creator,
                        description: description,
                        messageId: messageId,
                        name: name,
                        owner: owner,
                        policyTag: policyTag,
                        version: version
                    })
            })
    })
})
