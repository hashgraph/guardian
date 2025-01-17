import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Accounts',  { tags: ['accounts', 'firstPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    it('Login as Standard Registry', { tags: ['smoke'] }, () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: SRUsername,
                password: 'test'
            }
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.OK)
            expect(response.body).to.have.property('username', SRUsername)
            expect(response.body).to.have.property('role', 'STANDARD_REGISTRY')
            expect(response.body).to.have.property('did')
            expect(response.body).to.have.property('refreshToken')
        })
    })

    it('Login as User', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: UserUsername,
                password: 'test'
            }
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.OK)
            expect(response.body).to.have.property('username', UserUsername)
            expect(response.body).to.have.property('role', 'USER')
            expect(response.body).to.have.property('refreshToken')
        })
    })

    it('Login with sql injection - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountsLogin,
            headers: {
                username: 'select * from users where id = 1 or 1=1',
                password: "test",
            },
            failOnStatusCode:false,
        }).should(response => {
            expect(response.status).eql(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Login with empty username - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountsLogin,
            headers: {
                username: '',
                password: "test",
            },
            failOnStatusCode:false,
        }).then(response => {
            expect(response.status).eql(STATUS_CODE.UNPROCESSABLE);
            expect(response.body.message.at(0)).eql("username should not be empty");
        });
    });

    it('Login with empty password - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountsLogin,
            headers: {
                username: "StandardRegistry",
                password: '',
            },
            failOnStatusCode:false,
        }).then(response => {
            expect(response.status).eql(STATUS_CODE.UNPROCESSABLE);
            expect(response.body.message.at(2)).eql("password should not be empty");
        });
    });
})
