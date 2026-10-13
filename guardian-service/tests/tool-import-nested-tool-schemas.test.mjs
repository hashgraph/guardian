import { assert } from 'chai';
import path from 'path';
import { fileURLToPath } from 'url';
import esmock from 'esmock';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const P = (p) => p.split(path.sep).join('/');

const helperPath = P(path.join(distDir, 'helpers/import-helpers/tool/tool-import-helper.js'));
const tagHelperPath = P(path.join(distDir, 'helpers/import-helpers/tag/tag-import-helper.js'));
const schemaHelperPath = P(path.join(distDir, 'helpers/import-helpers/schema/schema-import-helper.js'));
const resolverPath = P(path.join(distDir, 'helpers/import-helpers/tool/tool-override-resolver.js'));

const localSchemas = [
    { name: 'Tool 13 schema', iri: '#local-13', topicId: '0.0.13' },
    { name: 'Tool 06 schema', iri: '#local-06', topicId: '0.0.6' },
    { name: 'Tool 05 schema', iri: '#local-05', topicId: '0.0.5' },
    { name: 'Tool 04 schema', iri: '#local-04', topicId: '0.0.4' },
    { name: 'Tool 03 schema', iri: '#local-03', topicId: '0.0.3' },
    { name: 'Tool 07 schema', iri: '#local-07', topicId: '0.0.7' },
    { name: 'Shared nested', iri: '#shared-04', topicId: '0.0.4' },
    { name: 'Shared nested', iri: '#shared-03', topicId: '0.0.3' },
    { name: 'Same row', iri: '#same', topicId: '0.0.4' },
    { name: 'Same row', iri: '#same', topicId: '0.0.3' },
    { name: 'Conflict', iri: '#conflict-06', topicId: '0.0.6' },
    { name: 'Conflict', iri: '#conflict-04', topicId: '0.0.4' },
    { name: 'Unrelated schema', iri: '#local-99', topicId: '0.0.99' },
];

const tool04Document = (id) => ({
    $id: id,
    $comment: `{ "@id": "${id}", "term": "${id.substring(1)}" }`,
    title: 'Tool 04 schema',
    description: 'Tool 04 schema',
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
});

const realLocalSchemas = [
    {
        name: 'Tool 04 schema',
        iri: '#local-04',
        uuid: 'local-04',
        topicId: '0.0.4',
        contextURL: 'schema:local-04',
        codeVersion: '1.2.0',
        document: tool04Document('#local-04'),
    },
];

const sourceTool14Schema = () => ({
    name: 'Tool 14 schema',
    description: 'Tool 14 schema',
    entity: 'VC',
    iri: '#src-14',
    uuid: 'src-14',
    version: '1.0.0',
    codeVersion: '1.2.0',
    document: {
        $id: '#src-14',
        $comment: '{ "@id": "#src-14", "term": "src-14" }',
        title: 'Tool 14 schema',
        description: 'Tool 14 schema',
        type: 'object',
        properties: {
            tool_04: {
                title: 'tool_04',
                description: 'Tool 04',
                readOnly: false,
                $ref: '#src-04',
                $comment: '{"term":"tool_04","@id":"#src-04"}',
            },
        },
        required: [],
        additionalProperties: false,
        $defs: {
            '#src-04': tool04Document('#src-04'),
        },
    },
});

let preResolvedTools, calls;

function reset() {
    preResolvedTools = [];
    calls = { getSchemas: [], importSchemaByFiles: [], saveSchema: [] };
}
reset();

const byTopics = (rows, filter) => {
    const topicIds = filter?.topicId?.$in || [];
    return rows.filter((s) => topicIds.includes(s.topicId));
};

const baseDatabaseServer = {
    async getTool() { return null; },
    async getTopicByType() { return { topicId: '0.0.1' }; },
    async getTopicById() { return { topicId: '0.0.14' }; },
    async saveTopic() {},
    async updateTopic() {},
    async updateTool() {},
    async createTool(tool) { return { ...tool, id: 'db-14' }; },
};

const DatabaseServerMock = {
    ...baseDatabaseServer,
    async getTools() { return []; },
    async getSchemas(filter) {
        calls.getSchemas.push(filter);
        return byTopics(localSchemas, filter).map(({ name, iri }) => ({ name, iri }));
    },
};

const RealDatabaseServerMock = {
    ...baseDatabaseServer,
    async getTools(filter) {
        if (filter?.messageId) {
            return [];
        }
        return [{ topicId: '0.0.13' }, { topicId: '0.0.4' }];
    },
    async getSchemas(filter) {
        calls.getSchemas.push(filter);
        return byTopics(realLocalSchemas, filter).map((s) => ({ ...s }));
    },
    createSchema(schema) { return { ...schema }; },
    async saveSchema(schema) {
        calls.saveSchema.push(schema);
        return { ...schema, id: `saved-${calls.saveSchema.length}` };
    },
};

class UsersMock {
    async getHederaAccount() {
        return { hederaAccountId: '0.0.222', hederaAccountKey: 'k', signOptions: {} };
    }
}

class TopicHelperMock {
    async create() {
        return {
            topicId: '0.0.14',
            async saveKeys() {},
            toObject() { return { topicId: '0.0.14' }; },
        };
    }
    async twoWayLink() {}
}

class MessageServerMock {
    setTopicObject() { return this; }
    async sendMessage() { return { getId: () => 'create-message' }; }
}

class ToolMessageMock {
    setDocument() {}
}

const commonMock = (databaseServer) => ({
    DatabaseServer: databaseServer,
    Users: UsersMock,
    TopicHelper: TopicHelperMock,
    TopicConfig: { async fromObject(row) { return row; } },
    MessageServer: MessageServerMock,
    ToolMessage: ToolMessageMock,
    MessageType: { Tool: 'tool', Tag: 'tag' },
    MessageAction: { CreateTool: 'create-tool', PublishTool: 'publish-tool', PublishTag: 'publish-tag' },
});

const resolverMock = {
    resolveToolOverrides: async () => ({
        toolsMapping: [],
        preResolvedTools,
        toolsToImport: [],
    }),
};

function makeNotifier() {
    return {
        addStep() { return makeNotifier(); },
        start() {}, startStep() {}, completeStep() {},
        skipStep() {}, complete() {}, fail() {}, setEstimate() {}, addEstimate() {},
        getStep() { return makeNotifier(); },
    };
}

let mod, realMod;
before(async function () {
    this.timeout(120000);
    mod = await esmock(helperPath, {
        '@guardian/common': commonMock(DatabaseServerMock),
        [tagHelperPath]: { importTag: async () => {} },
        [resolverPath]: resolverMock,
        [schemaHelperPath]: {
            SchemaImportExportHelper: {
                async importSchemaByFiles(schemas, user, options) {
                    calls.importSchemaByFiles.push(options);
                    return { schemasMap: [], errors: [] };
                },
            },
        },
    });
    realMod = await esmock(helperPath, {
        [tagHelperPath]: { importTag: async () => {} },
        [resolverPath]: resolverMock,
    }, {
        '@guardian/common': commonMock(RealDatabaseServerMock),
    });
});

beforeEach(() => reset());

const user = { id: 'u-1', creator: 'did:creator', owner: 'did:owner' };

const importTool = (target, schemas = []) => target.importToolByFile(
    user,
    {
        tool: { name: 'Tool 14', config: { blockType: 'tool', children: [] } },
        tools: [],
        schemas,
        tags: [],
    },
    { tools: {} },
    makeNotifier(),
    'u-1'
);

const outerIris = () => calls.importSchemaByFiles[0].outerSchemas.map((s) => s.iri).sort();
const queriedTopics = (index) => [...calls.getSchemas[index].topicId.$in].sort();

const ticketGraph = () => [
    {
        messageId: 'm-13',
        topicId: '0.0.13',
        hash: 'h-13',
        tools: [
            { messageId: 'm-04', topicId: '0.0.4' },
            { messageId: 'm-03', topicId: '0.0.3' },
            { messageId: 'm-05', topicId: '0.0.5' },
            { messageId: 'm-xx' },
        ],
    },
    { messageId: 'm-06', topicId: '0.0.6', hash: 'h-06', tools: [] },
    { messageId: 'm-05', topicId: '0.0.5', hash: 'h-05' },
];

describe('@unit tool file import outer schemas', function () {
    this.timeout(20000);

    it('keeps the direct dependency query unchanged', async () => {
        preResolvedTools = ticketGraph();
        await importTool(mod);
        assert.deepEqual(queriedTopics(0), ['0.0.13', '0.0.5', '0.0.6']);
    });

    it('queries a tool that is both direct and nested only as direct', async () => {
        preResolvedTools = ticketGraph();
        await importTool(mod);
        assert.deepEqual(queriedTopics(1), ['0.0.3', '0.0.4']);
        assert.equal(outerIris().filter((iri) => iri === '#local-05').length, 1);
    });

    it('adds a nested schema with a new unique name', async () => {
        preResolvedTools = ticketGraph();
        await importTool(mod);
        assert.include(outerIris(), '#local-04');
        assert.include(outerIris(), '#local-03');
    });

    it('adds neither nested schema when two share a name with different IRIs', async () => {
        preResolvedTools = ticketGraph();
        await importTool(mod);
        assert.notInclude(outerIris(), '#shared-04');
        assert.notInclude(outerIris(), '#shared-03');
    });

    it('adds a nested schema once when the same name has the same IRI', async () => {
        preResolvedTools = ticketGraph();
        await importTool(mod);
        assert.equal(outerIris().filter((iri) => iri === '#same').length, 1);
    });

    it('keeps the direct schema when a nested schema has the same name', async () => {
        preResolvedTools = ticketGraph();
        await importTool(mod);
        assert.include(outerIris(), '#conflict-06');
        assert.notInclude(outerIris(), '#conflict-04');
    });

    it('builds the full outer schema list for the ticket graph', async () => {
        preResolvedTools = ticketGraph();
        await importTool(mod);
        assert.deepEqual(outerIris(), [
            '#conflict-06',
            '#local-03',
            '#local-04',
            '#local-05',
            '#local-06',
            '#local-13',
            '#same',
        ]);
    });

    it('adds a schema of a tool two levels down from the stored tools list', async () => {
        preResolvedTools = [
            {
                messageId: 'm-13',
                topicId: '0.0.13',
                hash: 'h-13',
                tools: [
                    { messageId: 'm-05', topicId: '0.0.5' },
                    { messageId: 'm-07', topicId: '0.0.7' },
                ],
            },
        ];
        await importTool(mod);
        assert.deepEqual(queriedTopics(1), ['0.0.5', '0.0.7']);
        assert.include(outerIris(), '#local-07');
    });

    it('makes no nested query when no dependency has nested tools', async () => {
        preResolvedTools = [
            { messageId: 'm-06', topicId: '0.0.6', hash: 'h-06' },
        ];
        await importTool(mod);
        assert.lengthOf(calls.getSchemas, 1);
        assert.deepEqual(outerIris(), ['#conflict-06', '#local-06']);
    });

    it('a tool with no dependencies gets no outer schemas', async () => {
        preResolvedTools = [];
        await importTool(mod);
        assert.lengthOf(calls.getSchemas, 1);
        assert.deepEqual(queriedTopics(0), []);
        assert.deepEqual(outerIris(), []);
    });
});

describe('@unit tool file import nested sub-schema reference', function () {
    this.timeout(20000);

    it('rebinds a nested dependency $ref to the local schema without Invalid defs', async () => {
        preResolvedTools = [
            {
                messageId: 'm-13',
                topicId: '0.0.13',
                hash: 'h-13',
                tools: [{ messageId: 'm-04', topicId: '0.0.4' }],
            },
        ];
        const result = await importTool(realMod, [sourceTool14Schema()]);
        assert.deepEqual(result.errors, []);
        assert.lengthOf(calls.saveSchema, 1);
        const saved = calls.saveSchema[0];
        assert.equal(saved.document.properties.tool_04.$ref, '#local-04');
        assert.notInclude(JSON.stringify(saved.document), '#src-04');
    });
});
