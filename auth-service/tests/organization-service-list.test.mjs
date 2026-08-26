import assert from 'node:assert/strict';
import { loadService, capturedHandlers } from './_handler-harness.mjs';

/*
 * GET_ORGANIZATIONS used to run the owned-organizations query and then append the
 * caller's administered organization to the result, but only when offset was 0.
 * That made three things wrong:
 *
 *  - the total count changed between pages (1 on page 0, 0 on page 1) and page 0
 *    carried pageSize + 1 items, so no paging client could add up;
 *  - the dedup compared against page-0 items only, so an owner additionally
 *    enrolled with MEMBER_MANAGE saw the same organization twice once they owned
 *    more than pageSize of them;
 *  - the name filter was applied as a regex to the owned query and as
 *    String.includes to the appended row - different case sensitivity, and an
 *    unescaped regex, so `?name=[` reached Mongo as an invalid expression.
 *
 * Folding the administered organization into the query fixes all three.
 */

const MEMBER_MANAGE = 'MEMBER_MANAGE';

/**
 * Records the filter/options GET_ORGANIZATIONS builds, and answers the incidental
 * lookups (member row, role row) from the fixture.
 */
function makeRepository({ organizations = [], member = null, role = null }) {
    const calls = { findAndCount: [] };
    class Repository {
        async findAndCount(_entity, filter, options) {
            calls.findAndCount.push({ filter, options });
            const offset = options?.offset || 0;
            const limit = options?.limit ?? organizations.length;
            return [organizations.slice(offset, offset + limit), organizations.length];
        }
        async findOne(entity, filter) {
            const name = entity?.name || String(entity);
            if (name.includes('OrganizationMember')) {
                return member;
            }
            if (name.includes('OrgRole')) {
                return role;
            }
            if (name.includes('Organization')) {
                return organizations.find((organization) => organization.id === filter?.id) || null;
            }
            return null;
        }
        async find() { return []; }
        async count() { return 0; }
        create(_entity, data) { return data; }
        async save(_entity, data) { return data; }
        async update() { return null; }
        async remove() { }
        async aggregate() { return []; }
    }
    return { Repository, calls };
}

async function listOrganizations(fixture, msg) {
    const { Repository, calls } = makeRepository(fixture);
    const start = capturedHandlers.length;
    const { OrganizationService } = await loadService(
        '../dist/api/organization-service.js',
        {
            '@guardian/common': { DatabaseServer: Repository },
            '@guardian/interfaces': { OrgRolePermission: { MEMBER_MANAGE } },
        }
    );
    const logger = { async error() { }, async info() { }, async warn() { }, async debug() { } };
    new OrganizationService().registerListeners(logger);
    const handler = capturedHandlers
        .slice(start)
        .find(({ event }) => String(event).endsWith('GET_ORGANIZATIONS'));
    assert.ok(handler, 'GET_ORGANIZATIONS handler is registered');

    const response = await handler.cb({ owner: { creator: 'did:sr' }, userId: 'u-1', ...msg });
    assert.ok(!response?.error, `handler returned an error: ${response?.error}`);
    return { body: response.body, calls };
}

const owned = (id, extra = {}) => ({
    id, name: `Org ${id}`, owner: 'did:sr', walletToken: `wallet-${id}`, ...extra
});

describe('@unit organization-service GET_ORGANIZATIONS', function () {
    // each case loads the dist module under esmock; the first load is well over
    // mocha's 2s default on a cold cache
    this.timeout(30000);
    afterEach(() => { capturedHandlers.length = 0; });

    describe('the administered organization', () => {
        const administered = {
            organizations: [owned('own-1'), { ...owned('admin-1'), owner: 'did:other-sr' }],
            member: { did: 'did:sr', active: true, orgRoleId: 'role-1', organizationId: 'admin-1' },
            role: { id: 'role-1', permissions: [MEMBER_MANAGE] },
        };

        it('is part of the query, not appended to the first page', async () => {
            const { calls } = await listOrganizations(administered, { pageIndex: 0, pageSize: 10 });

            const { filter } = calls.findAndCount[0];
            assert.ok(Array.isArray(filter.$or), 'the filter should be an $or over owner and administered id');
            assert.deepEqual(filter.$or, [{ owner: 'did:sr' }, { id: 'admin-1' }]);
        });

        it('reports the same count on every page', async () => {
            const first = await listOrganizations(administered, { pageIndex: 0, pageSize: 1 });
            const second = await listOrganizations(administered, { pageIndex: 1, pageSize: 1 });

            assert.equal(first.body.count, second.body.count,
                'a total that changes between pages cannot be paged through');
            assert.equal(first.body.count, 2);
        });

        it('never returns more items than the requested page size', async () => {
            const { body } = await listOrganizations(administered, { pageIndex: 0, pageSize: 1 });

            assert.equal(body.items.length, 1);
        });

        it('appears once when the caller both owns it and administers it', async () => {
            const both = {
                organizations: [owned('own-1'), owned('own-2'), owned('own-3')],
                member: { did: 'did:sr', active: true, orgRoleId: 'role-1', organizationId: 'own-1' },
                role: { id: 'role-1', permissions: [MEMBER_MANAGE] },
            };

            const { body } = await listOrganizations(both, { pageIndex: 0, pageSize: 2 });
            const ids = body.items.map((item) => item.id);

            assert.equal(new Set(ids).size, ids.length, `duplicate row in ${JSON.stringify(ids)}`);
            assert.equal(body.count, 3, 'the count must not double-count an owned organization');
        });

        it('is not included when the member role lacks MEMBER_MANAGE', async () => {
            const { calls } = await listOrganizations({
                ...administered,
                role: { id: 'role-1', permissions: ['POLICY_VIEW'] },
            }, {});

            const { filter } = calls.findAndCount[0];
            assert.equal(filter.$or, undefined);
            assert.equal(filter.owner, 'did:sr');
        });

        it('keeps the wallet token hidden on rows the caller does not own', async () => {
            const { body } = await listOrganizations(administered, {});

            const administeredRow = body.items.find((item) => item.id === 'admin-1');
            const ownedRow = body.items.find((item) => item.id === 'own-1');
            assert.equal(administeredRow.walletToken, undefined,
                'a delegated admin must not receive the vault credential locator');
            assert.equal(ownedRow.walletToken, 'wallet-own-1', 'the owner still sees their own');
        });
    });

    describe('the name filter', () => {
        const fixture = { organizations: [owned('own-1')], member: null, role: null };

        it('is applied once, case-insensitively', async () => {
            const { calls } = await listOrganizations(fixture, { filters: { name: 'acme' } });

            assert.deepEqual(calls.findAndCount[0].filter.name, {
                $regex: '.*acme.*',
                $options: 'i',
            });
        });

        it('escapes regex metacharacters instead of passing them to Mongo', async () => {
            const { calls } = await listOrganizations(fixture, { filters: { name: 'a[b(c' } });

            const { $regex } = calls.findAndCount[0].filter.name;
            assert.equal($regex, '.*a\\[b\\(c.*');
            assert.doesNotThrow(() => new RegExp($regex),
                'an unescapable expression reaches Mongo as a 500');
        });

        it('applies to the administered organization by the same rule', async () => {
            const { calls } = await listOrganizations({
                organizations: [owned('own-1')],
                member: { did: 'did:sr', active: true, orgRoleId: 'role-1', organizationId: 'admin-1' },
                role: { id: 'role-1', permissions: [MEMBER_MANAGE] },
            }, { filters: { name: 'acme' } });

            const { filter } = calls.findAndCount[0];
            assert.ok(filter.$or, 'both branches are in one query');
            assert.ok(filter.name, 'so one name predicate covers both');
        });
    });
});
