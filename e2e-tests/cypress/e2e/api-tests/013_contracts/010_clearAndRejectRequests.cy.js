import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import * as Contracts from '../../../support/api/contracts';

context('Contracts', { tags: ['contracts', 'firstPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const contractNameR = 'FirstAPIContractR';
    const contractNameW = 'FirstAPIContractW';

    let contractUuidW; let contractIdW; let contractIdR; let contractUuidR;
    let wipeRequestId; let rejectedToken;

    //Both cases below consume a wipe request, and a run only ever has the one the `setPools` spec
    //raised, so each raises its own. Setting the pool again on the same token is enough: the wipe
    //contract refuses a second request only while one is still outstanding or once the retire
    //contract can already wipe the token, and neither holds after a reject or a clear. Re-using the
    //token rather than minting one per case keeps the fixed Hedera token creation fee out of the run.
    const raiseWipeRequest = (authorization) =>
        Contracts.findWipeBoundToken(authorization, contractUuidW).then((tokenId) =>
            Contracts.setRetirePool(authorization, { contractId: contractIdR, tokenId })
                .then(() => Contracts.waitForWipeRequest(authorization, contractUuidW, { token: tokenId }))
                .then((request) => cy.wrap({ tokenId, requestId: request.id }, { log: false }))
        );

    const readContracts = (authorization) => {
        Contracts.getContractByDescription(authorization, 'WIPE', contractNameW).then((contract) => {
            contractIdW = contract.id;
            contractUuidW = contract.contractId;
        });
        Contracts.getContractByDescription(authorization, 'RETIRE', contractNameR).then((contract) => {
            contractIdR = contract.id;
            contractUuidR = contract.contractId;
        });
    };

    describe('Reject', () => {

        before('Raise a wipe request to reject', () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                readContracts(authorization);
                cy.then(() => raiseWipeRequest(authorization)).then(({ tokenId, requestId }) => {
                    rejectedToken = tokenId;
                    wipeRequestId = requestId;
                });
            })
        })

        it('Reject wipe contract requests without auth token - Negative', () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.WipeRequests + wipeRequestId + '/' + API.Reject,
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Reject wipe contract requests with invalid auth token - Negative', () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.WipeRequests + wipeRequestId + '/' + API.Reject,
                headers: {
                    authorization: 'Bearer wqe',
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Reject wipe contract requests with empty auth token - Negative', () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.WipeRequests + wipeRequestId + '/' + API.Reject,
                headers: {
                    authorization: '',
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Reject wipe contract requests', () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.DELETE,
                    url: API.ApiServer + API.WipeRequests + wipeRequestId + '/' + API.Reject,
                    headers: {
                        authorization,
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });

                //Rejecting removes the request on-chain, and the removal reaches Guardian on the same
                //synchronization task that delivered it, so it is polled for. The assertion names the
                //rejected token rather than demanding an empty listing, which would also pass if the
                //reject had silently taken an unrelated request with it
                Contracts.pollUntil({
                    request: {
                        method: METHOD.GET,
                        url: API.ApiServer + API.WipeRequests,
                        headers: { authorization },
                        qs: { contractId: contractUuidW },
                    },
                    predicate: (response) => response.status === STATUS_CODE.OK &&
                        !(response.body ?? []).some((request) => request.token === rejectedToken),
                    description: `the wipe request for token ${rejectedToken} to be rejected`,
                });
            })
        })
    })

    describe('Clear', () => {

        before('Raise a wipe request to clear', () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                readContracts(authorization);
                cy.then(() => raiseWipeRequest(authorization));
            })
        })

        it('Clear wipe contract requests without auth token - Negative', () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.WipeContract + contractUuidW + '/' + API.Requests,
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Clear wipe contract requests with invalid auth token - Negative', () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.WipeContract + contractUuidW + '/' + API.Requests,
                headers: {
                    authorization: 'Bearer wqe',
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Clear wipe contract requests with empty auth token - Negative', () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.WipeContract + contractUuidW + '/' + API.Requests,
                headers: {
                    authorization: '',
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Clear wipe contract requests', () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.DELETE,
                    url: API.ApiServer + API.WipeContract + contractIdW + '/' + API.Requests + contractUuidR,
                    headers: {
                        authorization,
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });

                //Clearing drops every request the retire contract has outstanding on this wipe
                //contract, so the listing empties out once the removal has been synchronized
                Contracts.pollUntil({
                    request: {
                        method: METHOD.GET,
                        url: API.ApiServer + API.WipeRequests,
                        headers: { authorization },
                        qs: { contractId: contractUuidW },
                    },
                    predicate: (response) => response.status === STATUS_CODE.OK &&
                        (response.body ?? []).length === 0,
                    description: `every wipe request on contract ${contractUuidW} to be cleared`,
                });
            })
        })
    })
});
