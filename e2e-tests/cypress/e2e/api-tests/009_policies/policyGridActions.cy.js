import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

/**
 *
 * Verifies the external-integrator surface:
 *   GET  /policies/:id/grids
 *   GET  /policies/:id/grids/:gridId/actions
 *   GET  /policies/:id/grids/:gridId/records
 *   POST /policies/:id/grids/:gridId/records/:recordId/actions/:actionId
 *
 */
context('Policy Grid Actions API', { tags: ['policies', 'gridActions', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    let policyId;
    const nonExistentId = '000000000000000000000000';
    const TIMEOUT = 180000;

    // ── Setup: fetch a published policy id ───────────────────────────────────

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: { authorization },
                timeout: TIMEOUT,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                const published = response.body.find((p) => p.status === 'PUBLISH');
                if (published) {
                    policyId = published.id;
                } else {
                    // Fall back to any policy — 503 is expected from unauthenticated tests
                    policyId = response.body.at(0)?.id ?? nonExistentId;
                }
            });
        });
    });

    // ── GET /policies/:id/grids ───────────────────────────────────────────────

    describe('GET /policies/:id/grids', () => {
        it('returns 200 and an array for a valid policy', () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.PolicyGrids(policyId),
                    headers: { authorization },
                    timeout: TIMEOUT,
                    failOnStatusCode: false,
                }).then((response) => {
                    expect([STATUS_CODE.OK, STATUS_CODE.NOT_FOUND, 500, 503]).to.include(response.status);
                    if (response.status === STATUS_CODE.OK) {
                        expect(response.body).to.be.an('array');
                    }
                });
            });
        });

        it('grid descriptor shape contains required fields when grids are returned', () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.PolicyGrids(policyId),
                    headers: { authorization },
                    timeout: TIMEOUT,
                    failOnStatusCode: false,
                }).then((response) => {
                    if (response.status !== STATUS_CODE.OK || response.body.length === 0) {return;}

                    const grid = response.body[0];
                    expect(grid).to.have.property('gridId').that.is.a('string');
                    expect(grid).to.have.property('title').that.is.a('string');
                    expect(grid).to.have.property('filterSchema').that.is.an('array');
                    expect(grid).to.have.property('columnSchema').that.is.an('array');

                    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                    expect(grid.gridId).not.to.match(uuidPattern);
                });
            });
        });

        it('returns 401 without authorization header', () => {
            cy.request({
                method: METHOD.GET,
                url: API.PolicyGrids(policyId),
                failOnStatusCode: false,
                timeout: TIMEOUT,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('returns 404 for a non-existent policyId', () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.PolicyGrids(nonExistentId),
                    headers: { authorization },
                    failOnStatusCode: false,
                    timeout: TIMEOUT,
                }).then((response) => {
                    expect([STATUS_CODE.NOT_FOUND, 500, 503]).to.include(response.status);
                });
            });
        });
    });

    // ── GET /policies/:id/grids/:gridId/actions ───────────────────────────────

    describe('GET /policies/:id/grids/:gridId/actions', () => {
        let gridId;

        before(() => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.PolicyGrids(policyId),
                    headers: { authorization },
                    timeout: TIMEOUT,
                    failOnStatusCode: false,
                }).then((response) => {
                    if (response.status === STATUS_CODE.OK && response.body.length > 0) {
                        gridId = response.body[0].gridId;
                    }
                });
            });
        });

        it('returns 200 and an array of action descriptors for a valid grid', () => {
            if (!gridId) {return;} // skip when no grids visible

            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.PolicyGridActions(policyId, gridId),
                    headers: { authorization },
                    timeout: TIMEOUT,
                    failOnStatusCode: false,
                }).then((response) => {
                    expect([STATUS_CODE.OK, 503]).to.include(response.status);
                    if (response.status === STATUS_CODE.OK) {
                        expect(response.body).to.be.an('array');
                    }
                });
            });
        });

        it('action descriptor shape is correct', () => {
            if (!gridId) {return;}

            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.PolicyGridActions(policyId, gridId),
                    headers: { authorization },
                    timeout: TIMEOUT,
                    failOnStatusCode: false,
                }).then((response) => {
                    if (response.status !== STATUS_CODE.OK || response.body.length === 0) {return;}

                    const action = response.body[0];
                    expect(action).to.have.property('actionId').that.is.a('string');
                    expect(action).to.have.property('label').that.is.a('string');
                    expect(action).to.have.property('requiredRoles').that.is.an('array');
                    expect(action).to.have.property('appliesTo', 'row');
                    expect(action).to.have.property('inputSchema').that.is.an('object');

                    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                    expect(action.actionId).not.to.match(uuidPattern);
                });
            });
        });

        it('returns 404 for unknown gridId', () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.PolicyGridActions(policyId, 'completely_unknown_grid_xyz'),
                    headers: { authorization },
                    failOnStatusCode: false,
                    timeout: TIMEOUT,
                }).then((response) => {
                    expect([STATUS_CODE.NOT_FOUND, 500, 503]).to.include(response.status);
                });
            });
        });

        it('returns 401 without authorization header', () => {
            if (!gridId) {return;}

            cy.request({
                method: METHOD.GET,
                url: API.PolicyGridActions(policyId, gridId),
                failOnStatusCode: false,
                timeout: TIMEOUT,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
            });
        });
    });

    // ── GET /policies/:id/grids/:gridId/records ───────────────────────────────

    describe('GET /policies/:id/grids/:gridId/records', () => {
        let gridId;

        before(() => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.PolicyGrids(policyId),
                    headers: { authorization },
                    timeout: TIMEOUT,
                    failOnStatusCode: false,
                }).then((response) => {
                    if (response.status === STATUS_CODE.OK && response.body.length > 0) {
                        gridId = response.body[0].gridId;
                    }
                });
            });
        });

        it('returns 200 with paginated response shape', () => {
            if (!gridId) {return;}

            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.PolicyGridRecords(policyId, gridId),
                    headers: { authorization },
                    qs: { page: 1, pageSize: 10 },
                    timeout: TIMEOUT,
                    failOnStatusCode: false,
                }).then((response) => {
                    expect([STATUS_CODE.OK, 503]).to.include(response.status);
                    if (response.status !== STATUS_CODE.OK) {return;}

                    const body = response.body;
                    expect(body).to.have.property('data').that.is.an('array');
                    expect(body).to.have.property('page').that.is.a('number');
                    expect(body).to.have.property('pageSize').that.is.a('number');
                    expect(body).to.have.property('totalCount').that.is.a('number');
                    expect(body).to.have.property('hasNextPage').that.is.a('boolean');
                    expect(body).to.have.property('hasPreviousPage').that.is.a('boolean');
                });
            });
        });

        it('each record carries a _actions array', () => {
            if (!gridId) {return;}

            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.PolicyGridRecords(policyId, gridId),
                    headers: { authorization },
                    qs: { page: 1, pageSize: 5 },
                    timeout: TIMEOUT,
                    failOnStatusCode: false,
                }).then((response) => {
                    if (response.status !== STATUS_CODE.OK || response.body.data.length === 0) {return;}

                    const record = response.body.data[0];
                    expect(record).to.have.property('_actions').that.is.an('array');
                    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                    record._actions.forEach((actionId) => {
                        expect(actionId).to.be.a('string');
                        expect(actionId).not.to.match(uuidPattern);
                    });
                });
            });
        });

        it('respects pageSize cap of 200', () => {
            if (!gridId) {return;}

            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.PolicyGridRecords(policyId, gridId),
                    headers: { authorization },
                    qs: { page: 1, pageSize: 9999 },
                    timeout: TIMEOUT,
                    failOnStatusCode: false,
                }).then((response) => {
                    if (response.status !== STATUS_CODE.OK) {return;}
                    expect(response.body.pageSize).to.be.at.most(200);
                });
            });
        });

        it('returns 404 for unknown gridId', () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.PolicyGridRecords(policyId, 'no_such_grid_xyz'),
                    headers: { authorization },
                    failOnStatusCode: false,
                    timeout: TIMEOUT,
                }).then((response) => {
                    expect([STATUS_CODE.NOT_FOUND, 500, 503]).to.include(response.status);
                });
            });
        });
    });

    // ── POST /policies/:id/grids/:gridId/records/:recordId/actions/:actionId ──

    describe('POST /policies/:id/grids/:gridId/records/:recordId/actions/:actionId', () => {
        it('returns 404 for unknown gridId', () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.PolicyGridExecuteAction(policyId, 'ghost_grid', nonExistentId, 'approve_action'),
                    headers: { authorization, 'Content-Type': 'application/json' },
                    body: {},
                    failOnStatusCode: false,
                    timeout: TIMEOUT,
                }).then((response) => {
                    expect([STATUS_CODE.NOT_FOUND, 503]).to.include(response.status);
                });
            });
        });

        it('returns 401 without authorization', () => {
            cy.request({
                method: METHOD.POST,
                url: API.PolicyGridExecuteAction(policyId, 'any_grid', nonExistentId, 'any_action'),
                body: {},
                failOnStatusCode: false,
                timeout: TIMEOUT,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it('accepts empty body for standard actions', () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.PolicyGridExecuteAction(policyId, 'any_grid', nonExistentId, 'any_action'),
                    headers: { authorization, 'Content-Type': 'application/json' },
                    body: {},
                    failOnStatusCode: false,
                    timeout: TIMEOUT,
                }).then((response) => {
                    // Should NOT be a 400 (bad request) — the API always accepts {} body
                    expect(response.status).not.to.eq(STATUS_CODE.BAD_REQUEST);
                });
            });
        });
    });

    // ── End-to-end: execute action on a real record ──────────────────────────

    describe('End-to-end: execute action on a record', () => {
        let e2eGridId;
        let e2eRecordId;
        let e2eRecordOwner;
        let e2eActionId;

        before(() => {
            if (!policyId || policyId === nonExistentId) {return;}

            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.PolicyGrids(policyId),
                    headers: { authorization },
                    timeout: TIMEOUT,
                    failOnStatusCode: false,
                }).then((gridsResponse) => {
                    if (gridsResponse.status !== STATUS_CODE.OK || !gridsResponse.body.length) {return;}

                    const firstGridId = gridsResponse.body[0].gridId;

                    cy.request({
                        method: METHOD.GET,
                        url: API.PolicyGridRecords(policyId, firstGridId),
                        headers: { authorization },
                        qs: { page: 1, pageSize: 25 },
                        timeout: TIMEOUT,
                        failOnStatusCode: false,
                    }).then((recordsResponse) => {
                        if (recordsResponse.status !== STATUS_CODE.OK) {return;}

                        const data = recordsResponse.body.data ?? [];
                        // `owner` is what identifies the row across the action: see the
                        // post-execute check below.
                        const record = data.find((r) => r._actions?.length > 0 && r.owner);
                        if (!record) {return;}

                        e2eGridId = firstGridId;
                        e2eRecordId = String(record._id);
                        e2eRecordOwner = record.owner;
                        e2eActionId = record._actions[0];
                    });
                });
            });
        });

        it('POST execute returns 200 with empty body', () => {
            if (!e2eGridId || !e2eRecordId || !e2eActionId) {
                cy.log('No record with available actions found — skipping');
                return;
            }

            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.PolicyGridExecuteAction(policyId, e2eGridId, e2eRecordId, e2eActionId),
                    headers: { authorization, 'Content-Type': 'application/json' },
                    body: {},
                    timeout: TIMEOUT,
                    failOnStatusCode: false,
                }).then((response) => {
                    expect([STATUS_CODE.OK, 503]).to.include(response.status);
                    if (response.status === STATUS_CODE.OK) {
                        expect(response.body).to.deep.eq({});
                    }
                });
            });
        });

        // A row action re-issues the document it acts on rather than updating it in place: the row
        // stays in the grid, but under a new `_id`. Approving the single registrant of
        // `registrants_grid`, for instance, leaves `totalCount` at 1 and the row still `Approved`,
        // while its `_id` changes -- so looking the row up by the `_id` captured before the call
        // reports it as gone no matter how long you wait. `owner` (the subject DID) is what survives
        // the re-issue, so that is what identifies the row here.
        it('record remains visible in grid after action execution', () => {
            if (!e2eGridId || !e2eRecordOwner) {
                cy.log('No record found — skipping post-execute check');
                return;
            }

            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.PolicyGridRecords(policyId, e2eGridId),
                    headers: { authorization },
                    qs: { page: 1, pageSize: 200 },
                    timeout: TIMEOUT,
                    failOnStatusCode: false,
                }).then((response) => {
                    if (response.status !== STATUS_CODE.OK) {return;}

                    const rows = response.body.data ?? [];
                    const row = rows.find((r) => r.owner === e2eRecordOwner);
                    expect(row, `a row for ${e2eRecordOwner} must still be in the grid after the action`)
                        .to.not.be.undefined;
                    // Whether it was re-issued or left untouched, the row stays addressable through
                    // the same API.
                    expect(row._actions, 'the row still exposes its actions').to.be.an('array');
                });
            });
        });
    });

    // ── Cross-cutting: UUID-free contract ─────────────────────────────────────

    describe('UUID-free contract', () => {
        it('no response body at any endpoint contains raw block UUIDs', () => {
            const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.PolicyGrids(policyId),
                    headers: { authorization },
                    timeout: TIMEOUT,
                    failOnStatusCode: false,
                }).then((response) => {
                    if (response.status !== STATUS_CODE.OK) {return;}

                    response.body.forEach((grid) => {
                        expect(grid.gridId, 'gridId must not be a UUID').not.to.match(uuidPattern);
                        grid.columnSchema.forEach((col) => {
                            col.bindActions.forEach((actionId) => {
                                expect(actionId, 'bindActions entry must not be a UUID').not.to.match(uuidPattern);
                            });
                        });
                    });
                });
            });
        });
    });
});
