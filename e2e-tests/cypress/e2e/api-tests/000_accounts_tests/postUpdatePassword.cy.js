
import { randomInt } from '../../../support/random';
import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { registerUser } from '../../../support/api/accounts';
import { expectedPasswordError } from '../../../support/passwordPolicy';

context('Update password', { tags: ['accounts', 'firstPool', 'all', 'all-no-mgs'] }, () => {

    // NOTE: a dedicated user per run, so the suite stays idempotent: the password
    // is changed here and never restored, so a shared user would break on re-run
    const name = `TestUserPassword_${randomInt(99999)}`;
    let credentials;

    before(() => {
        cy.fixture('credentials').then((creds) => {
            credentials = creds;
        });
        registerUser(name);
    });

    // TODO: delete the created user here once DELETE /accounts is implemented in the API
    const changePasswordUrl = `${API.ApiServer}${API.ChangePassword}`;
    const loginUrl = `${API.ApiServer}${API.AccountsLogin}`;

    const changePasswordWithAuth = (authorization, body, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.POST,
            url: changePasswordUrl,
            headers: { authorization },
            body,
            failOnStatusCode,
        });

    const changePassword = (body, headers = {}, failOnStatusCode = false) =>
        cy.request({
            method: METHOD.POST,
            url: changePasswordUrl,
            headers,
            body,
            failOnStatusCode,
        });

    const login = (username, password, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.POST,
            url: loginUrl,
            body: { username, password },
            failOnStatusCode,
        });

    it('Change password', () => {
        Authorization.getAccessToken(name).then((authorization) => {
            changePasswordWithAuth(authorization, {
                username: name,
                oldPassword: credentials.goodPassword,
                newPassword: credentials.altPassword,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body).to.have.property('username', name);
                expect(response.body).to.have.property('role', 'USER');

                // Verify new password works
                login(name, credentials.altPassword).then((loginRes) => {
                    expect(loginRes.status).to.eq(STATUS_CODE.OK);
                    expect(loginRes.body).to.have.property('username', name);
                    expect(loginRes.body).to.have.property('role', 'USER');
                });
            });
        });
    });

    it('Change password without body - Negative', () => {
        Authorization.getAccessTokenWithPass(name, credentials.altPassword).then((authorization) => {
            changePasswordWithAuth(authorization, undefined, false).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            });
        });
    });

    it('Change password with wrong password body - Negative', () => {
        Authorization.getAccessTokenWithPass(name, credentials.altPassword).then((authorization) => {
            changePasswordWithAuth(authorization, {
                username: name,
                oldPassword: credentials.badPassword, // wrong old password
                newPassword: credentials.goodPassword,
            }, false).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
            });
        });
    });

    it('Change password without username - Negative', () => {
        Authorization.getAccessTokenWithPass(name, credentials.altPassword).then((authorization) => {
            changePasswordWithAuth(authorization, {
                oldPassword: credentials.badPassword,
                newPassword: credentials.altPassword,
            }, false).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            });
        });
    });

    it('Change password without old password - Negative', () => {
        Authorization.getAccessTokenWithPass(name, credentials.altPassword).then((authorization) => {
            changePasswordWithAuth(authorization, {
                username: name,
                newPassword: credentials.altPassword,
            }, false).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            });
        });
    });

    it('Change password with wrong username - Negative', () => {
        Authorization.getAccessTokenWithPass(name, credentials.altPassword).then((authorization) => {
            changePasswordWithAuth(authorization, {
                username: `${name}fdsafds`,
                oldPassword: credentials.badPassword,
                newPassword: credentials.altPassword,
            }, false).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
            });
        });
    });

    it('Change password with sql infection - Negative', () => {
        Authorization.getAccessTokenWithPass(name, credentials.altPassword).then((authorization) => {
            changePasswordWithAuth(authorization, {
                username: 'select * from users where id = 1 or 1=1',
                oldPassword: credentials.badPassword,
                newPassword: credentials.altPassword,
            }, false).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
            });
        });
    });

    it('Change password with weak password - Negative', () => {
        Authorization.getAccessTokenWithPass(name, credentials.altPassword).then((authorization) => {
            changePasswordWithAuth(authorization, {
                username: name,
                oldPassword: credentials.altPassword,
                newPassword: 'tt',
            }, false).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
                expect(response.body.message).eql(expectedPasswordError());
            });
        });
    });

    it('Get list of users without auth - Negative', () => {
        changePassword({
            username: name,
            oldPassword: credentials.altPassword,
            newPassword: credentials.goodPassword,
        }, /* headers */ {}, /* failOnStatusCode */ false).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get list of users with incorrect auth - Negative', () => {
        changePassword({
            username: name,
            oldPassword: credentials.altPassword,
            newPassword: credentials.goodPassword,
        }, { authorization: 'bearer 11111111111111111111@#$' }, false).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get list of users with empty auth - Negative', () => {
        changePassword({
            username: name,
            oldPassword: credentials.altPassword,
            newPassword: credentials.goodPassword,
        }, { authorization: '' }, false).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
