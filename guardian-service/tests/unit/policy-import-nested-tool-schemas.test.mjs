import assert from 'node:assert/strict';
import esmock from 'esmock';
import { SchemaCategory, SchemaStatus } from '@guardian/interfaces';

function document(name, iri) {
    return {
        $id: iri,
        $comment: JSON.stringify({ '@id': iri, term: iri.substring(1) }),
        title: name,
        description: name,
        type: 'object',
        properties: {
            field1: {
                title: 'field1',
                description: 'field1',
                readOnly: false,
                type: 'string',
                $comment: '{"term":"field1","@id":"https://www.schema.org/text"}',
            },
        },
        required: [],
        additionalProperties: false,
    };
}

function schema(name, iri, topicId) {
    return {
        name,
        description: name,
        entity: 'VC',
        iri,
        uuid: iri.substring(1),
        version: '1.0.0',
        codeVersion: '1.2.0',
        topicId,
        contextURL: 'schema:' + iri.substring(1),
        document: document(name, iri),
    };
}

function policySchema(targetName = 'Nested schema', targetIri = '#source-nested') {
    const result = schema('Policy schema', '#source-policy', 'source-topic');
    result.document.properties.nested = {
        title: 'nested',
        description: 'Nested schema',
        readOnly: false,
        $ref: targetIri,
        $comment: JSON.stringify({ term: 'nested', '@id': targetIri }),
    };
    result.document.$defs = { [targetIri]: document(targetName, targetIri) };
    return result;
}

function notifier() {
    return {
        start() {}, complete() {}, addEstimate() {}, setEstimate() {},
        startStep() {}, completeStep() {},
        addStep() { return notifier(); },
        getStep() { return notifier(); },
    };
}

let localSchemas;
let saved;
let queries;
let PolicyImport;

before(async function () {
    this.timeout(120000);
    ({ PolicyImport } = await esmock(
        '../../dist/helpers/import-helpers/policy/policy-import.js',
        {},
        {
            '@guardian/common/database-modules/database-server': {
                DatabaseServer: {
                    async getSchemas(filter, options) {
                        queries.push({ filter, options });
                        assert.ok(Array.isArray(filter.topicId?.$in));
                        return structuredClone(localSchemas.filter(
                            (row) => filter.topicId.$in.includes(row.topicId)
                        ));
                    },
                    async getTools() {
                        return localSchemas.map(({ topicId }) => ({ topicId }));
                    },
                    async getTopicById() { return { topicId: 'policy-topic' }; },
                    createSchema(value) { return { ...value }; },
                    async saveSchema(value) {
                        saved.push(value);
                        return { ...value, id: 'saved-' + saved.length };
                    },
                },
            },
            '@guardian/common/helpers/users': {
                Users: class {
                    async getHederaAccount() {
                        return { hederaAccountId: '0.0.222', hederaAccountKey: 'key', signOptions: {} };
                    }
                },
            },
            '@guardian/hedera/topic': {
                TopicConfig: { async fromObject(value) { return value; } },
            },
            '@guardian/hedera/topic-helper': { TopicHelper: class {} },
        }
    ));
});

beforeEach(() => {
    localSchemas = [
        schema('Direct schema', '#local-direct', 'direct-topic'),
        schema('Nested schema', '#local-nested', 'nested-topic'),
        schema('Unrelated schema', '#local-unrelated', 'unrelated-topic'),
    ];
    saved = [];
    queries = [];
});

async function importSchemas(schemas = [policySchema()], tools = [
    { topicId: 'direct-topic', tools: [{ topicId: 'nested-topic' }] },
]) {
    const importer = new PolicyImport('COMMON', notifier());
    importer.toolsResult = { tools, errors: [] };
    importer.topicRow = { topicId: 'policy-topic' };
    await importer.importSchemas(
        schemas,
        { id: 'user', owner: 'did:owner', creator: 'did:owner' },
        notifier(),
        'user'
    );
    return importer.schemasResult;
}

const savedPolicy = () => saved.find((row) => row.name === 'Policy schema');

describe('@unit policy import nested tool schemas', function () {
    this.timeout(20000);

    it('saves a nested reference with its local IRI and no import errors', async () => {
        const result = await importSchemas();
        assert.deepEqual(result.errors, []);
        assert.equal(savedPolicy().document.properties.nested.$ref, '#local-nested');
        assert.equal(savedPolicy().category, SchemaCategory.POLICY);
        assert.equal(savedPolicy().topicId, 'policy-topic');
        assert.equal(savedPolicy().status, SchemaStatus.DRAFT);
        assert.ok(!JSON.stringify(savedPolicy().document).includes('#source-nested'));
        assert.deepEqual(queries.slice(0, 2), [
            {
                filter: { category: SchemaCategory.TOOL, topicId: { $in: ['direct-topic'] } },
                options: { fields: ['name', 'iri'] },
            },
            {
                filter: { category: SchemaCategory.TOOL, topicId: { $in: ['nested-topic'] } },
                options: { fields: ['name', 'iri'] },
            },
        ]);
    });

    it('keeps direct references when a nested schema has the same title', async () => {
        localSchemas.push(schema('Direct schema', '#nested-collision', 'nested-topic'));
        const result = await importSchemas([policySchema('Direct schema', '#source-direct')]);
        assert.deepEqual(result.errors, []);
        assert.equal(savedPolicy().document.properties.nested.$ref, '#local-direct');
    });

    it('keeps policy-owned references when a nested schema has the same title', async () => {
        const child = schema('Nested schema', '#source-child', 'source-topic');
        const result = await importSchemas([policySchema(child.name, child.iri), child]);
        assert.deepEqual(result.errors, []);
        const savedChild = saved.find((row) => row.name === child.name);
        assert.ok(savedChild.iri);
        assert.notEqual(savedChild.iri, '#local-nested');
        assert.equal(savedPolicy().document.properties.nested.$ref, savedChild.iri);
    });

    it('does not bind a nested title that maps to different local IRIs', async () => {
        localSchemas.push(schema('Nested schema', '#second-nested', 'nested-topic'));
        const result = await importSchemas();
        assert.equal(savedPolicy().document.properties.nested.$ref, null);
        assert.equal(savedPolicy().status, SchemaStatus.DRAFT);
        assert.deepEqual(result.errors.map(({ name, error }) => ({ name, error })), [
            { name: 'Policy schema', error: 'Invalid defs' },
        ]);
    });

    it('keeps the missing-reference error when only an unrelated tool has the title', async () => {
        localSchemas = localSchemas.filter((row) => row.topicId !== 'nested-topic');
        localSchemas.push(schema('Nested schema', '#unrelated-nested', 'unrelated-topic'));
        const result = await importSchemas();
        assert.equal(savedPolicy().document.properties.nested.$ref, null);
        assert.equal(savedPolicy().status, SchemaStatus.DRAFT);
        assert.deepEqual(result.errors.map(({ name, error }) => ({ name, error })), [
            { name: 'Policy schema', error: 'Invalid defs' },
        ]);
    });

    it('accepts repeated nested rows with one IRI', async () => {
        localSchemas.push(structuredClone(localSchemas[1]));
        const result = await importSchemas();
        assert.deepEqual(result.errors, []);
        assert.equal(savedPolicy().document.properties.nested.$ref, '#local-nested');
    });

    it('imports a policy with no tools without a nested lookup', async () => {
        const result = await importSchemas([schema('Standalone', '#source-alone', 'source-topic')], []);
        assert.deepEqual(result.errors, []);
        assert.equal(saved.length, 1);
        assert.deepEqual(queries.filter(({ filter }) => filter.category), [
            {
                filter: { category: SchemaCategory.TOOL, topicId: { $in: [] } },
                options: { fields: ['name', 'iri'] },
            },
        ]);
    });
});
