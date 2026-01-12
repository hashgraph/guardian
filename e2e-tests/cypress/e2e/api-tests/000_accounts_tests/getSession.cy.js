import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context('Get session', { tags: ['accounts', 'firstPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    it('Get user session as Standard Registry', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.AccountSession,
                headers: {
                    authorization,
                }
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK)
                expect(response.body).to.have.property('id')
                expect(response.body).to.have.property('did')
                expect(response.body).to.have.property('hederaAccountId')
                expect(response.body.username).eq(SRUsername)
                expect(response.body.role).eq('STANDARD_REGISTRY')
            })
        })
    })

    it('Get user session as User', () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.AccountSession,
                headers: {
                    authorization
                }
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK)
                expect(response.body).to.have.property('id')
                expect(response.body.username).eq(UserUsername)
                expect(response.body.role).eq('USER')
            })
        })
    })

    it('Get user session with empty token - Negative', () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.AccountSession,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.OK)
            expect(response.body).to.eq(null)
        })
    })

    it('Get user session with invalid token - Negative', () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.AccountSession,
            headers: {
                authorization: "Bearer 21321232121",
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED)
        })
    })

    it('Get user session without token - Negative', () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.AccountSession,
            headers: {
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.OK)
            expect(response.body).to.eq(null)
        })
    })
})