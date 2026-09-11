import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import * as Contracts from '../../../support/api/contracts';

context('Contracts', { tags: ['contracts', 'firstPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const contractNameR = 'FirstAPIContractR';

    let contractUuidR;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Contracts.getContractByDescription(authorization, 'RETIRE', contractNameR)
                .then((contract) => contractUuidR = contract.contractId);
        });
    });

    it('Returns all retire pools', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.RetirePools,
                headers: {
                    authorization,
                },
                qs: { contractId: contractUuidR },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.at(0), `a pool of contract ${contractUuidR}`).to.not.be.undefined;
                expect(response.body.at(0)).to.have.property('_id');
                expect(response.body.at(0)).to.have.property('contractId', contractUuidR);
            });
        })
    });

    it('Returns all retire pools without auth token - Negative', () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.RetirePools,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Returns all retire pools with invalid auth token - Negative', () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.RetirePools,
            headers: {
                authorization: 'Bearer wqe',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Returns all retire pools with empty auth token - Negative', () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.RetirePools,
            headers: {
                authorization: '',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Returns all retire pools as User - Negative', () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.RetirePools,
                headers: {
                    authorization
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                //A plain user is served only the pools a retirement can actually be made from -
                //`GET_RETIRE_POOLS` filters on `enabled: true` for `UserRole.USER`. The pool the
                //previous spec set is not enabled yet, because the wipe request that grants the
                //retire contract the wiper role is only approved several specs later, so it must
                //not appear here. Asserting an empty list instead would only hold on an instance
                //where no run has ever completed that approval.
                const visibleToUser = response.body ?? [];
                expect(visibleToUser.filter((pool) => pool.enabled !== true),
                    'pools served to a user that are not enabled').to.eql([]);
                expect(visibleToUser.filter((pool) => pool.contractId === contractUuidR),
                    `pools of contract ${contractUuidR}, whose wiper role has not been approved yet`).to.eql([]);
            });
        });
    });
});
