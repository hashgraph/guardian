import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import * as Contracts from '../../../support/api/contracts';

context('Contracts', { tags: ['policy_labels', 'formulas', 'trustchains', 'contracts', 'firstPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const contractNameR = 'FirstAPIContractR';

    let contractIdR; let contractUuidR; let tokenId; let hederaId; let poolId; let retireRequestId;

    before('Read the retire contract and the token its pool holds', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Contracts.getContractByDescription(authorization, 'RETIRE', contractNameR).then((contract) => {
                contractIdR = contract.id;
                contractUuidR = contract.contractId;

                //The token comes from the pool rather than from a policy lookup. It has to be the
                //one the previous spec had the wiper role approved for and minted to the user, and
                //nothing in the policy listing identifies which of several published copies of the
                //policy that was - while the pool names the token directly.
                Contracts.waitForRetirePool(authorization, { contractId: contractUuidR })
                    .then((pool) => tokenId = pool.tokenIds.at(0));
            })
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + 'profiles/' + UserUsername,
                    headers: {
                        authorization,
                    }
                }).should((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK)
                    hederaId = response.body.hederaAccountId;
                })
            })
        })
    })

    describe('Create and cancel retire request', () => {

        it('Create retire request', () => {
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                //The pool that holds the policy token, not whatever sits first in the listing:
                //the earlier specs leave pools of their own probe tokens behind
                Contracts.waitForRetirePool(authorization, { tokenId }).then((pool) => {
                    poolId = pool.id;
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.RetirePools + poolId + '/' + API.Retire,
                        headers: {
                            authorization,
                            'Content-Type': 'application/json'
                        },
                        body: [{
                            token: tokenId,
                            count: 1,
                            serials: [1]
                        }]
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                })
            })

            Authorization.getAccessToken(SRUsername).then((authorization) => {

                Contracts.waitForRetireRequest(authorization, contractUuidR)

                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetireRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: contractUuidR
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    retireRequestId = response.body.at(0).id;
                    expect(response.body.at(0).contractId).eql(contractUuidR)
                    expect(response.body.at(0).tokens.at(0).token).eql(tokenId)
                    expect(response.body.at(0).tokens.at(0).count).eql(1)
                    expect(response.body.at(0).user).eql(hederaId)
                });
            })
        });

        it('Cancel retire request without auth token - Negative', () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.RetireRequests + retireRequestId,
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        })

        it('Cancel retire request with invalid auth token - Negative', () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.RetireRequests + retireRequestId,
                headers: {
                    authorization: 'Bearer wqe',
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Cancel retire request with empty auth token - Negative', () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.RetireRequests + retireRequestId,
                headers: {
                    authorization: '',
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Cancel retire request', () => {
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.DELETE,
                    url: API.ApiServer + API.RetireRequests + retireRequestId + '/' + API.Cancel,
                    headers: {
                        authorization
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });
            })
        })
    })

    describe('Create and unset retire request', () => {

        it('Create retire request', () => {

            Authorization.getAccessToken(UserUsername).then((authorization) => {
                //The pool that holds the policy token, not whatever sits first in the listing:
                //the earlier specs leave pools of their own probe tokens behind
                Contracts.waitForRetirePool(authorization, { tokenId }).then((pool) => {
                    poolId = pool.id;
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.RetirePools + poolId + '/' + API.Retire,
                        headers: {
                            authorization,
                            'Content-Type': 'application/json'
                        },
                        body: [{
                            token: tokenId,
                            count: 1,
                            serials: [1]
                        }]
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                })
            })

            Authorization.getAccessToken(SRUsername).then((authorization) => {

                Contracts.waitForRetireRequest(authorization, contractUuidR)

                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetireRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: contractUuidR
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    retireRequestId = response.body.at(0).id;
                    expect(response.body.at(0).contractId).eql(contractUuidR)
                    expect(response.body.at(0).tokens.at(0).token).eql(tokenId)
                    expect(response.body.at(0).tokens.at(0).count).eql(1)
                    expect(response.body.at(0).user).eql(hederaId)
                });
            })
        });

        it('Unset retire request without auth token - Negative', () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.RetireRequests + retireRequestId,
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Unset retire request with invalid auth token - Negative', () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.RetireRequests + retireRequestId,
                headers: {
                    authorization: 'Bearer wqe',
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Unset retire request with empty auth token - Negative', () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.RetireRequests + retireRequestId,
                headers: {
                    authorization: '',
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Unset retire request', () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.DELETE,
                    url: API.ApiServer + API.RetireRequests + retireRequestId,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });
            })
        })
    })

    describe('Get retire request', () => {

        it('Create retire request', () => {
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                //The pool that holds the policy token, not whatever sits first in the listing:
                //the earlier specs leave pools of their own probe tokens behind
                Contracts.waitForRetirePool(authorization, { tokenId }).then((pool) => {
                    poolId = pool.id;
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.RetirePools + poolId + '/' + API.Retire,
                        headers: {
                            authorization,
                            'Content-Type': 'application/json'
                        },
                        body: [{
                            token: tokenId,
                            count: 1,
                            serials: [1]
                        }]
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                })
            })

            Authorization.getAccessToken(SRUsername).then((authorization) => {

                Contracts.waitForRetireRequest(authorization, contractUuidR)

                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetireRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: contractUuidR
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    retireRequestId = response.body.at(0).id;
                    expect(response.body.at(0).contractId).eql(contractUuidR)
                    expect(response.body.at(0).tokens.at(0).token).eql(tokenId)
                    expect(response.body.at(0).tokens.at(0).count).eql(1)
                    expect(response.body.at(0).user).eql(hederaId)
                });
            })
        });

        it('Get retire request', () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetireRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: contractUuidR
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body.at(0).contractId).eql(contractUuidR)
                    expect(response.body.at(0).tokens.at(0).token).eql(tokenId)
                    expect(response.body.at(0).tokens.at(0).count).eql(1)
                    expect(response.body.at(0).user).eql(hederaId)
                });
            })
        });

        it('Get all retire contracts requests', () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetireRequests,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });
            })
        });

        it('Get all retire contracts requests without auth token - Negative', () => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.RetireRequests,
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Get all retire contracts requests with invalid auth token - Negative', () => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.RetireRequests,
                headers: {
                    authorization: 'Bearer wqe',
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Get all retire contracts requests with empty auth token - Negative', () => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.RetireRequests,
                headers: {
                    authorization: '',
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Get retire request without auth token - Negative', () => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.RetireRequests,
                qs: {
                    contractId: contractIdR
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Get retire request with invalid auth token - Negative', () => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.RetireRequests,
                headers: {
                    authorization: 'Bearer wqe',
                },
                qs: {
                    contractId: contractIdR
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Get retire request with empty auth token - Negative', () => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.RetireRequests,
                headers: {
                    authorization: '',
                },
                qs: {
                    contractId: contractIdR
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });
    })

    describe('Approve retire request', () => {

        it('Approve retire request without auth token - Negative', () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetireRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: contractUuidR
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    retireRequestId = response.body.at(0).id;
                })
            })
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.RetireRequests + retireRequestId + '/' + API.Approve,
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Approve retire request with invalid auth token - Negative', () => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.RetireRequests + retireRequestId + '/' + API.Approve,
                headers: {
                    authorization: 'Bearer wqe',
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Approve retire request with empty auth token - Negative', () => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.RetireRequests + retireRequestId + '/' + API.Approve,
                headers: {
                    authorization: '',
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Approve retire request', () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.RetireRequests + retireRequestId + '/' + API.Approve,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });
            })
        });
    })

    describe('Create and approve retire request without approve', () => {

        before('Set pool', () => {
            //Set pool to retire contract and wait while it in progress
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.RetireContract + contractIdR + '/' + API.PoolContract,
                    headers: {
                        authorization,
                    },
                    body: {
                        tokens: [
                            {
                                token: tokenId,
                                count: 2
                            }
                        ],
                        immediately: true
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                })
            })
        });

        it('Create retire request', () => {
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                //The pool that holds the policy token, not whatever sits first in the listing:
                //the earlier specs leave pools of their own probe tokens behind
                Contracts.waitForRetirePool(authorization, { tokenId }).then((pool) => {
                    poolId = pool.id;
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.RetirePools + poolId + '/' + API.Retire,
                        headers: {
                            authorization,
                            'Content-Type': 'application/json'
                        },
                        body: [{
                            token: tokenId,
                            count: 2,
                            serials: [2, 3]
                        }]
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                })
            })
        });

        it('Create retire request without auth token - Negative', () => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.RetirePools + poolId + '/' + API.Retire,
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Create retire request with invalid auth token - Negative', () => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.RetirePools + poolId + '/' + API.Retire,
                headers: {
                    authorization: 'Bearer wqe',
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Create retire request with empty auth token - Negative', () => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.RetirePools + poolId + '/' + API.Retire,
                headers: {
                    authorization: '',
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('Verify balance decreased', () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                //Ten were minted; one went in the approved retire above and two more in the
                //immediate one. The immediate retire burns them on Hedera and the balance is read
                //back from the mirror node, so it is polled down rather than read the instant the
                //request returns - which catches the old value and reports 9.
                Contracts.pollUntil({
                    request: {
                        method: METHOD.GET,
                        url: `${API.ApiServer}${API.ListOfTokens}${tokenId}/${API.RelayerAccounts}${hederaId}/${API.Info}`,
                        headers: { authorization },
                    },
                    predicate: (response) => response.status === STATUS_CODE.OK &&
                        response.body.balance === '7',
                    description: `the registrant's balance of token ${tokenId} to fall to 7`,
                });
            })
        });
    })
})
