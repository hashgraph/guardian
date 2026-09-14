import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Savepoints CRUD', { tags: ['savepoints', 'secondPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let policyId; let sv1; let sv2; let sv3; let sv4; let sv5; let sv6;

    before('Get policy id', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture('iRecDRS.policy', 'binary')
                .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                .then((file) => {
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.PolicisImportFile,
                        body: file,
                        headers: {
                            'content-type': 'binary/octet-stream',
                            authorization,
                        },
                        timeout: 180000,
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        cy.request({
                            method: METHOD.GET,
                            url: API.ApiServer + API.Policies,
                            headers: {
                                authorization,
                            },
                            timeout: 180000
                        }).then((response) => {
                            expect(response.status).to.eq(STATUS_CODE.OK);
                            const policy = response.body.find((element) => element.name === 'iRecDRS');
                            expect(policy, 'the iRecDRS policy').to.not.be.undefined;
                            policyId = policy.id
                            //Asking for the transition again once the policy already is in dry run
                            //answers 500, so it is only requested when it is still needed
                            if (policy.status !== 'DRY-RUN') {
                                cy.request({
                                    method: METHOD.PUT,
                                    url:
                                        API.ApiServer + API.Policies + policyId + '/' + API.DryRun,
                                    headers: {
                                        authorization,
                                    },
                                    timeout: 180000,
                                }).then((response) => {
                                    expect(response.status).to.eq(STATUS_CODE.OK);
                                });
                            }
                        })
                    })
                })
        });
    })

    //The savepoints of a policy form a tree, and the ones an earlier run left behind make the
    //creation of a new root below answer 500. Deleting them one by one is not enough - one of them
    //is always the current savepoint and answers "Cannot delete the current savepoint" - so the dry
    //run is restarted instead, which empties the tree.
    before('Empty the savepoint tree of earlier runs', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + '/' + API.Savepoint,
                headers: { authorization },
                timeout: 180000,
            }).then((response) => {
                const savepoints = response.body?.items ?? response.body ?? [];
                if (savepoints.length === 0) {
                    return;
                }
                cy.request({
                    method: METHOD.POST,
                    url: `${API.ApiServer}${API.Policies}${policyId}/${API.DryRun}restart`,
                    headers: { authorization },
                    timeout: 400000,
                });
            });
        });
    })

    it('Create savepoint', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + '/' + API.Savepoint,
                headers: {
                    authorization
                },
                body: {
                    'name': 'SV1',
                    'savepointPath': []
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                sv1 = response.body.savepoint.id;
            })
        })
    });

    it('Create savepoint without auth - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Policies + policyId + '/' + API.Savepoint,
            body: {
                'name': 'SV1',
                'savepointPath': []
            },
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create savepoint with incorrect auth - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Policies + policyId + '/' + API.Savepoint,
            body: {
                'name': 'SV1',
                'savepointPath': []
            },
            headers: {
                authorization: 'bearer 11111111111111111111@#$',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create savepoint with empty auth - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Policies + policyId + '/' + API.Savepoint,
            body: {
                'name': 'SV1',
                'savepointPath': []
            },
            headers: {
                authorization: '',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get savepoint', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + '/' + API.Savepoint,
                headers: {
                    authorization
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body.items.length).to.eq(1);
                expect(response.body.items[0].id).to.eq(sv1);
                expect(response.body.items[0].name).to.eq('SV1');
            })
        })
    });

    it('Get savepoint without auth - Negative', () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Policies + policyId + '/' + API.Savepoint,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get savepoint with incorrect auth - Negative', () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Policies + policyId + '/' + API.Savepoint,
            headers: {
                authorization: 'bearer 11111111111111111111@#$',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get savepoint with empty auth - Negative', () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Policies + policyId + '/' + API.Savepoint,
            headers: {
                authorization: '',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Edit savepoint', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.PATCH,
                url: API.ApiServer + API.Policies + policyId + '/' + API.Savepoint + sv1,
                headers: {
                    authorization
                },
                body: {
                    name: 'SV1U'
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body.savepoint.id).to.eq(sv1);
                expect(response.body.savepoint.name).to.eq('SV1U');
            })
        })
    })

    it('Edit savepoint without auth - Negative', () => {
        cy.request({
            method: METHOD.PATCH,
            url: API.ApiServer + API.Policies + policyId + '/' + API.Savepoint + sv1,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Edit savepoint with incorrect auth - Negative', () => {
        cy.request({
            method: METHOD.PATCH,
            url: API.ApiServer + API.Policies + policyId + '/' + API.Savepoint + sv1,
            headers: {
                authorization: 'bearer 11111111111111111111@#$',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Edit savepoint with empty auth - Negative', () => {
        cy.request({
            method: METHOD.PATCH,
            url: API.ApiServer + API.Policies + policyId + '/' + API.Savepoint + sv1,
            headers: {
                authorization: '',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete savepoint without auth - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Policies + policyId + '/' + API.SavepointDelete,
            body: {
                'savepointPath': [sv1]
            },
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete savepoint with incorrect auth - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Policies + policyId + '/' + API.SavepointDelete,
            body: {
                'savepointPath': [sv1]
            },
            headers: {
                authorization: 'bearer 11111111111111111111@#$',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete savepoint with empty auth - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Policies + policyId + '/' + API.SavepointDelete,
            body: {
                'savepointPath': [sv1]
            },
            headers: {
                authorization: '',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete savepoint', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + '/' + API.SavepointDelete,
                headers: {
                    authorization
                },
                body: {
                    'savepointIds': [sv1]
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + '/' + API.Savepoint,
                    headers: {
                        authorization
                    },
                    timeout: 180000
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK);
                    expect(response.body.items.length).to.eq(0);
                })
            })
        })
    });

    it('Check savepoints limit', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + '/' + API.Savepoint,
                headers: {
                    authorization
                },
                body: {
                    'name': 'SV1',
                    'savepointPath': []
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                sv1 = response.body.savepoint.id;
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + '/' + API.Savepoint,
                    headers: {
                        authorization
                    },
                    body: {
                        'name': 'SV2',
                        'savepointPath': [sv1]
                    },
                    timeout: 180000
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK);
                    sv2 = response.body.savepoint.id;
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + '/' + API.Savepoint,
                        headers: {
                            authorization
                        },
                        body: {
                            'name': 'SV3',
                            'savepointPath': [sv1, sv2]
                        },
                        timeout: 180000
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.OK);
                        sv3 = response.body.savepoint.id;
                        cy.request({
                            method: METHOD.POST,
                            url: API.ApiServer + API.Policies + policyId + '/' + API.Savepoint,
                            headers: {
                                authorization
                            },
                            body: {
                                'name': 'SV4',
                                'savepointPath': [sv1, sv2, sv3]
                            },
                            timeout: 180000
                        }).then((response) => {
                            expect(response.status).to.eq(STATUS_CODE.OK);
                            sv4 = response.body.savepoint.id;
                            cy.request({
                                method: METHOD.POST,
                                url: API.ApiServer + API.Policies + policyId + '/' + API.Savepoint,
                                headers: {
                                    authorization
                                },
                                body: {
                                    'name': 'SV5',
                                    'savepointPath': [sv1, sv2, sv3, sv4]
                                },
                                timeout: 180000
                            }).then((response) => {
                                expect(response.status).to.eq(STATUS_CODE.OK);
                                sv5 = response.body.savepoint.id;
                                cy.request({
                                    method: METHOD.POST,
                                    url: API.ApiServer + API.Policies + policyId + '/' + API.Savepoint,
                                    headers: {
                                        authorization
                                    },
                                    body: {
                                        'name': 'SV6',
                                        'savepointPath': [sv1, sv2, sv3, sv4, sv5]
                                    },
                                    failOnStatusCode: false,
                                    timeout: 180000
                                }).then((response) => {
                                    expect(response.status).to.eq(STATUS_CODE.ERROR);
                                    expect(response.body.message).to.eq('Savepoints limit reached (5). Delete existing savepoints to create a new one.');
                                })
                            })
                        })
                    })
                })
            })
        })
    });
})
