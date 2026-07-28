import assert from 'node:assert/strict';
import { handlePolicyDataQuery } from '../../dist/api/policy-data.service.js';
import { MessageError, MessageResponse, DatabaseServer } from '@guardian/common';
import {
    PolicyStatus,
    POLICY_DATA_MAX_PAGE_SIZE,
    POLICY_DATA_DEFAULT_PAGE_SIZE,
} from '@guardian/interfaces';

const silentLogger = { error: async () => {}, info: async () => {}, warn: async () => {}, debug: async () => {} };

const SR_OWNER = 'did:sr:1';

function makePolicy(overrides = {}) {
    return { owner: SR_OWNER, status: PolicyStatus.PUBLISH, topicId: '0.0.1', ...overrides };
}

// Fake dataBaseServer: only the two methods the handler touches, plus a call recorder.
function makeDb(policy, findAndCountResult = [[{ id: 'vc-1' }], 1]) {
    const calls = { findAndCount: [] };
    return {
        calls,
        getPolicy: async () => policy,
        findAndCount: async (entity, filter, opts) => {
            calls.findAndCount.push({ entity, filter, opts });
            return findAndCountResult;
        },
    };
}

function makeMsg(overrides = {}) {
    return {
        policyId: 'pol-1',
        schemaName: 'MRV Data',
        filters: undefined,
        page: 1,
        pageSize: 20,
        sortField: undefined,
        policyOwner: SR_OWNER,
        ...overrides,
    };
}

describe('handlePolicyDataQuery', () => {
    // The handler resolves the schema via the DatabaseServer.getSchemas static.
    // Stub it per-test and restore afterwards; the dist module and this test share
    // the same @guardian/common class instance, so the stub is visible to the handler.
    let hadGetSchemas;
    let origGetSchemas;

    beforeEach(() => {
        hadGetSchemas = Object.prototype.hasOwnProperty.call(DatabaseServer, 'getSchemas');
        origGetSchemas = DatabaseServer.getSchemas;
        DatabaseServer.getSchemas = async () => [{ iri: '#MRVData', version: '1.0.0' }];
    });

    afterEach(() => {
        if (hadGetSchemas) DatabaseServer.getSchemas = origGetSchemas;
        else delete DatabaseServer.getSchemas;
    });

    const errorCases = [
        {
            name: 'returns 404 when the policy is not found',
            db: () => makeDb(null),
            msg: () => makeMsg(),
            code: 404, error: /not found/,
        },
        {
            name: 'returns 403 when the caller tenant does not own the policy',
            db: () => makeDb(makePolicy({ owner: 'did:sr:OTHER' })),
            msg: () => makeMsg({ policyOwner: SR_OWNER }),
            code: 403, error: /Insufficient permissions/,
        },
        {
            name: 'returns 403 when the policy is not published',
            db: () => makeDb(makePolicy({ status: PolicyStatus.DRAFT })),
            msg: () => makeMsg(),
            code: 403, error: /not published/,
        },
        {
            name: 'returns 404 when no schema matches the name under the policy topic',
            db: () => makeDb(makePolicy()),
            msg: () => makeMsg(),
            getSchemas: async () => [],
            code: 404, error: /Schema with name/,
        },
        {
            name: 'returns 400 for an invalid filter operator',
            db: () => makeDb(makePolicy()),
            msg: () => makeMsg({ filters: { hederaStatus: { op: 'bogus', value: 'x' } } }),
            code: 400, error: /Unknown operator/,
        },
        {
            name: 'returns 400 for an unknown sort field',
            db: () => makeDb(makePolicy()),
            msg: () => makeMsg({ sortField: 'notAField' }),
            code: 400, error: /Unknown sort field/,
        },
    ];
    for (const tc of errorCases) {
        it(tc.name, async () => {
            if (tc.getSchemas) { DatabaseServer.getSchemas = tc.getSchemas; }
            const r = await handlePolicyDataQuery(tc.db(), tc.msg(), silentLogger);
            assert.ok(r instanceof MessageError);
            assert.equal(r.code, tc.code);
            assert.match(r.error, tc.error);
        });
    }

    it('bypasses the tenant check for a cross-organization auditor (falsy policyOwner)', async () => {
        // Policy owned by a different SR, but the auditor is not tenant-scoped.
        const db = makeDb(makePolicy({ owner: 'did:sr:OTHER' }));
        const r = await handlePolicyDataQuery(db, makeMsg({ policyOwner: null }), silentLogger);
        assert.ok(r instanceof MessageResponse);
        assert.equal(r.code, 200);
    });

    it('returns items, total and resolved pagination on the happy path', async () => {
        const db = makeDb(makePolicy(), [[{ id: 'vc-1' }, { id: 'vc-2' }], 42]);
        const r = await handlePolicyDataQuery(db, makeMsg({ page: 2, pageSize: 10 }), silentLogger);
        assert.ok(r instanceof MessageResponse);
        assert.equal(r.error, null);
        assert.deepEqual(r.body.items, [{ id: 'vc-1' }, { id: 'vc-2' }]);
        assert.equal(r.body.total, 42);
        assert.equal(r.body.page, 2);
        assert.equal(r.body.pageSize, 10);
        // offset = (page - 1) * pageSize
        assert.equal(db.calls.findAndCount[0].opts.offset, 10);
        assert.equal(db.calls.findAndCount[0].opts.limit, 10);
    });

    it('clamps an oversized pageSize to the configured maximum', async () => {
        const db = makeDb(makePolicy());
        const r = await handlePolicyDataQuery(db, makeMsg({ page: 1, pageSize: 99999 }), silentLogger);
        assert.equal(r.body.pageSize, POLICY_DATA_MAX_PAGE_SIZE);
        assert.equal(db.calls.findAndCount[0].opts.limit, POLICY_DATA_MAX_PAGE_SIZE);
    });

    it('applies defaults when page/pageSize are undefined', async () => {
        const db = makeDb(makePolicy());
        const r = await handlePolicyDataQuery(
            db,
            makeMsg({ page: undefined, pageSize: undefined }),
            silentLogger
        );
        assert.equal(r.body.page, 1);
        assert.equal(r.body.pageSize, POLICY_DATA_DEFAULT_PAGE_SIZE);
    });

    it('returns a 500 MessageError when an unexpected error is thrown', async () => {
        const db = {
            getPolicy: async () => { throw new Error('db exploded'); },
        };
        const r = await handlePolicyDataQuery(db, makeMsg(), silentLogger);
        assert.ok(r instanceof MessageError);
        assert.equal(r.code, 500);
    });
});
