import { assert } from 'chai';
import { PolicyMessage } from '../../../../dist/hedera-modules/message/policy-message.js';
import { VCMessage } from '../../../../dist/hedera-modules/message/vc-message.js';
import { VPMessage } from '../../../../dist/hedera-modules/message/vp-message.js';
import { TagMessage } from '../../../../dist/hedera-modules/message/tag-message.js';
import { ToolMessage } from '../../../../dist/hedera-modules/message/tool-message.js';
import { ModuleMessage } from '../../../../dist/hedera-modules/message/module-message.js';
import { SynchronizationMessage } from '../../../../dist/hedera-modules/message/synchronization-message.js';
import { FormulaMessage } from '../../../../dist/hedera-modules/message/formula-message.js';
import { MessageType } from '../../../../dist/hedera-modules/message/message-type.js';
import { MessageAction } from '../../../../dist/hedera-modules/message/message-action.js';

describe('@unit PolicyMessage serializer', () => {
    const policyModel = {
        uuid: 'u1', name: 'Name', description: 'Desc', topicDescription: 'TD',
        version: '1.0.0', policyTag: 'Tag', owner: 'did:owner', topicId: '0.0.1',
        instanceTopicId: '0.0.2', synchronizationTopicId: '0.0.3', availability: 'public',
        restoreTopicId: '0.0.4', actionsTopicId: '0.0.5', recordsTopicId: '0.0.6',
        commentsTopicId: '0.0.7', originalHash: 'oh', originalMessageId: 'omid',
    };

    it('constructs with type/action and raw response', () => {
        const m = new PolicyMessage(MessageType.Policy, MessageAction.PublishPolicy);
        assert.equal(m.type, MessageType.Policy);
        assert.equal(m.action, MessageAction.PublishPolicy);
    });

    it('setDocument/getDocument round-trips the zip buffer', () => {
        const m = new PolicyMessage(MessageType.Policy, MessageAction.PublishPolicy);
        m.setDocument(policyModel, Buffer.from('zip'));
        assert.equal(m.uuid, 'u1');
        assert.ok(Buffer.isBuffer(m.getDocument()));
    });

    it('toMessageObject truncates oversized text fields via limit/cut', () => {
        const m = new PolicyMessage(MessageType.Policy, MessageAction.PublishPolicy);
        const big = 'x'.repeat(2000);
        m.setDocument({ ...policyModel, description: big, topicDescription: big, name: big, policyTag: big }, Buffer.from('zip'));
        const obj = m.toMessageObject();
        assert.isAtMost(JSON.stringify(obj).length, 1100);
    });

    it('toMessageObject adds effectiveDate for discontinue action', () => {
        const m = new PolicyMessage(MessageType.Policy, MessageAction.DiscontinuePolicy);
        m.setDocument({ ...policyModel, discontinuedDate: new Date('2024-01-01') }, Buffer.from('z'));
        const obj = m.toMessageObject();
        assert.equal(obj.effectiveDate, new Date('2024-01-01').toISOString());
    });

    it('toDocuments returns the buffer only for PublishPolicy', async () => {
        const pub = new PolicyMessage(MessageType.Policy, MessageAction.PublishPolicy);
        pub.setDocument(policyModel, Buffer.from('zip'));
        assert.equal((await pub.toDocuments()).length, 1);
        const other = new PolicyMessage(MessageType.Policy, MessageAction.DiscontinuePolicy);
        other.setDocument(policyModel, Buffer.from('zip'));
        assert.deepEqual(await other.toDocuments(), []);
    });

    it('toDocuments returns empty for PublishPolicy with no document', async () => {
        const m = new PolicyMessage(MessageType.Policy, MessageAction.PublishPolicy);
        assert.deepEqual(await m.toDocuments(), []);
    });

    it('loadDocuments sets the document buffer', () => {
        const m = new PolicyMessage(MessageType.Policy, MessageAction.PublishPolicy);
        m.loadDocuments(['raw']);
        assert.ok(Buffer.isBuffer(m.document));
        m.loadDocuments([]);
    });

    it('fromMessage throws on empty input', () => {
        assert.throws(() => PolicyMessage.fromMessage(''), /Message Object is empty/);
    });

    it('fromMessageObject throws on null and invalid type', () => {
        assert.throws(() => PolicyMessage.fromMessageObject(null), /JSON Object is empty/);
        assert.throws(() => PolicyMessage.fromMessageObject({ type: 'other', action: MessageAction.PublishPolicy }), /Invalid message type/);
    });

    it('round-trips through toMessageObject/fromMessageObject with cid url', () => {
        const m = new PolicyMessage(MessageType.Policy, MessageAction.PublishPolicy);
        m.setDocument(policyModel, Buffer.from('z'));
        const obj = { ...m.toMessageObject(), id: 'mid', status: 'ISSUE', cid: 'QmCid' };
        const restored = PolicyMessage.fromMessageObject(obj);
        assert.equal(restored.uuid, 'u1');
        assert.equal(restored.getOwner(), 'did:owner');
        assert.ok(restored.getUrl());
    });

    it('fromMessageObject without cid sets empty urls', () => {
        const m = new PolicyMessage(MessageType.Policy, MessageAction.PublishPolicy);
        m.setDocument(policyModel, Buffer.from('z'));
        const obj = { ...m.toMessageObject(), cid: undefined };
        const restored = PolicyMessage.fromMessageObject(obj);
        assert.isUndefined(restored.getUrl());
    });

    it('fromMessageObject parses discontinue effectiveDate', () => {
        const obj = { type: MessageType.Policy, action: MessageAction.DiscontinuePolicy, effectiveDate: '2024-01-01T00:00:00.000Z' };
        const restored = PolicyMessage.fromMessageObject(obj);
        assert.instanceOf(restored.discontinuedDate, Date);
    });

    it('validate returns true and toJson/fromJson round-trip', () => {
        const m = new PolicyMessage(MessageType.Policy, MessageAction.PublishPolicy);
        m.setDocument(policyModel, Buffer.from('z'));
        assert.isTrue(m.validate());
        const restored = PolicyMessage.fromJson(m.toJson());
        assert.equal(restored.uuid, 'u1');
    });

    it('fromJson throws on empty', () => {
        assert.throws(() => PolicyMessage.fromJson(null), /JSON Object is empty/);
    });
});

describe('@unit VCMessage serializer', () => {
    const body = () => ({
        id: 'mid', status: 'ISSUE', type: MessageType.VCDocument, action: MessageAction.CreateVC,
        lang: 'en', account: '0.0.1', issuer: 'did:issuer', initId: 'init',
        relationships: ['r1'], encodedData: false, documentStatus: 'NEW',
        guardianVersion: '3', tag: 't', startMessage: 'sm', entityType: 'e',
        option: { o: 1 }, tags: [], cid: 'QmCid',
    });

    it('setters mutate relationships/user/tag/entity/option/ref/init', () => {
        const m = new VCMessage(MessageAction.CreateVC);
        m.setDocumentStatus('OK');
        m.setUser('u1');
        m.setRelationships(['r0']);
        assert.include(m.getRelationships(), 'u1');
        m.setTag({ tag: 'tg' });
        assert.equal(m.tag, 'tg');
        m.setEntityType({ options: { entityType: 'ET' } });
        assert.equal(m.entityType, 'ET');
        m.setOption({ option: { a: 1 } });
        assert.deepEqual(m.option, { a: 1 });
        m.setOption({}, { options: { options: [{ name: 'n', value: 'v' }] } });
        assert.equal(m.option.n, 'v');
        m.setRef('startmsg');
        assert.equal(m.startMessage, 'startmsg');
        m.setInitId('iid');
        m.setInit('iid2');
        assert.equal(m.initId, 'iid2');
    });

    it('setUser with no prior relationships seeds the array', () => {
        const m = new VCMessage(MessageAction.CreateVC);
        m.setUser('only');
        assert.deepEqual(m.relationships, ['only']);
    });

    it('toDocuments/loadDocuments round-trip unencoded', async () => {
        const m = VCMessage.fromMessageObject(body());
        m.document = { foo: 'bar' };
        const docs = await m.toDocuments();
        const out = await m.loadDocuments([docs[0].toString()]);
        assert.deepEqual(out.document, { foo: 'bar' });
    });

    it('toDocuments encrypts and loadDocuments decrypts when encoded', async () => {
        const m = VCMessage.fromMessageObject({ ...body(), encodedData: true });
        m.document = { secret: 1 };
        const docs = await m.toDocuments('passphrase');
        const out = await m.loadDocuments([docs[0].toString()], 'passphrase');
        assert.equal(out.document, JSON.stringify({ secret: 1 }));
    });

    it('toDocuments throws when encoded but no key', async () => {
        const m = VCMessage.fromMessageObject({ ...body(), encodedData: true });
        m.document = { secret: 1 };
        let threw = false;
        try { await m.toDocuments(''); } catch (e) { threw = /private key/.test(e.message); }
        assert.isTrue(threw);
    });

    it('fromMessage/validate/getUrl/toHash/toJson/fromJson/getOwner', () => {
        const m = VCMessage.fromMessage(JSON.stringify(body()));
        assert.isTrue(m.validate());
        assert.ok(m.getUrl());
        assert.isString(m.toHash());
        assert.equal(m.getOwner(), 'did:issuer');
        const restored = VCMessage.fromJson(m.toJson());
        assert.equal(restored.issuer, 'did:issuer');
    });

    it('fromMessage/fromMessageObject/fromJson empty guards', () => {
        assert.throws(() => VCMessage.fromMessage(''), /Message Object is empty/);
        assert.throws(() => VCMessage.fromMessageObject(null), /JSON Object is empty/);
        assert.throws(() => VCMessage.fromJson(null), /JSON Object is empty/);
    });

    it('fromMessageObject marks encodedData when body type is EVCDocument', () => {
        const m = VCMessage.fromMessageObject({ ...body(), type: MessageType.EVCDocument });
        assert.isTrue(m.encodedData);
        const obj = m.toMessageObject();
        assert.equal(obj.issuer, 'did:issuer');
    });
});

describe('@unit VPMessage serializer', () => {
    const body = () => ({
        id: 'mid', status: 'ISSUE', type: MessageType.VPDocument, action: MessageAction.CreateVP,
        lang: 'en', account: '0.0.1', issuer: 'did:issuer', relationships: ['r1'],
        tag: 't', entityType: 'e', option: { o: 1 }, tags: [], cid: 'QmCid',
    });

    it('setters and round-trip', async () => {
        const m = new VPMessage(MessageAction.CreateVP);
        m.setUser('u1');
        m.setRelationships(['r0']);
        assert.include(m.getRelationships(), 'u1');
        m.setTag({ tag: 'x' });
        m.setEntityType({ options: { entityType: 'ET' } });
        m.setOption({ option: { a: 1 } });
        m.setOption({}, { options: { options: [{ name: 'n', value: 'v' }] } });
        m.document = { d: 1 };
        const docs = await m.toDocuments();
        const out = m.loadDocuments([docs[0].toString()]);
        assert.deepEqual(out.getDocument(), { d: 1 });
    });

    it('static from(ITopicMessage) populates id/index/topic/payer', () => {
        const data = {
            message: JSON.stringify(body()), owner: 'payer',
            sequenceNumber: 5, consensusTimestamp: 'ts', topicId: '0.0.9',
        };
        const m = VPMessage.from(data);
        assert.equal(m.issuer, 'did:issuer');
    });

    it('from throws on empty data/message', () => {
        assert.throws(() => VPMessage.from(null), /Message Object is empty/);
        assert.throws(() => VPMessage.from({ message: '' }), /Message Object is empty/);
    });

    it('fromMessage/validate/getUrl/toHash/toJson/fromJson/getOwner', () => {
        const m = VPMessage.fromMessage(JSON.stringify(body()));
        assert.isTrue(m.validate());
        assert.ok(m.getUrl());
        assert.isString(m.toHash());
        assert.equal(m.getOwner(), 'did:issuer');
        const obj = m.toMessageObject();
        assert.equal(obj.issuer, 'did:issuer');
        const restored = VPMessage.fromJson(m.toJson());
        assert.equal(restored.issuer, 'did:issuer');
    });

    it('empty guards', () => {
        assert.throws(() => VPMessage.fromMessage(''), /Message Object is empty/);
        assert.throws(() => VPMessage.fromMessageObject(null), /JSON Object is empty/);
        assert.throws(() => VPMessage.fromJson(null), /JSON Object is empty/);
    });
});

describe('@unit TagMessage serializer', () => {
    const tag = {
        uuid: 'u', name: 'n', description: 'd', owner: 'o', target: 't',
        operation: 'Create', entity: 'e', date: '2024', document: { a: 1 },
        linkedItems: ['l'], inheritTags: true,
    };

    it('setDocument/toDocuments/loadDocuments round-trip', async () => {
        const m = new TagMessage(MessageAction.CreateMultiPolicy);
        m.setDocument(tag);
        const docs = await m.toDocuments();
        const out = m.loadDocuments([docs[0].toString()]);
        assert.deepEqual(out.getDocument(), { a: 1 });
    });

    it('toDocuments empty and loadDocuments empty branch', async () => {
        const m = new TagMessage(MessageAction.CreateMultiPolicy);
        assert.deepEqual(await m.toDocuments(), []);
        assert.equal(m.loadDocuments([]), m);
    });

    it('toMessageObject/getUrls/validate/toJson/fromJson/getOwner', () => {
        const m = new TagMessage(MessageAction.CreateMultiPolicy);
        m.setDocument(tag);
        assert.deepEqual(m.getUrls(), []);
        assert.isTrue(m.validate());
        const obj = m.toMessageObject();
        assert.equal(obj.uuid, 'u');
        const restored = TagMessage.fromJson(m.toJson());
        assert.equal(restored.owner, 'o');
        assert.equal(m.getOwner(), 'o');
    });

    it('fromMessage round-trip and guards', () => {
        const m = new TagMessage(MessageAction.CreateMultiPolicy);
        m.setDocument(tag);
        const obj = { ...m.toMessageObject(), id: 'i', status: 's' };
        const restored = TagMessage.fromMessageObject(obj);
        assert.equal(restored.name, 'n');
        assert.throws(() => TagMessage.fromMessage(''), /Message Object is empty/);
        assert.throws(() => TagMessage.fromMessageObject(null), /JSON Object is empty/);
        assert.throws(() => TagMessage.fromMessageObject({ type: 'x' }), /Invalid message type/);
        assert.throws(() => TagMessage.fromJson(null), /JSON Object is empty/);
    });
});

describe('@unit ToolMessage serializer', () => {
    const model = { uuid: 'u', name: 'n', description: 'd', owner: 'o', hash: 'h', topicId: '0.0.1', tagsTopicId: '0.0.2', version: '1' };

    it('setDocument/toDocuments/fromMessageObject round-trip', async () => {
        const m = new ToolMessage(MessageType.Tool, MessageAction.PublishTool);
        m.setDocument(model, Buffer.from('zip'));
        assert.equal(m.uuid, 'u');
        const docs = await m.toDocuments();
        assert.isArray(docs);
        const restored = ToolMessage.fromMessageObject({ ...m.toMessageObject(), id: 'i', status: 's' });
        assert.equal(restored.getOwner(), 'o');
    });

    it('guards', () => {
        assert.throws(() => ToolMessage.fromMessage(''), /Message Object is empty/);
        assert.throws(() => ToolMessage.fromMessageObject(null), /JSON Object is empty/);
        assert.throws(() => ToolMessage.fromMessageObject({ type: 'x' }), /Invalid message type/);
    });
});

describe('@unit ModuleMessage serializer', () => {
    const model = { uuid: 'u', name: 'n', description: 'd', owner: 'o', topicId: '0.0.1' };

    it('setDocument/toDocuments/fromMessageObject round-trip', async () => {
        const m = new ModuleMessage(MessageType.Module, MessageAction.PublishModule);
        m.setDocument(model, Buffer.from('zip'));
        assert.equal(m.uuid, 'u');
        await m.toDocuments();
        const restored = ModuleMessage.fromMessageObject({ ...m.toMessageObject(), id: 'i', status: 's' });
        assert.equal(restored.getOwner(), 'o');
    });

    it('guards', () => {
        assert.throws(() => ModuleMessage.fromMessage(''), /Message Object is empty/);
        assert.throws(() => ModuleMessage.fromMessageObject(null), /JSON Object is empty/);
        assert.throws(() => ModuleMessage.fromMessageObject({ type: 'x' }), /Invalid message type/);
    });
});

describe('@unit SynchronizationMessage serializer', () => {
    const policy = { user: 'usr', instanceTopicId: '0.0.1', type: 'Main', policyOwner: 'own' };

    it('setDocument with and without extra data', () => {
        const m = new SynchronizationMessage(MessageAction.CreateMultiPolicy);
        m.setDocument(policy, { messageId: 'mid', tokenId: 'tk', amount: 1, memo: 'm', target: 't' });
        assert.equal(m.policy, '0.0.1');
        const m2 = new SynchronizationMessage(MessageAction.CreateMultiPolicy);
        m2.setDocument(policy);
        assert.equal(m2.policyOwner, 'own');
    });

    it('toDocuments/getUrls/fromMessageObject round-trip and guards', async () => {
        const m = new SynchronizationMessage(MessageAction.CreateMultiPolicy);
        m.setDocument(policy);
        assert.deepEqual(m.getUrls(), []);
        await m.toDocuments();
        const restored = SynchronizationMessage.fromMessageObject({ ...m.toMessageObject(), id: 'i', status: 's' });
        assert.equal(restored.policy, '0.0.1');
        assert.throws(() => SynchronizationMessage.fromMessageObject(null), /JSON Object is empty/);
        assert.throws(() => SynchronizationMessage.fromMessageObject({ type: 'x' }), /Invalid message type/);
    });
});

describe('@unit FormulaMessage serializer', () => {
    const item = { name: 'n', description: 'd', owner: 'o', uuid: 'u', policyTopicId: '0.0.1', policyInstanceTopicId: '0.0.2', autoGenerated: true };

    it('setDocument/toDocuments/fromMessageObject round-trip and guards', async () => {
        const m = new FormulaMessage(MessageAction.CreateMultiPolicy);
        m.setDocument(item, Buffer.from('zip'));
        assert.equal(m.uuid, 'u');
        await m.toDocuments();
        const restored = FormulaMessage.fromMessageObject({ ...m.toMessageObject(), id: 'i', status: 's' });
        assert.equal(restored.uuid, 'u');
        assert.throws(() => FormulaMessage.fromMessage(''), /Message Object is empty/);
        assert.throws(() => FormulaMessage.fromMessageObject(null), /JSON Object is empty/);
    });
});
