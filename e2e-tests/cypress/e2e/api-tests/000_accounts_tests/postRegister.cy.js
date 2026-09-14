import { randomInt } from '../../../support/random';
import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import { registerUser } from '../../../support/api/accounts';
import { expectedPasswordError } from '../../../support/passwordPolicy';

context('Register', { tags: ['accounts', 'firstPool', 'all', 'all-no-mgs'] }, () => {
    // NODE: using a fixed name until a cleanup via DELETE account is implemented in the API
    const name = `TestUserRegistration2_${randomInt(99999)}`;
    const SRUsername = Cypress.env('SRUser');
    let credentials;

    before(() => {
        cy.fixture('credentials').then((creds) => {
            credentials = creds;
        });
    });

    // TODO: delete the created user here once DELETE /accounts is implemented in the API

    const postRegister = (body = {}, failOnStatusCode = false) => {
        cy.log('postRegister body: ' + JSON.stringify(body));
        return cy.request({
            method: METHOD.POST,
            url: `${API.ApiServer}${API.AccountRegister}`,
            body,
            failOnStatusCode,
        });
    };

    it('Register and login as new user', { tags: ['smoke'] }, () => {
        registerUser(name).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.SUCCESS);
            expect(response.body).to.have.property('username', name);
            expect(response.body).to.have.property('id');
            cy.request({
                method: METHOD.POST,
                url: `${API.ApiServer}${API.AccountsLogin}`,
                body: {
                    username: name,
                    password: credentials.goodPassword
                }
            }).then((loginRes) => {
                expect(loginRes.status).to.eq(STATUS_CODE.OK);
                expect(loginRes.body).to.have.property('username', name);
                expect(loginRes.body).to.have.property('role', 'USER');
            });
        });
    });

    it('Register without body - Negative', () => {
        postRegister({}).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Register without username - Negative', () => {
        postRegister({ password: credentials.goodPassword }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Register without password - Negative', () => {
        postRegister({ username: name }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Register with invalid type of username - Negative', () => {
        postRegister({ username: true, password: credentials.goodPassword }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Register with invalid input data - Negative', () => {
        const randomName = `${randomInt(999)}test001`;
        postRegister({ username: randomName, name: 'test' }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Register with wrong method - Negative', () => {
        cy.request({
            method: METHOD.PUT,
            url: `${API.ApiServer}${API.AccountRegister}`,
            body: { username: name, password: credentials.goodPassword },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.NOT_FOUND);
        });
    });

    it('Register with wrong URL - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: `${API.ApiServer}${API.AccountRegister}wrong`,
            body: { username: name, password: credentials.goodPassword },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.NOT_FOUND);
        });
    });

    it('Register with extra data - Negative', () => {
        postRegister({
            username: name,
            password: credentials.goodPassword,
            status: 'Draft'
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Register with sql injection - Negative', () => {
        postRegister({
            username: 'select * from users where id = 1 or 1=1',
            password: credentials.goodPassword,
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Register with already registered username - Negative', () => {
        postRegister({
            username: SRUsername,
            password: credentials.goodPassword,
            password_confirmation: credentials.goodPassword,
            role: 'USER',
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.CONFLICT);
            expect(response.body.message).to.eq('An account with the same name already exists.');
        });
    });

    it('Register with user password mismatch - Negative', () => {
        postRegister({
            username: name,
            password: credentials.goodPassword,
            password_confirmation: credentials.altPassword,
            role: 'USER',
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            expect(response.body.message).to.deep.eq(['Passwords must match']);
        });
    });

    it('Register user with weak password - Negative', () => {
        postRegister({
            username: name + 'test',
            password: 'tt',
            password_confirmation: 'tt',
            role: 'USER',
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            expect(response.body.message).to.eq(expectedPasswordError());
        });
    });
});
