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

/*
 * A self- or mutually-referencing archive used to recurse without end: the only
 * dedup check is a getTool lookup for a row createTool writes after the
 * recursion returns. `graph` is the sub-tool list parseZipFile hands back.
 */
let graph, calls;

function reset() {
    graph = {};
    calls = { saveFile: [], createTool: [], getMessage: [] };
}
reset();

const DatabaseServerMock = {
    async getTool() { return null; },                       // nothing pre-existing
    async getTools() { return []; },                        // updateToolConfig walks sub-tools
    async getTopicById() { return { topicId: '0.0.1' }; },
    async saveTopic() {},
    async getSchemas() { return []; },
    async saveSchemas() {},
    createSchema(s) { return { ...s }; },
    async saveFile(uuid) { calls.saveFile.push(uuid); return `file-${calls.saveFile.length}`; },
    async createTool(tool) {
        calls.createTool.push(tool.messageId);
        return { ...tool, id: `db-${calls.createTool.length}` };
    },
};

class MessageServerMock {
    async getMessage({ messageId }) {
        calls.getMessage.push(messageId);
        return {
            type: 'tool', action: 'publish-tool',
            document: `zip:${messageId}`,
            hash: `hash-${messageId}`, owner: 'did:owner',
            uuid: `uuid-${messageId}`, id: messageId,
            topicId: { toString: () => '0.0.2' },
            name: messageId, description: messageId,
            tagsTopicId: null,
        };
    }
    async getMessages() { return []; }
}

const ToolImportExportMock = {
    async parseZipFile(document) {
        const id = String(document).replace(/^zip:/, '');
        return {
            tool: { name: id, config: { blockType: 'tool' } },
            tools: (graph[id] || []).map((m) => ({ name: m, messageId: m })),
            schemas: [],
            tags: [],
        };
    },
};

function makeNotifier() {
    const n = {
        // importSubTools passes addStep's return value down as the child
        // notifier, so it has to be one.
        addStep() { return makeNotifier(); },
        start() {}, startStep() {}, completeStep() {},
        skipStep() {}, complete() {}, fail() {}, setEstimate() {},
        getStep() { return makeNotifier(); },
    };
    return n;
}

let mod;
before(async function () {
    this.timeout(120000);
    mod = await esmock(helperPath, {
        '@guardian/common': {
            DatabaseServer: DatabaseServerMock,
            MessageServer: MessageServerMock,
            ToolImportExport: ToolImportExportMock,
            MessageType: { Tool: 'tool', Tag: 'tag' },
            MessageAction: { PublishTool: 'publish-tool', PublishTag: 'publish-tag' },
        },
        [tagHelperPath]: { importTag: async () => {} },
        [schemaHelperPath]: {
            SchemaImportExportHelper: {
                importSchemaByFiles: async () => ({ schemasMap: [], errors: [] }),
            },
        },
    });
});

beforeEach(() => reset());

const account = { hederaAccountId: '0.0.222', hederaAccountKey: 'k', signOptions: {} };
const user = { id: 'u-1', creator: 'did:creator', owner: 'did:owner' };

const importTool = (id) =>
    mod.importToolByMessage(account, id, user, makeNotifier(), 'u-1');

describe('@unit tool import cycle guard', function () {
    this.timeout(20000);

    it('a tool that lists itself terminates instead of looping', async () => {
        graph = { A: ['A'] };
        const result = await importTool('A');
        // The outer import still succeeds; the self-reference is reported as a
        // per-tool error, which is how importSubTools surfaces any bad entry.
        assert.equal(result.tool.messageId, 'A');
        assert.lengthOf(result.errors, 1);
        assert.match(result.errors[0].error, /[Cc]ircular/);
    });

    it('a mutual reference A -> B -> A terminates', async () => {
        graph = { A: ['B'], B: ['A'] };
        const result = await importTool('A');
        assert.equal(result.tool.messageId, 'A');
        assert.deepEqual(calls.createTool.sort(), ['A', 'B']);
        assert.isAtMost(calls.getMessage.length, 4, 'must not keep re-fetching around the loop');
    });

    it('a longer cycle A -> B -> C -> A terminates', async () => {
        graph = { A: ['B'], B: ['C'], C: ['A'] };
        const result = await importTool('A');
        assert.equal(result.tool.messageId, 'A');
        assert.deepEqual(calls.createTool.sort(), ['A', 'B', 'C']);
    });

    it('writes no GridFS blob for a tool it never creates', async () => {
        // The orphan-per-turn symptom: saveFile ran before the recursion, so a
        // blob was written for every level the loop reached and never referenced.
        graph = { A: ['A'] };
        await importTool('A');
        assert.equal(calls.saveFile.length, calls.createTool.length,
            'every saved blob must belong to a tool that was actually created');
    });

    it('does not mistake a diamond for a cycle', async () => {
        // A imports B and C, both of which import D. D is on two different paths,
        // not on its own path, so it must import rather than be refused.
        graph = { A: ['B', 'C'], B: ['D'], C: ['D'], D: [] };
        const result = await importTool('A');
        assert.deepEqual(result.errors, [], 'a diamond is legitimate');
        assert.include(calls.createTool, 'D');
    });

    it('a sibling repeated at the same level is not a cycle either', async () => {
        graph = { A: ['B', 'B'], B: [] };
        const result = await importTool('A');
        assert.deepEqual(result.errors, []);
    });

    it('stops a pathological but acyclic chain at the depth ceiling', async () => {
        graph = {};
        for (let i = 0; i < 60; i++) { graph[`T${i}`] = [`T${i + 1}`]; }
        graph.T60 = [];
        const result = await importTool('T0');
        // Deepest levels are refused; the import still returns rather than hanging.
        assert.isAbove(result.errors.length, 0);
        assert.match(result.errors[0].error, /nested deeper than/);
        assert.isBelow(calls.getMessage.length, 60, 'the ceiling must actually bound the walk');
    });

    it('a plain tool with no sub-tools is unaffected', async () => {
        graph = { A: [] };
        const result = await importTool('A');
        assert.equal(result.tool.messageId, 'A');
        assert.deepEqual(result.errors, []);
        assert.deepEqual(calls.createTool, ['A']);
        assert.equal(calls.saveFile.length, 1);
    });

    it('a normal nested tool still imports its sub-tool', async () => {
        graph = { A: ['B'], B: [] };
        const result = await importTool('A');
        assert.deepEqual(result.errors, []);
        assert.deepEqual(calls.createTool.sort(), ['A', 'B']);
    });
});
