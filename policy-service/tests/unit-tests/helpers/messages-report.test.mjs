import { assert } from 'chai';
import esmock from 'esmock';

const MessageType = {
    VCDocument: 'VC-Document',
    VPDocument: 'VP-Document',
    RoleDocument: 'Role-Document',
};

const { MessagesReport } = await esmock.strict(
    '../../../dist/policy-engine/helpers/messages-report.js',
    {
        '@guardian/common': {
            DIDMessage: class {},
            HederaDid: { parse: () => ({ topicId: 't' }) },
            Message: class {},
            MessageAction: { PublishSchema: 'PublishSchema', PublishSystemSchema: 'PublishSystemSchema', CreateDID: 'CreateDID' },
            MessageServer: class {},
            MessageType,
            SchemaMessage: class {},
            TopicMessage: class {},
            UrlType: { url: 'url' },
            VCMessage: class {},
            Workers: class {},
        },
        '@guardian/interfaces': {
            TopicType: { PolicyTopic: 'PolicyTopic' },
            WorkerTaskType: { GET_TOKEN_INFO: 'GET_TOKEN_INFO' },
        },
    },
);

const tenant = { tenantId: 'tenant-1' };

describe('@unit MessagesReport.toJson', () => {
    it('returns an empty report for a fresh instance', () => {
        const report = new MessagesReport(tenant);
        const out = report.toJson();
        assert.deepEqual(out, { roles: [], topics: [], schemas: [], users: [], tokens: [] });
    });

    it('returns top-level topics with empty children/messages', () => {
        const report = new MessagesReport(tenant);
        report.topics.set('0.0.1', { topicId: '0.0.1' });
        const out = report.toJson();
        assert.equal(out.topics.length, 1);
        assert.equal(out.topics[0].topicId, '0.0.1');
        assert.deepEqual(out.topics[0].children, []);
        assert.deepEqual(out.topics[0].messages, []);
    });

    it('nests a child topic under its parent', () => {
        const report = new MessagesReport(tenant);
        report.topics.set('parent', { topicId: 'parent' });
        report.topics.set('child', { topicId: 'child', parentId: 'parent' });
        const out = report.toJson();
        assert.equal(out.topics.length, 1);
        assert.equal(out.topics[0].topicId, 'parent');
        assert.equal(out.topics[0].children.length, 1);
        assert.equal(out.topics[0].children[0].topicId, 'child');
    });

    it('keeps a child as top-level when its parent is absent', () => {
        const report = new MessagesReport(tenant);
        report.topics.set('child', { topicId: 'child', parentId: 'ghost' });
        const out = report.toJson();
        assert.equal(out.topics.length, 1);
        assert.equal(out.topics[0].topicId, 'child');
    });

    it('attaches messages to their topic', () => {
        const report = new MessagesReport(tenant);
        report.topics.set('0.0.1', { topicId: '0.0.1' });
        report.messages.set('m2', { id: 'b', topicId: '0.0.1', type: MessageType.VCDocument });
        report.messages.set('m1', { id: 'a', topicId: '0.0.1', type: MessageType.VCDocument });
        const out = report.toJson();
        assert.equal(out.topics[0].messages.length, 2);
        assert.deepEqual(out.topics[0].messages.map((m) => m.id).sort(), ['a', 'b']);
    });

    it('assigns a sequential order property by sorted id across messages', () => {
        const report = new MessagesReport(tenant);
        report.topics.set('0.0.1', { topicId: '0.0.1' });
        report.messages.set('m2', { id: 'b', topicId: '0.0.1', type: MessageType.VCDocument });
        report.messages.set('m1', { id: 'a', topicId: '0.0.1', type: MessageType.VCDocument });
        report.toJson();
        const byId = (id) => [...report.messages.values()].find((m) => m.id === id);
        assert.equal(byId('a').order, 0);
        assert.equal(byId('b').order, 1);
    });

    it('drops messages whose topic is not in the report', () => {
        const report = new MessagesReport(tenant);
        report.messages.set('m1', { id: 'a', topicId: 'unknown', type: MessageType.VCDocument });
        const out = report.toJson();
        assert.deepEqual(out.topics, []);
    });

    it('ignores null message entries', () => {
        const report = new MessagesReport(tenant);
        report.topics.set('0.0.1', { topicId: '0.0.1' });
        report.messages.set('m1', null);
        const out = report.toJson();
        assert.equal(out.topics[0].messages.length, 0);
    });

    it('collects RoleDocument messages into roles', () => {
        const report = new MessagesReport(tenant);
        report.topics.set('0.0.1', { topicId: '0.0.1' });
        report.messages.set('m1', { id: 'a', topicId: '0.0.1', type: MessageType.RoleDocument });
        const out = report.toJson();
        assert.equal(out.roles.length, 1);
        assert.equal(out.roles[0].id, 'a');
    });

    it('collects schemas from the schemas map', () => {
        const report = new MessagesReport(tenant);
        report.schemas.set('s1', { iri: 'iri-1' });
        report.schemas.set('s2', { iri: 'iri-2' });
        const out = report.toJson();
        assert.equal(out.schemas.length, 2);
    });

    it('collects only non-null users', () => {
        const report = new MessagesReport(tenant);
        report.users.set('did:1', { did: 'did:1' });
        report.users.set('did:2', null);
        const out = report.toJson();
        assert.equal(out.users.length, 1);
        assert.equal(out.users[0].did, 'did:1');
    });

    it('collects tokens from the tokens map', () => {
        const report = new MessagesReport(tenant);
        report.tokens.set('tok', { tokenId: 'tok' });
        const out = report.toJson();
        assert.equal(out.tokens.length, 1);
        assert.equal(out.tokens[0].tokenId, 'tok');
    });
});

describe('@unit MessagesReport.needDocument', () => {
    it('returns true for VC/VP/Role document types', () => {
        const report = new MessagesReport(tenant);
        assert.equal(report.needDocument({ type: MessageType.VCDocument }), true);
        assert.equal(report.needDocument({ type: MessageType.VPDocument }), true);
        assert.equal(report.needDocument({ type: MessageType.RoleDocument }), true);
    });

    it('returns false for other types', () => {
        const report = new MessagesReport(tenant);
        assert.equal(report.needDocument({ type: 'Topic' }), false);
    });
});

describe('@unit MessagesReport.getToken', () => {
    it('returns null when the worker throws', async () => {
        const report = new MessagesReport(tenant);
        const out = await report.getToken({ dryRun: null, mockId: null }, 'tok', null);
        assert.equal(out, null);
    });
});
