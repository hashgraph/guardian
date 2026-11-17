import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

context('Profiles', { tags: ['profiles', 'thirdPool', 'api-all', 'all', 'all-no-mgs'] }, () => {
    const Installer = Cypress.env('Installer');

    it('Set Hedera credentials for the Installer', () => {
        Authorization.getAccessToken(Installer).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + 'profiles/' + Installer,
                headers: { authorization }
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK)
                expect(response.body).to.have.property('confirmed')
                if (response.body.confirmed === true) { return; }
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + 'accounts/standard-registries/aggregated',
                    headers: { authorization }
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK)
                    expect(response.body).to.be.an('array').that.is.not.empty
                    let SRDid = response.body[0].did
                    cy.request({
                        method: METHOD.GET,
                        url: API.ApiServer + API.RandomKey,
                        headers: { authorization },
                        timeout: TIMEOUTS.backend
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.OK)
                        expect(response.body).to.have.property('id')
                        expect(response.body).to.have.property('key')
                        let hederaAccountId = response.body.id
                        let hederaAccountKey = response.body.key
                        cy.request({
                            method: 'PUT',
                            url: API.ApiServer + 'profiles/' + Installer,
                            body: {
                                hederaAccountId,
                                hederaAccountKey,
                                parent: SRDid
                            },
                            headers: { authorization },
                            timeout: TIMEOUTS.longOperation
                        }).then((response) => {
                            expect(response.status).to.eq(STATUS_CODE.NO_CONTENT)
                        })
                    })
                })
            })
        })
    })
})
