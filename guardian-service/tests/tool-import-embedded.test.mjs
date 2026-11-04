// Embedded (self-contained, v2) tool entry import: the archive carries the full
// tool row (config + schemas + tags) instead of a 5-field stub, so the import
// re-publishes the content locally - new topic, new consensus message, new
// messageId - instead of fetching a consensus message that only exists on the
// source network.
//
// Mirrors tool-import-cycle.test.mjs: esmock against the compiled dist, real
// ToolImportExport (zip generation = the hash source) and real Hashing, mocked
// DatabaseServer / MessageServer / TopicHelper / TopicConfig / tag + schema
// helpers. @guardian/interfaces and the hedera enums stay real.

import { assert } from 'chai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esmock from 'esmock';
import { BlockType, ModuleStatus, TopicType } from '@guardian/interfaces';
import { Hashing } from '@guardian/common/helpers/hashing';
import { MessageType } from '@guardian/hedera/message/message-type';
import { MessageAction } from '@guardian/hedera/message/message-action';
import { ToolImportExport as RealToolImportExport } from '@guardian/common/import-export/tool';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const P = (p) => p.split(path.sep).join('/');

const helperPath = P(path.join(distDir, 'helpers/import-helpers/tool/tool-import-helper.js'));
const tagHelperPath = P(path.join(distDir, 'helpers/import-helpers/tag/tag-import-helper.js'));
const schemaHelperPath = P(path.join(distDir, 'helpers/import-helpers/schema/schema-import-helper.js'));

// ---------------------------------------------------------------------------
// Mutable mock state
// ---------------------------------------------------------------------------
let topicSeq = 0;
let messageSeq = 0;
let rowSeq = 0;
let saveFileSeq = 0;

const calls = {
    getTool: [],
    getTopicByType: [],
    saveTopic: [],
    getTopicById: [],
    updateTopic: [],
    getSchemas: [],
    getTools: [],
    saveFile: [],
    createTool: [],
    sendMessage: [],
    topicCreate: [],
    twoWayLink: [],
    importTag: [],
    importSchemaByFiles: [],
    getMessage: [],
    getMessages: [],
};

// Rows created through createTool / saveTopic, keyed like the DB would keep them.
const db = {
    tools: [],
    topics: new Map(),
    userTopic: null,
};

function reset() {
    topicSeq = 0;
    messageSeq = 0;
    rowSeq = 0;
    saveFileSeq = 0;
    for (const key of Object.keys(calls)) calls[key].length = 0;
    db.tools.length = 0;
    db.topics.clear();
    db.userTopic = {
        topicId: '0.0.1',
        name: 'User Topic',
        owner: 'did:owner',
        type: TopicType.UserTopic,
    };
    graph = {};
}

// By-message fetch results, keyed by messageId.
let graph = {};
let fetchable = {};

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
class FakeTopic {
    constructor(data = {}) { Object.assign(this, data); }
    async saveKeys() {}
    toObject() { return { ...this }; }
}

const TopicConfigMock = {
    fromObject: async (topic) => new FakeTopic(topic || {}),
};

class TopicHelperMock {
    constructor() {}
    async create(data, keys, opts) {
        calls.topicCreate.push({ type: data.type, keys: { ...keys } });
        return new FakeTopic({ ...data, topicId: `0.0.${++topicSeq}` });
    }
    async twoWayLink({ topic, parent, rationale, userId }) {
        calls.twoWayLink.push({
            topicId: topic.topicId,
            parentTopicId: parent?.topicId,
            rationale,
        });
    }
}

class MessageServerMock {
    constructor() {}
    setTopicObject(topic) { this.topicObject = topic; return this; }
    async sendMessage(message, options) {
        const id = `0x${(++messageSeq).toString(16)}`;
        calls.sendMessage.push({
            id,
            action: message.action,
            type: message.type,
            hash: message.hash,
            toolTopicId: message.toolTopicId,
            document: Buffer.isBuffer(message.document) ? message.document : null,
            options,
            topicObject: this.topicObject,
        });
        return { getId: () => id };
    }
    async getMessage({ messageId }) {
        calls.getMessage.push(messageId);
        const message = fetchable[messageId];
        if (!message) {
            throw new Error(`Message ${messageId} not found`);
        }
        return message;
    }
    async getMessages() { return []; }
}

const DatabaseServerMock = {
    async getTool(query) {
        calls.getTool.push(query);
        if (query.messageId) {
            return db.tools.find((t) => t.messageId === query.messageId) || null;
        }
        if (query.hash !== undefined) {
            return db.tools.find((t) => t.hash === query.hash && t.owner === query.owner) || null;
        }
        if (query.name) {
            return db.tools.find((t) => t.name === query.name) || null;
        }
        return null;
    },
    async getTopicByType(owner, type) {
        calls.getTopicByType.push({ owner, type });
        return db.userTopic;
    },
    async saveTopic(row) {
        calls.saveTopic.push(row);
        db.topics.set(row.topicId, row);
        return row;
    },
    async getTopicById(topicId) {
        calls.getTopicById.push(topicId);
        const row = db.topics.get(topicId);
        return row ? { ...row } : null;
    },
    async updateTopic(row) {
        calls.updateTopic.push(row);
        return row;
    },
    async getSchemas() { return []; },
    async getTools() { return []; },
    async saveFile(uuid, buffer) {
        calls.saveFile.push({ uuid, size: buffer?.length });
        return `file-${++saveFileSeq}`;
    },
    async createTool(tool) {
        calls.createTool.push(tool);
        const row = { ...tool, id: `tool-${++rowSeq}` };
        db.tools.push(row);
        return row;
    },
    async createSchema(schema) { return { ...schema }; },
    async saveSchemas(schemas) { return schemas; },
};

const importTagMock = async (tags, toolId) => {
    calls.importTag.push({ tags, toolId });
};

const SchemaImportExportHelperMock = {
    async importSchemaByFiles(schemas, user, opts, step, userId) {
        calls.importSchemaByFiles.push({
            count: schemas.length,
            category: opts.category,
            topicId: opts.topicId,
            outerSchemas: opts.outerSchemas,
        });
        return { schemasMap: [], errors: [] };
    },
};

// Real zip generation, fake by-message parsing.
class ToolImportExportMock extends RealToolImportExport {
    static async parseZipFile(document) {
        const id = String(document).replace(/^zip:/, '');
        return {
            tool: { name: id, config: { blockType: BlockType.Tool, children: [] } },
            tools: (graph[id] || []).map((m) => ({ name: m, messageId: m })),
            schemas: [],
            tags: [],
        };
    }
}

function makeNotifier() {
    return {
        steps: [],
        addStep(name) {
            const step = makeNotifier();
            step._name = name;
            this.steps.push(step);
            return step;
        },
        start() {}, startStep() {}, completeStep() {}, skipStep() {},
        complete() {}, fail() {}, setEstimate() {},
        getStep(name) {
            return this.steps.find((s) => s._name === name) || makeNotifier();
        },
    };
}

// chai's include/includeMembers use reference equality on objects; this
// matches by deep equality instead.
function deepIncludes(list, expected, message) {
    const found = list.find((item) => {
        try {
            assert.deepEqual(item, expected);
            return true;
        } catch {
            return false;
        }
    });
    assert.exists(found, message || `no entry deep-equal to ${JSON.stringify(expected)}`);
    return found;
}

let mod;
before(async function () {
    this.timeout(120000);
    mod = await esmock(helperPath, {
        '@guardian/common/database-modules/database-server': {
            DatabaseServer: DatabaseServerMock,
        },
        '@guardian/common/import-export/tool': {
            ToolImportExport: ToolImportExportMock,
        },
        '@guardian/hedera/message/message-server': {
            MessageServer: MessageServerMock,
        },
        '@guardian/hedera/topic': {
            TopicConfig: TopicConfigMock,
        },
        '@guardian/hedera/topic-helper': {
            TopicHelper: TopicHelperMock,
        },
        [tagHelperPath]: { importTag: importTagMock },
        [schemaHelperPath]: { SchemaImportExportHelper: SchemaImportExportHelperMock },
    });
});

beforeEach(() => reset());

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const account = { hederaAccountId: '0.0.222', hederaAccountKey: 'key-222', signOptions: {} };
const user = { id: 'u-1', creator: 'did:creator', owner: 'did:owner' };
const userId = 'u-1';

// A v2 embedded entry: the full row plus its own schemas/tags. Identity fields
// are source-network data.
function makeEntry({ name, messageId, hash, config, tools = [], schemas = [], tags = [], version = '1.0.0' }) {
    return {
        name,
        description: `${name} description`,
        messageId,
        hash,
        version,
        previousVersion: '0.0.1',
        creator: 'did:source-creator',
        owner: 'did:source-owner',
        topicId: `0.10.${name.toLowerCase()}`,
        uuid: `source-uuid-${name.toLowerCase()}`,
        status: 'published',
        config,
        tools,
        schemas,
        tags,
    };
}

// A nested ref as it appears inside an entry's tools list: 3 fields, no config.
const ref = (name, messageId, topicId) => ({ name, topicId, messageId });

// A tool block inside a config tree, as findSubTools/replaceAllEntities expect.
const toolBlock = (name, messageId, hash, topicId) => ({
    blockType: BlockType.Tool,
    name,
    messageId,
    hash,
    topicId,
    children: [],
});

const registryOf = (...entries) => {
    const registry = new Map();
    for (const entry of entries) {
        if (entry.config && typeof entry.messageId === 'string' && entry.messageId.trim()) {
            registry.set(entry.messageId.trim(), entry);
        }
    }
    return registry;
};

// Same enrichment the import applies to 3-field refs before the zip: the stubs
// the embedded zip carries come from the registry, so the expected bytes must
// include them.
function enrichedClone(entry, registry) {
    const clone = structuredClone(entry);
    for (const r of clone.tools || []) {
        const embedded = typeof r.messageId === 'string'
            ? registry.get(r.messageId.trim())
            : undefined;
        if (!embedded) continue;
        if (!r.description) r.description = embedded.description;
        if (!r.creator) r.creator = embedded.creator;
        if (!r.hash) r.hash = embedded.hash;
    }
    return clone;
}

// Real zip of the entry as embedded -> the byte digest the import hashes.
async function zipBytesFor(entry, registry) {
    const source = registry ? enrichedClone(entry, registry) : { ...entry };
    const components = {
        tool: source,
        tools: source.tools || [],
        schemas: source.schemas || [],
        tags: source.tags || [],
    };
    const zip = await RealToolImportExport.generateZipFile(components);
    return Buffer.from(await zip.generateAsync({ type: 'arraybuffer' }));
}

const hashOf = (buffer) => Hashing.base58.encode(Hashing.sha256.digest(buffer));

const importEmbedded = (entry, registry) =>
    mod.importToolByEmbedded(account, entry, user, makeNotifier(), userId, new Set(), registry);

// A consensus message as the by-message path would load it from the source
// network.
function publishMessage(messageId) {
    return {
        type: MessageType.Tool,
        action: MessageAction.PublishTool,
        document: `zip:${messageId}`,
        hash: `arch-${messageId}`,
        owner: 'did:source-owner',
        uuid: `uuid-${messageId}`,
        id: messageId,
        topicId: { toString: () => `0.20.${messageId}` },
        name: messageId,
        description: messageId,
        tagsTopicId: null,
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('@unit embedded tool import (self-contained archive entries)', function () {
    this.timeout(20000);

    it('re-publishes the embedded content under a fresh local identity', async () => {
        const sub = makeEntry({
            name: 'Sub', messageId: 'msg-sub', hash: 'hash-sub',
            config: { blockType: BlockType.Tool, children: [] },
            schemas: [{ id: 'schema-1', name: 'SubInput', iri: 'https://ex.io/schemas/sub-input', topicId: '0.10.sub' }],
            tags: [{ id: 'tag-1', name: 'sub-tag', entity: 'Tool', target: 'tool-1' }],
        });
        const entry = makeEntry({
            name: 'Main', messageId: 'msg-main', hash: 'hash-main',
            config: {
                blockType: BlockType.Tool,
                children: [toolBlock('Sub', 'msg-sub', 'hash-sub', '0.10.sub')],
            },
            tools: [ref('Sub', 'msg-sub', '0.10.sub')],
            schemas: [{ id: 'schema-2', name: 'MainInput', iri: 'https://ex.io/schemas/main-input', topicId: '0.10.main' }],
            tags: [{ id: 'tag-2', name: 'main-tag', entity: 'Tool', target: 'tool-2' }],
        });

        const result = await importEmbedded(entry, registryOf(sub, entry));

        // The entry re-published: fresh identity, the content hash, PUBLISHED.
        assert.exists(result.tool);
        assert.equal(result.tool.status, ModuleStatus.PUBLISHED);
        assert.notEqual(result.tool.messageId, 'msg-main');
        assert.equal(result.tool.creator, 'did:creator');
        assert.equal(result.tool.owner, 'did:owner');
        assert.notEqual(result.tool.topicId, '0.10.main');
        assert.match(result.tool.topicId, /^0\.0\.\d+$/, 'a fresh tool topic was created');
        assert.equal(result.errors.length, 0);

        // The identity map carries old -> new for the config substitution.
        const expectedHash = hashOf(await zipBytesFor(entry, registryOf(sub, entry)));
        assert.equal(result.map.oldMessageId, 'msg-main');
        assert.equal(result.map.messageId, result.tool.messageId);
        assert.equal(result.map.oldHash, 'hash-main');
        assert.equal(result.map.newHash, expectedHash);
        assert.equal(result.tool.hash, expectedHash);

        // One consensus publish, carrying exactly the embedded bytes.
        const mainPublish = calls.sendMessage.find((m) => m.toolTopicId === result.tool.topicId);
        assert.exists(mainPublish, 'the tool topic carries the publish');
        assert.equal(mainPublish.action, MessageAction.PublishTool);
        assert.equal(mainPublish.hash, expectedHash);
        assert.equal(Buffer.compare(mainPublish.document, await zipBytesFor(entry, registryOf(sub, entry))), 0,
            'the published document is the embedded content, byte for byte');

        // Tool topic (admin+submit) and tags topic (admin, no submit) created.
        const toolTopics = calls.topicCreate.filter((c) => c.type === TopicType.ToolTopic);
        const tagsTopics = calls.topicCreate.filter((c) => c.type === TopicType.TagsTopic);
        assert.lengthOf(toolTopics, 2, 'main + sub');
        assert.lengthOf(tagsTopics, 2, 'main + sub');
        assert.deepEqual(toolTopics[0].keys, { admin: true, submit: true });
        assert.deepEqual(tagsTopics[0].keys, { admin: true, submit: false });
        // The tool topic linked to the user topic with no rationale: the publish
        // happens after the link, unlike the create flow.
        deepIncludes(calls.twoWayLink, {
            topicId: result.tool.topicId,
            parentTopicId: '0.0.1',
            rationale: null,
        }, 'the tool topic is linked to the user topic');

        // The saved row is linked back to the topic.
        const link = calls.updateTopic.find((r) => r.topicId === result.tool.topicId);
        assert.exists(link);
        assert.equal(link.targetId, result.tool.id.toString());

        // Schema import ran against the NEW topic.
        assert.include(calls.importSchemaByFiles.map((c) => c.topicId), result.tool.topicId);

        // Tags imported for the tool.
        deepIncludes(calls.importTag, { tags: [
            { id: 'tag-2', name: 'main-tag', entity: 'Tool', target: 'tool-2' },
        ], toolId: result.tool.id.toString() }, 'tags imported for the tool row');

        // The config block points at the sub-tool's new identity.
        const subResult = db.tools.find((t) => t.name === 'Sub');
        assert.exists(subResult);
        const block = result.tool.config.children[0];
        assert.equal(block.messageId, subResult.messageId);
        assert.equal(block.hash, subResult.hash);
    });

    it('dedupes on (hash, owner): identical embedded content re-publishes once', async () => {
        const entry = makeEntry({
            name: 'Same', messageId: 'msg-same-1', hash: 'hash-same-1',
            config: { blockType: BlockType.Tool, children: [] },
        });
        // A second archive copy of the same tool: different source identity,
        // identical content (the zip strips the identity fields anyway).
        const twin = structuredClone(entry);
        twin.messageId = 'msg-same-2';
        twin.hash = 'hash-same-2';

        const first = await importEmbedded(entry, registryOf(entry));
        const second = await importEmbedded(twin, registryOf(twin));

        assert.equal(first.tool.messageId, second.tool.messageId,
            'the twin reuses the row the first import published');
        assert.equal(first.tool.hash, second.tool.hash,
            'identical content derives an identical hash');
        assert.equal(calls.topicCreate.length, 2, 'tool + tags topics, created only once');
        assert.equal(calls.sendMessage.length, 1, 'a second consensus publish is avoided');
        assert.equal(calls.createTool.length, 1);
        assert.equal(second.map.messageId, first.tool.messageId);
        assert.equal(second.map.oldMessageId, 'msg-same-2');
    });

    it('resolves 3-field nested refs from the registry without a consensus fetch', async () => {
        const embedded = makeEntry({
            name: 'EmbeddedRef', messageId: 'msg-embedded-ref', hash: 'hash-embedded-ref',
            config: { blockType: BlockType.Tool, children: [] },
        });
        const entry = makeEntry({
            name: 'Parent', messageId: 'msg-parent', hash: 'hash-parent',
            config: {
                blockType: BlockType.Tool,
                children: [
                    toolBlock('EmbeddedRef', 'msg-embedded-ref', 'hash-embedded-ref', '0.10.embeddedref'),
                    toolBlock('Remote', 'msg-remote', 'hash-remote', '0.10.remote'),
                ],
            },
            // One ref the archive embeds, one it does not.
            tools: [
                ref('EmbeddedRef', 'msg-embedded-ref', '0.10.embeddedref'),
                ref('Remote', 'msg-remote', '0.10.remote'),
            ],
        });
        graph['msg-remote'] = [];
        fetchable['msg-remote'] = publishMessage('msg-remote');

        const result = await importEmbedded(entry, registryOf(embedded, entry));

        assert.deepEqual(calls.getMessage, ['msg-remote'],
            'only the ref the archive does not embed needs the source network');
        assert.equal(result.errors.length, 0);

        const embeddedRow = db.tools.find((t) => t.name === 'EmbeddedRef');
        assert.exists(embeddedRow, 'the registry ref re-published locally');
        assert.notEqual(embeddedRow.messageId, 'msg-embedded-ref');

        const remoteRow = db.tools.find((t) => t.messageId === 'msg-remote');
        assert.exists(remoteRow, 'the non-embedded ref imported by message');

        const blocks = result.tool.config.children
            .map((b) => [b.messageId, b.hash]);
        // The embedded ref swapped to its new identity; the by-message tool
        // changed no identity, so its block stays as archived.
        assert.deepEqual(blocks, [
            [embeddedRow.messageId, embeddedRow.hash],
            ['msg-remote', 'hash-remote'],
        ]);
    });

    it('reports, but does not abort on, an unresolvable stub (the readable 500 source)', async () => {
        const entry = makeEntry({
            name: 'Parent', messageId: 'msg-parent', hash: 'hash-parent',
            config: { blockType: BlockType.Tool, children: [] },
            // 3-field ref, not embedded, and no consensus message on this network.
            tools: [ref('Gone', 'msg-gone', '0.10.gone')],
        });

        const result = await importEmbedded(entry, registryOf(entry));

        // The parent still publishes; the stub surfaces as a per-tool error so
        // the import endpoint can fail the request with a readable message.
        assert.exists(result.tool);
        assert.lengthOf(result.errors, 1);
        assert.equal(result.errors[0].type, 'tool');
        assert.equal(result.errors[0].name, 'Gone');
        assert.equal(result.errors[0].messageId, 'msg-gone');
        assert.match(result.errors[0].error, /msg-gone/);
        assert.deepEqual(calls.getMessage, ['msg-gone']);
    });

    it('a diamond re-publishes the shared tool exactly once', async () => {
        const d = makeEntry({
            name: 'D', messageId: 'msg-d', hash: 'hash-d',
            config: { blockType: BlockType.Tool, children: [] },
        });
        const b = makeEntry({
            name: 'B', messageId: 'msg-b', hash: 'hash-b',
            config: { blockType: BlockType.Tool, children: [toolBlock('D', 'msg-d', 'hash-d', '0.10.d')] },
            tools: [ref('D', 'msg-d', '0.10.d')],
        });
        const c = makeEntry({
            name: 'C', messageId: 'msg-c', hash: 'hash-c',
            config: { blockType: BlockType.Tool, children: [toolBlock('D', 'msg-d', 'hash-d', '0.10.d')] },
            tools: [ref('D', 'msg-d', '0.10.d')],
        });
        const a = makeEntry({
            name: 'A', messageId: 'msg-a', hash: 'hash-a',
            config: {
                blockType: BlockType.Tool,
                children: [
                    toolBlock('B', 'msg-b', 'hash-b', '0.10.b'),
                    toolBlock('C', 'msg-c', 'hash-c', '0.10.c'),
                ],
            },
            tools: [ref('B', 'msg-b', '0.10.b'), ref('C', 'msg-c', '0.10.c')],
        });

        const result = await importEmbedded(a, registryOf(a, b, c, d));

        assert.deepEqual(result.errors, [], 'a diamond is not a cycle');

        const dRows = db.tools.filter((t) => t.name === 'D');
        assert.lengthOf(dRows, 1, 'the shared tool publishes once, not once per parent');

        const bRow = db.tools.find((t) => t.name === 'B');
        const cRow = db.tools.find((t) => t.name === 'C');
        for (const row of [bRow, cRow]) {
            const block = row.config.children[0];
            assert.equal(block.messageId, dRows[0].messageId,
                `${row.name}'s config points at the single republished D`);
            assert.equal(block.hash, dRows[0].hash);
        }

        const aBlocks = result.tool.config.children.map((block) => block.messageId);
        assert.include(aBlocks, bRow.messageId);
        assert.include(aBlocks, cRow.messageId);
    });

    it('rejects a self-referencing embedded entry as a cycle', async () => {
        const a = makeEntry({
            name: 'A', messageId: 'msg-a', hash: 'hash-a',
            config: { blockType: BlockType.Tool, children: [toolBlock('A', 'msg-a', 'hash-a', '0.10.a')] },
            tools: [ref('A', 'msg-a', '0.10.a')],
        });

        const result = await importEmbedded(a, registryOf(a));

        assert.exists(result.tool, 'the parent import still completes');
        assert.lengthOf(result.errors, 1);
        assert.match(result.errors[0].error, /Circular tool reference/);
    });

    it('bounds an embedded chain at the depth ceiling instead of looping', async () => {
        const entries = [];
        for (let i = 0; i < 60; i++) {
            entries.push(makeEntry({
                name: `T${i}`,
                messageId: `msg-t${i}`,
                hash: `hash-t${i}`,
                config: { blockType: BlockType.Tool, children: [] },
                tools: i < 59 ? [ref(`T${i + 1}`, `msg-t${i + 1}`, `0.10.t${i + 1}`)] : [],
            }));
        }
        const result = await importEmbedded(entries[0], registryOf(...entries));

        assert.isAbove(result.errors.length, 0);
        assert.match(result.errors[0].error, /nested deeper than/);
        // The ceiling bounded the walk; not every level re-published.
        assert.isBelow(calls.sendMessage.length, 60);
    });

    it('derives a stable content hash: equal bytes, equal hash', async () => {
        // Two independently built entries with equal content.
        const build = (messageId, hash) => makeEntry({
            name: 'Stable', messageId, hash,
            config: {
                blockType: BlockType.Tool,
                children: [toolBlock('Inner', 'msg-inner', 'hash-inner', '0.10.inner')],
            },
            tools: [ref('Inner', 'msg-inner', '0.10.inner')],
            schemas: [{ id: 'schema-9', name: 'StableInput', iri: 'https://ex.io/schemas/stable-input', topicId: '0.10.stable' }],
            tags: [{ id: 'tag-9', name: 'stable-tag', entity: 'Tool', target: 'tool-9' }],
        });
        const inner = makeEntry({
            name: 'Inner', messageId: 'msg-inner', hash: 'hash-inner',
            config: { blockType: BlockType.Tool, children: [] },
        });
        const e1 = build('msg-1', 'hash-1');
        const e2 = build('msg-2', 'hash-2');

        const r1 = await importEmbedded(e1, registryOf(inner, e1));
        const r2 = await importEmbedded(e2, registryOf(inner, e2));

        // The embedded content differs only in identity fields the zip strips...
        assert.notEqual(r1.tool.hash, 'hash-1');
        assert.equal(r1.tool.hash, r2.tool.hash,
            'identity fields are stripped from the zip, so the content hash matches');

        // ...and the hash is exactly the digest of the embedded zip bytes.
        assert.equal(r1.tool.hash, hashOf(await zipBytesFor(e1, registryOf(inner, e1))));

        // Inner is embedded in both: deduped on (hash, owner).
        assert.equal(r1.map.messageId, r2.map.messageId, 'the shared inner tool publishes once');
    });

    it('a legacy 5-field stub not embedded in the archive still imports by message', async () => {
        const stub = { name: 'Legacy', description: 'legacy tool', messageId: 'msg-legacy', owner: 'did:source-owner', hash: 'hash-legacy' };
        graph['msg-legacy'] = [];
        fetchable['msg-legacy'] = publishMessage('msg-legacy');

        const results = await mod.importSubTools(
            account, [stub], user, makeNotifier(), userId, new Set(), new Map()
        );

        assert.deepEqual(calls.getMessage, ['msg-legacy']);
        assert.equal(results.tools.length, 1);
        assert.equal(results.tools[0].messageId, 'msg-legacy', 'by-message keeps the source messageId');
        assert.equal(results.errors.length, 0);
        assert.equal(calls.topicCreate.length, 0, 'the by-message path creates no topics');
    });
});
