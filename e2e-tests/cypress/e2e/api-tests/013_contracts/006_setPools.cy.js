import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import * as Contracts from '../../../support/api/contracts';

context('Contracts', { tags: ['contracts', 'firstPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const contractNameR = 'FirstAPIContractR';
    const contractNameW = 'FirstAPIContractW';
    const tokenName = 'FirstToken'
    let contractIdR; let contractUuidW; let tokenId;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Contracts.getContractByDescription(authorization, 'RETIRE', contractNameR)
                .then((contract) => contractIdR = contract.id);
            Contracts.getContractByDescription(authorization, 'WIPE', contractNameW)
                .then((contract) => {
                    contractUuidW = contract.contractId;
                    //A token whose wipe key is the wipe contract: setting a pool on it is what
                    //makes the retire contract ask that contract for the wiper role, which is the
                    //wipe request the later specs read, reject and approve
                    Contracts.createWipeBoundToken(authorization, {
                        tokenName,
                        tokenSymbol: 'F',
                        wipeContractId: contractUuidW,
                    }).then((id) => tokenId = id);
                });
        })
    })

    it('Set retire contract pool', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Contracts.setRetirePool(authorization, { contractId: contractIdR, tokenId });
        })
    });

    it('Set retire contract pool without auth token - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.RetireContract + contractIdR + '/' + API.PoolContract,
            failOnStatusCode: false,
            body: {
                tokens: [
                    {
                        token: tokenId,
                        count: 1
                    }
                ],
                immediately: false
            }
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Set retire contract pool with invalid auth token - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.RetireContract + contractIdR + '/' + API.PoolContract,
            headers: {
                authorization: 'Bearer wqe',
            },
            failOnStatusCode: false,
            body: {
                tokens: [
                    {
                        token: tokenId,
                        count: 1
                    }
                ],
                immediately: false
            }
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Set retire contract pool with empty auth token - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.RetireContract + contractIdR + '/' + API.PoolContract,
            headers: {
                authorization: '',
            },
            failOnStatusCode: false,
            body: {
                tokens: [
                    {
                        token: tokenId,
                        count: 1
                    }
                ],
                immediately: false
            }
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Set retire contract pool as User - Negative', () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.RetireContract + contractIdR + '/' + API.PoolContract,
                headers: {
                    authorization
                },
                failOnStatusCode: false,
                body: {
                    tokens: [
                        {
                            token: tokenId,
                            count: 1
                        }
                    ],
                    immediately: false
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });
});
