import { assert } from 'chai';
import esmock from 'esmock';

/**
 * Lazy schema loading in ComponentsService: registerPolicy/registerTool only
 * record topic ids; loadSchemaByID/loadSchemaByType resolve a single schema on
 * first use, cache it (incl. a null miss), and exclude duplicate VIEW schemas
 * unless the policy itself is a VIEW policy.
 */

let getSchemasCalls = [];
let schemaStore = [];

// Emulate DatabaseServer.getSchemas(filter) against schemaStore, honouring the
// filter shape produced by resolveSchema: { iri|entity, readonly?, topicId:{$in}, status?:{$ne} }.
function getSchemasImpl(filter = {}) {
    getSchemasCalls.push(filter);
    return schemaStore.filter((s) => {
        if (filter.iri !== undefined && s.iri !== filter.iri) { return false; }
        if (filter.entity !== undefined && s.entity !== filter.entity) { return false; }
        if (filter.readonly !== undefined && Boolean(s.readonly) !== filter.readonly) { return false; }
        if (filter.topicId && filter.topicId.$in && !filter.topicId.$in.includes(s.topicId)) { return false; }
        if (filter.status && filter.status.$ne !== undefined && s.status === filter.status.$ne) { return false; }
        return true;
    });
}

const { ComponentsService } = await esmock.strict(
    '../../../dist/policy-engine/helpers/components-service.js',
    {
        '@guardian/common': {
            DatabaseServer: class {
                constructor() { }
                static async getSchemas(filter) { return getSchemasImpl(filter); }
            },
            PinoLogger: class { info() { } warn() { } error() { } },
            TopicConfig: class { },
            Users: class { },
            VcHelper: class { },
        },
        '@guardian/interfaces': {
            GenerateUUIDv4: () => 'uuid',
            PolicyHelper: { isDryRunMode: () => false },
            PolicyStatus: { PUBLISH: 'PUBLISH', VIEW: 'VIEW', DRAFT: 'DRAFT' },
            SchemaStatus: { VIEW: 'VIEW', PUBLISHED: 'PUBLISHED' },
        },
    },
);

const POLICY_TOPIC = '0.0.POLICY';
const TOOL_TOPIC = '0.0.TOOL';

function makeService(status = 'DRAFT') {
    return new ComponentsService(
        { owner: 'o', ownerId: 'oid', topicId: POLICY_TOPIC, status },
        'policy-id'
    );
}

async function registered(status = 'DRAFT') {
    const svc = makeService(status);
    await svc.registerPolicy({ topicId: POLICY_TOPIC, status });
    await svc.registerTool({ topicId: TOOL_TOPIC });
    return svc;
}

describe('@unit ComponentsService lazy schema loading', () => {
    beforeEach(() => {
        getSchemasCalls = [];
        schemaStore = [
            { iri: '#A', entity: null, readonly: false, topicId: POLICY_TOPIC, status: 'PUBLISHED' },
            { iri: '#A', entity: null, readonly: false, topicId: POLICY_TOPIC, status: 'VIEW' }, // duplicate view copy
            { iri: '#B', entity: null, readonly: false, topicId: TOOL_TOPIC, status: 'PUBLISHED' },
            { iri: '#R', entity: 'MINT_TOKEN', readonly: true, topicId: POLICY_TOPIC, status: 'PUBLISHED' },
        ];
    });

    it('registerPolicy/registerTool do NOT bulk-load schemas', async () => {
        await registered();
        assert.equal(getSchemasCalls.length, 0, 'no schema query should run at registration');
    });

    it('loadSchemaByID resolves on first use, from policy + tool topics, excluding VIEW', async () => {
        const svc = await registered('DRAFT');

        const a = await svc.loadSchemaByID('#A');
        assert.equal(a.iri, '#A');
        assert.equal(a.status, 'PUBLISHED', 'VIEW duplicate must be excluded for a non-VIEW policy');
        assert.equal(getSchemasCalls.length, 1);

        const filter = getSchemasCalls[0];
        assert.deepEqual(filter.topicId, { $in: [POLICY_TOPIC, TOOL_TOPIC] }, 'searches policy + tool topics');
        assert.deepEqual(filter.status, { $ne: 'VIEW' }, 'excludes VIEW schemas');
        assert.equal(filter.iri, '#A');

        // tool-topic schema also resolves (proves the tool topic was tracked)
        const b = await svc.loadSchemaByID('#B');
        assert.equal(b.iri, '#B');
    });

    it('caches a resolved schema (no re-query on second call)', async () => {
        const svc = await registered();
        await svc.loadSchemaByID('#A');
        await svc.loadSchemaByID('#A');
        assert.equal(getSchemasCalls.length, 1, 'second lookup served from cache');
    });

    it('caches a null miss (no re-query for an absent schema)', async () => {
        const svc = await registered();
        const miss1 = await svc.loadSchemaByID('#DOES_NOT_EXIST');
        const miss2 = await svc.loadSchemaByID('#DOES_NOT_EXIST');
        assert.isUndefined(miss1);
        assert.isUndefined(miss2);
        assert.equal(getSchemasCalls.length, 1, 'absent schema queried once, then cached');
    });

    it('loadSchemaByType resolves the readonly schema for an entity', async () => {
        const svc = await registered();
        const r = await svc.loadSchemaByType('MINT_TOKEN');
        assert.equal(r.iri, '#R');
        const filter = getSchemasCalls[0];
        assert.equal(filter.entity, 'MINT_TOKEN');
        assert.equal(filter.readonly, true);
        assert.deepEqual(filter.status, { $ne: 'VIEW' });
    });

    it('a VIEW policy resolves VIEW schemas (no status exclusion)', async () => {
        const svc = await registered('VIEW');
        await svc.loadSchemaByID('#A');
        const filter = getSchemasCalls[0];
        assert.isUndefined(filter.status, 'VIEW policy must not exclude VIEW schemas');
    });
});
