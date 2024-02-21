import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Policies', { tags: '@policies' }, () => {
    const authorization = Cypress.env('authorization');

    before(() => {

        const urlPolicies = {
            method: "GET",
            url: API.ApiServer + "policies",
            headers: {
                authorization,
            },
        };

        cy.request(urlPolicies).then((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(-1).id;

            const url = {
                method: 'GET',
                url: API.ApiServer + 'policies/' + policyId + '/export/file',
                encoding: null,
                headers: {
                    authorization
                }
            }
            cy.request(url).then((response) => {
                let policy = Cypress.Blob.arrayBufferToBinaryString(response.body)
                cy.writeFile('cypress/fixtures/exportedPolicy.policy', policy, 'binary')
            })
        })
    })


    it('check returns of all policies', () => {
        cy.fixture('exportedPolicy.policy', 'binary').then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: 'POST',
                    url: API.ApiServer + 'policies/import/file',
                    body: file,
                    headers: {
                        'content-type': 'binary/octet-stream',
                        authorization
                    },
                    timeout: 180000
                })
                    .then(response => {
                        let responseTextJSon = JSON.parse(Cypress.Blob.arrayBufferToBinaryString(response.body))
                        let firstPolicyId = responseTextJSon.at(0).id
                        let firstPolicyStatus = responseTextJSon.at(0).status
                        expect(firstPolicyStatus).to.equal('DRAFT')
                        cy.request({
                            method: 'PUT',
                            url: API.ApiServer + 'policies/' + firstPolicyId + '/publish',
                            body: {policyVersion: "1.2.5"},
                            headers: {authorization},
                            timeout: 600000
                        })
                            .then((response) => {
                                let secondPolicyId = response.body.policies.at(0).id
                                let policyStatus = response.body.policies.at(0).status
                                expect(response.status).to.eq(200)
                                expect(response.body).to.not.be.oneOf([null, ""])
                                expect(firstPolicyId).to.equal(secondPolicyId)
                                expect(policyStatus).to.equal('PUBLISH')
                            })
                    })
            })
    })
})
