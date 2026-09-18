import { randomInt } from '../../../support/random';
import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { registerUser } from '../../../support/api/accounts';

context('Get accounts', { tags: ['accounts', 'firstPool', 'all', 'all-no-mgs'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const accountsUrl = API.ApiServer + API.Accounts;

    const getAccounts = ({ authorization, failOnStatusCode = true } = {}) =>
        cy.request({
            method: METHOD.GET,
            url: accountsUrl,
            headers: { authorization },
            failOnStatusCode,
        });

    it('Get list of users', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getAccounts({ authorization }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                const usernames = response.body.map(v => v.username);
                expect(usernames).to.include.members([
                    'Installer',
                    'Installer2',
                    'Registrant',
                    'VVB',
                    'ProjectProponent',
                ]);
            });
        })
    });

    it('Get list of users as SR', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getAccounts({ authorization }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body)
                    .to.be.an('array')
                    .and.not.be.empty;
                expect(response.body[0]).to.have.property('username');
            });
        });
    });

    it('Get list of users without auth - Negative', () => {
        getAccounts({ failOnStatusCode: false }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get list of users with invalid auth - Negative', () => {
        getAccounts({
            authorization: 'bearer 11111111111111111111@#$',
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get list of users with empty auth - Negative', () => {
        getAccounts({
            authorization: '',
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get list of users as regular User - Forbidden', () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            getAccounts({
                authorization,
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.FORBIDDEN);
            });
        });
    });

    it('Add a new user and verify it is in the list', () => {
        // NOTE: using a random name until a cleanup via DELETE account is implemented in the API
        const name = `TestUserRegistration2_${randomInt(99999)}`;

        registerUser(name).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.SUCCESS);
            expect(response.body).to.have.property('username', name);
            expect(response.body).to.have.property('role', 'USER');

            Authorization.getAccessToken(SRUsername).then((authorization) => {
                getAccounts({ authorization }).then((listResponse) => {
                    expect(listResponse.status).to.eq(STATUS_CODE.OK);
                    const usernames = listResponse.body.map(v => v.username);
                    expect(usernames).to.include(name);
                });
            });
        });
    });

});