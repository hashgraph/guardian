import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Accounts',  { tags: '@accounts' }, () => {

    it('should be able to login as a StandardRegistry', () => {
        cy.request('POST', (API.ApiServer + 'accounts/login'), {
            username: 'StandardRegistry',
            password: 'test'
        }).should((response) => {
            expect(response.status).to.eq(200)
            expect(response.body).to.have.property('username', 'StandardRegistry')
            expect(response.body).to.have.property('role', 'STANDARD_REGISTRY')
            expect(response.body).to.have.property('accessToken')
        })
    })

    it('should be able to login as a Installer', () => {
        cy.request('POST', (API.ApiServer + 'accounts/login'), {
            username: 'Installer',
            password: 'test'
        }).should((response) => {
            expect(response.status).to.eq(200)
            expect(response.body).to.have.property('username', 'Installer')
            expect(response.body).to.have.property('role')
            expect(response.body).to.have.property('accessToken')
        })
    })

    it('should attempt to put sql injection', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountsLogin,
            headers: {
                username: 'select * from users where id = 1 or 1=1',
                password: "test",
            },
            failOnStatusCode:false,
        }).should(response => {
            expect(response.status).eql(STATUS_CODE.ERROR);
        });
    });
})
