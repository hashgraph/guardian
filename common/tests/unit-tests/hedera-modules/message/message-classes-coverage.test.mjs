import { assert } from 'chai';

import { SchemaMessage } from '../../../../dist/hedera-modules/message/schema-message.js';
import { SynchronizationMessage } from '../../../../dist/hedera-modules/message/synchronization-message.js';
import { ToolMessage } from '../../../../dist/hedera-modules/message/tool-message.js';
import { ModuleMessage } from '../../../../dist/hedera-modules/message/module-message.js';
import { FormulaMessage } from '../../../../dist/hedera-modules/message/formula-message.js';
import { MessageType } from '../../../../dist/hedera-modules/message/message-type.js';
import { MessageAction } from '../../../../dist/hedera-modules/message/message-action.js';
import { UrlType } from '../../../../dist/hedera-modules/message/url.interface.js';

describe('SchemaMessage coverage', function () {
    it('setRelationships keeps only relationships with a messageId', function () {
        const m = new SchemaMessage(MessageAction.CreateSchema);
        m.setRelationships([{ messageId: 'a' }, { messageId: null }, {}, { messageId: 'b' }]);
        assert.deepEqual(m.relationships, ['a', 'b']);
    });

    it('toDocuments serializes documents for PublishSchema action', async function () {
        const m = new SchemaMessage(MessageAction.PublishSchema);
        m.setDocument({ document: { a: 1 }, context: { b: 2 } });
        const docs = await m.toDocuments();
        assert.lengthOf(docs, 2);
        assert.deepEqual(JSON.parse(docs[0].toString()), { a: 1 });
        assert.deepEqual(JSON.parse(docs[1].toString()), { b: 2 });
    });

    it('toDocuments serializes documents for PublishSystemSchema action', async function () {
        const m = new SchemaMessage(MessageAction.PublishSystemSchema);
        m.setDocument({ document: { a: 1 }, context: { b: 2 } });
        const docs = await m.toDocuments();
        assert.lengthOf(docs, 2);
    });

    it('toDocuments returns [] for non-publish actions', async function () {
        const m = new SchemaMessage(MessageAction.CreateSchema);
        m.setDocument({ document: { a: 1 }, context: { b: 2 } });
        assert.deepEqual(await m.toDocuments(), []);
    });

    it('toJson / fromJson round-trip schema fields', function () {
        const src = new SchemaMessage(MessageAction.CreateSchema);
        src.setDocument({
            name: 'n', description: 'd', entity: 'e', owner: 'o',
            uuid: 'u', version: '1', codeVersion: '2',
            document: { x: 1 }, context: { y: 2 }
        });
        src.relationships = ['r1'];
        const json = src.toJson();
        assert.equal(json.name, 'n');
        assert.equal(json.codeVersion, '2');
        assert.deepEqual(json.document, { x: 1 });
        assert.deepEqual(json.context, { y: 2 });

        const back = SchemaMessage.fromJson(json);
        assert.equal(back.name, 'n');
        assert.equal(back.entity, 'e');
        assert.equal(back.codeVersion, '2');
        assert.deepEqual(back.documents, [{ x: 1 }, { y: 2 }]);
    });

    it('fromJson throws on empty json', function () {
        assert.throws(() => SchemaMessage.fromJson(null), /JSON Object is empty/);
    });

    it('getOwner returns owner', function () {
        const m = new SchemaMessage(MessageAction.CreateSchema);
        m.setDocument({ owner: 'did:owner' });
        assert.equal(m.getOwner(), 'did:owner');
    });

    it('getContextUrl reads the second url slot', function () {
        const m = SchemaMessage.fromMessageObject({
            type: MessageType.Schema,
            action: MessageAction.CreateSchema,
            document_cid: 'dc', document_uri: 'du',
            context_cid: 'cc', context_uri: 'cu'
        });
        assert.equal(m.getContextUrl(UrlType.cid), 'cc');
        assert.equal(m.getContextUrl(UrlType.url), 'cu');
    });
});

describe('SynchronizationMessage coverage', function () {
    const multiPolicy = {
        user: 'did:user',
        instanceTopicId: '0.0.1',
        type: 'Main',
        policyOwner: 'did:owner'
    };

    it('setDocument copies policy fields and mint data', function () {
        const m = new SynchronizationMessage(MessageAction.Mint);
        m.setDocument(multiPolicy, {
            messageId: 'mid', tokenId: '0.0.99', amount: 5, memo: 'memo', target: '0.0.7'
        });
        assert.equal(m.user, 'did:user');
        assert.equal(m.policy, '0.0.1');
        assert.equal(m.policyOwner, 'did:owner');
        assert.equal(m.messageId, 'mid');
        assert.equal(m.amount, 5);
    });

    it('setDocument without data leaves mint fields undefined', function () {
        const m = new SynchronizationMessage(MessageAction.CreateMultiPolicy);
        m.setDocument(multiPolicy);
        assert.equal(m.user, 'did:user');
        assert.isUndefined(m.messageId);
    });

    it('toMessageObject for CreateMultiPolicy excludes mint fields', function () {
        const m = new SynchronizationMessage(MessageAction.CreateMultiPolicy);
        m.setDocument(multiPolicy);
        const obj = m.toMessageObject();
        assert.equal(obj.user, 'did:user');
        assert.isUndefined(obj.tokenId);
    });

    it('toMessageObject for Mint includes mint fields', function () {
        const m = new SynchronizationMessage(MessageAction.Mint);
        m.setDocument(multiPolicy, { messageId: 'mid', tokenId: '0.0.99', amount: 5, memo: 'memo', target: '0.0.7' });
        const obj = m.toMessageObject();
        assert.equal(obj.tokenId, '0.0.99');
        assert.equal(obj.amount, 5);
    });

    it('toDocuments and loadDocuments are no-ops', async function () {
        const m = new SynchronizationMessage(MessageAction.Mint);
        assert.deepEqual(await m.toDocuments(), []);
        assert.strictEqual(m.loadDocuments(['x']), m);
        assert.deepEqual(m.getUrls(), []);
    });

    it('fromMessage parses string and rejects non-sync type', function () {
        const valid = {
            type: MessageType.Synchronization, action: MessageAction.Mint,
            user: 'u', policy: 'p', policyOwner: 'po'
        };
        const m = SynchronizationMessage.fromMessage(JSON.stringify(valid));
        assert.equal(m.user, 'u');
        assert.throws(() => SynchronizationMessage.fromMessage(''), /Message Object is empty/);
        assert.throws(() => SynchronizationMessage.fromMessageObject({ type: 'X' }), /Invalid message type/);
        assert.throws(() => SynchronizationMessage.fromMessageObject(null), /JSON Object is empty/);
    });

    it('toJson / fromJson round-trip', function () {
        const src = new SynchronizationMessage(MessageAction.Mint);
        src.setDocument(multiPolicy, { messageId: 'mid', tokenId: '0.0.99', amount: 5, memo: 'memo', target: '0.0.7' });
        const json = src.toJson();
        assert.equal(json.user, 'did:user');
        assert.equal(json.tokenId, '0.0.99');
        const back = SynchronizationMessage.fromJson(json);
        assert.equal(back.user, 'did:user');
        assert.equal(back.policyOwner, 'did:owner');
        assert.throws(() => SynchronizationMessage.fromJson(null), /JSON Object is empty/);
    });

    it('getOwner returns policyOwner', function () {
        const m = new SynchronizationMessage(MessageAction.Mint);
        m.setDocument(multiPolicy);
        assert.equal(m.getOwner(), 'did:owner');
    });
});

describe('ToolMessage coverage', function () {
    const model = {
        uuid: 'u', name: 'tool', description: 'd', owner: 'did:o', hash: 'h',
        topicId: '0.0.10', tagsTopicId: '0.0.11', version: '1.0.0'
    };

    it('setDocument / getDocument round-trip with zip buffer', function () {
        const m = new ToolMessage(MessageType.Tool, MessageAction.CreateVC);
        m.setDocument(model, Buffer.from('zip'));
        assert.equal(m.uuid, 'u');
        assert.equal(m.toolTopicId, '0.0.10');
        assert.equal(m.getDocument().toString(), 'zip');
    });

    it('toDocuments returns the document buffer when present', async function () {
        const m = new ToolMessage(MessageType.Tool, MessageAction.CreateVC);
        m.setDocument(model, Buffer.from('zip'));
        const docs = await m.toDocuments();
        assert.lengthOf(docs, 1);
        assert.equal(docs[0].toString(), 'zip');
    });

    it('loadDocuments loads a single buffer', function () {
        const m = new ToolMessage(MessageType.Tool, MessageAction.CreateVC);
        m.loadDocuments([Buffer.from('abc')]);
        assert.equal(m.document.toString(), 'abc');
    });

    it('fromMessage with cid builds an ipfs url and getUrl/getDocumentUrl', function () {
        const m = ToolMessage.fromMessage(JSON.stringify({
            type: MessageType.Tool, action: MessageAction.CreateVC, ...model, cid: 'CID1'
        }));
        assert.equal(m.getUrl().cid, 'CID1');
        assert.equal(m.getDocumentUrl(UrlType.cid), 'CID1');
        assert.isTrue(m.getDocumentUrl(UrlType.url).endsWith('CID1'));
        assert.throws(() => ToolMessage.fromMessage(''), /Message Object is empty/);
    });

    it('fromMessageObject without cid yields no urls', function () {
        const m = ToolMessage.fromMessageObject({ type: MessageType.Tool, action: MessageAction.CreateVC, ...model });
        assert.isUndefined(m.getUrl());
    });

    it('toMessageObject and toJson / fromJson round-trip', function () {
        const src = new ToolMessage(MessageType.Tool, MessageAction.CreateVC);
        src.setDocument(model, Buffer.from('zip'));
        const obj = src.toMessageObject();
        assert.equal(obj.uuid, 'u');
        assert.equal(obj.topicId, '0.0.10');
        const json = src.toJson();
        assert.equal(json.name, 'tool');
        const back = ToolMessage.fromJson({ ...json, type: MessageType.Tool, action: MessageAction.CreateVC });
        assert.equal(back.name, 'tool');
        assert.equal(back.toolTopicId, '0.0.10');
        assert.throws(() => ToolMessage.fromJson(null), /JSON Object is empty/);
    });

    it('validate true and getOwner', function () {
        const m = new ToolMessage(MessageType.Tool, MessageAction.CreateVC);
        m.setDocument(model);
        assert.isTrue(m.validate());
        assert.equal(m.getOwner(), 'did:o');
    });
});

describe('ModuleMessage coverage', function () {
    const model = { uuid: 'u', name: 'mod', description: 'd', owner: 'did:o', topicId: '0.0.20' };

    it('setDocument / getDocument with zip', function () {
        const m = new ModuleMessage(MessageType.Module, MessageAction.CreateVC);
        m.setDocument(model, Buffer.from('z'));
        assert.equal(m.moduleTopicId, '0.0.20');
        assert.equal(m.getDocument().toString(), 'z');
    });

    it('toDocuments returns buffer when present', async function () {
        const m = new ModuleMessage(MessageType.Module, MessageAction.CreateVC);
        m.setDocument(model, Buffer.from('z'));
        assert.lengthOf(await m.toDocuments(), 1);
    });

    it('loadDocuments loads single buffer', function () {
        const m = new ModuleMessage(MessageType.Module, MessageAction.CreateVC);
        m.loadDocuments([Buffer.from('y')]);
        assert.equal(m.document.toString(), 'y');
    });

    it('fromMessage with cid builds urls', function () {
        const m = ModuleMessage.fromMessage(JSON.stringify({
            type: MessageType.Module, action: MessageAction.CreateVC, ...model, cid: 'CID2'
        }));
        assert.equal(m.getUrl().cid, 'CID2');
        assert.equal(m.getDocumentUrl(UrlType.cid), 'CID2');
        assert.throws(() => ModuleMessage.fromMessage(''), /Message Object is empty/);
    });

    it('toMessageObject / toJson / fromJson round-trip and validate / getOwner', function () {
        const src = new ModuleMessage(MessageType.Module, MessageAction.CreateVC);
        src.setDocument(model, Buffer.from('z'));
        const obj = src.toMessageObject();
        assert.equal(obj.topicId, '0.0.20');
        const json = src.toJson();
        const back = ModuleMessage.fromJson({ ...json, type: MessageType.Module, action: MessageAction.CreateVC });
        assert.equal(back.moduleTopicId, '0.0.20');
        assert.isTrue(src.validate());
        assert.equal(src.getOwner(), 'did:o');
        assert.throws(() => ModuleMessage.fromJson(null), /JSON Object is empty/);
    });
});

describe('FormulaMessage coverage', function () {
    const item = {
        name: 'f', description: 'd', owner: 'did:o', uuid: 'u',
        policyTopicId: '0.0.30', policyInstanceTopicId: '0.0.31', autoGenerated: 1
    };

    it('setDocument / getDocument with zip and coerces autoGenerated to boolean', function () {
        const m = new FormulaMessage(MessageAction.CreateVC);
        m.setDocument(item, Buffer.from('cfg'));
        assert.strictEqual(m.autoGenerated, true);
        assert.equal(m.getDocument().toString(), 'cfg');
    });

    it('toDocuments returns config when present, else empty', async function () {
        const m = new FormulaMessage(MessageAction.CreateVC);
        assert.deepEqual(await m.toDocuments(), []);
        m.setDocument(item, Buffer.from('cfg'));
        assert.lengthOf(await m.toDocuments(), 1);
    });

    it('loadDocuments loads single buffer', function () {
        const m = new FormulaMessage(MessageAction.CreateVC);
        m.loadDocuments([Buffer.from('c')]);
        assert.equal(m.config.toString(), 'c');
    });

    it('fromMessage parses and builds url; getUrl / getDocumentUrl / getContextUrl', function () {
        const m = FormulaMessage.fromMessage(JSON.stringify({
            type: MessageType.Formula, action: MessageAction.CreateVC, ...item, cid: 'CID3'
        }));
        assert.equal(m.getUrl()[0].cid, 'CID3');
        assert.equal(m.getDocumentUrl(UrlType.cid), 'CID3');
        assert.isUndefined(m.getContextUrl(UrlType.cid));
        assert.throws(() => FormulaMessage.fromMessage(''), /Message Object is empty/);
    });

    it('toMessageObject exposes formula fields', function () {
        const m = new FormulaMessage(MessageAction.CreateVC);
        m.setDocument(item, Buffer.from('cfg'));
        const obj = m.toMessageObject();
        assert.equal(obj.policyTopicId, '0.0.30');
        assert.equal(obj.autoGenerated, true);
    });

    it('toJson returns undefined (pinned bug: missing return)', function () {
        const m = new FormulaMessage(MessageAction.CreateVC);
        m.setDocument(item, Buffer.from('cfg'));
        assert.isUndefined(m.toJson());
    });

    it('fromJson round-trips and validate / getOwner', function () {
        const back = FormulaMessage.fromJson({
            type: MessageType.Formula, action: MessageAction.CreateVC,
            name: 'f', description: 'd', owner: 'did:o', uuid: 'u',
            policyTopicId: '0.0.30', policyInstanceTopicId: '0.0.31', autoGenerated: true,
            config: Buffer.from('cfg')
        });
        assert.equal(back.policyInstanceTopicId, '0.0.31');
        assert.isTrue(back.validate());
        assert.equal(back.getOwner(), 'did:o');
        assert.throws(() => FormulaMessage.fromJson(null), /JSON Object is empty/);
    });
});
