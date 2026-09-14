import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import * as Contracts from '../../../support/api/contracts';

context('Contracts', { tags: ['contracts', 'firstPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    const getRetireVcs = (token) => {
        return cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.RetireContract,
            headers: token ? { authorization: token } : {},
            failOnStatusCode: false
        });
    };

    it('Returns all retire vcs', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            //The retire the previous spec approved is written up as a VC once the transaction has
            //been recorded, so the document is polled for rather than read immediately after
            Contracts.pollUntil({
                request: {
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetireContract,
                    headers: { authorization },
                },
                predicate: (response) => response.status === STATUS_CODE.OK &&
                    (response.body ?? []).at(0),
                description: 'a retire VC to be published',
            }).then((vc) => {
                expect(vc).to.have.property('_id');
                expect(vc).to.have.property('owner');
                expect(vc).to.have.property('type');
            });
        });
    });

    it('Returns all retire vcs without auth token - Negative', () => {
        getRetireVcs(null).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Returns all retire vcs with invalid auth token - Negative', () => {
        getRetireVcs('Bearer wqe').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Returns all retire vcs with empty auth token - Negative', () => {
        getRetireVcs('').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});