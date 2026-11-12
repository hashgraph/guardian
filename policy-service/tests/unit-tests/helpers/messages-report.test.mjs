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
        '@guardian/common/helpers/workers': {
            Workers: class {}
        },
        '@guardian/hedera/message/did-message': {
            DIDMessage: class {}
        },
        '@guardian/hedera/vcjs/did/hedera-did': {
            HederaDid: { parse: () => ({ topicId: 't' }) }
        },
        '@guardian/hedera/message/message': {
            Message: class {}
        },
        '@guardian/hedera/message/message-action': {
            MessageAction: { PublishSchema: 'PublishSchema', PublishSystemSchema: 'PublishSystemSchema', CreateDID: 'CreateDID' }
        },
        '@guardian/hedera/message/message-server': {
            MessageServer: class {}
        },
        '@guardian/hedera/message/message-type': {
            MessageType
        },
        '@guardian/hedera/message/schema-message': {
            SchemaMessage: class {}
        },
        '@guardian/hedera/message/topic-message': {
            TopicMessage: class {}
        },
        '@guardian/hedera/message/url.interface': {
            UrlType: { url: 'url' }
        },
        '@guardian/hedera/message/vc-message': {
            VCMessage: class {}
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

const reportTypes = { ...MessageType, EVCDocument: 'EVC-Document', Topic: 'Topic' };
const fileError = new Error('Unable to get virtual file');

function storedCredential(label = 'Project Description') {
    return {
        '@context': ['https://www.w3.org/2018/credentials/v1', 'schema:project'],
        type: ['VerifiableCredential'],
        issuer: 'did:hedera:testnet:registry',
        credentialSubject: [{ type: 'Project', name: label }],
        proof: { type: 'Ed25519Signature2018', proofValue: 'signed-test-document' }
    };
}

function reportMessage(id, type = MessageType.VCDocument, relationships = [], extra = {}) {
    return {
        id, type, relationships, topicId: '0.0.20', document: null, ...extra,
        getOwner() { return 'did:hedera:testnet:virtual'; },
        getTopicId() { return this.topicId; },
        getRelationships() { return this.relationships; },
        loadDocuments(documents) { this.document = JSON.parse(documents[0]); },
        toJson() {
            return {
                id: this.id, type: this.type, topicId: this.topicId,
                relationships: this.relationships, document: this.document
            };
        }
    };
}

function reportTopic(topicId = '0.0.20', extra = {}) {
    return {
        type: 'Topic', action: 'create-topic', topicId,
        parentId: null, childId: null, messageType: 'INSTANCE_POLICY_TOPIC', ...extra,
        getTopicId() { return this.topicId; },
        toJson() {
            return {
                topicId: this.topicId, parentId: this.parentId, childId: this.childId,
                messageType: this.messageType, name: this.name
            };
        }
    };
}

async function reportHarness({
    dryRun = 'dry-run-1', mockId = null,
    messages = [], mockMessages = messages,
    records = [], files = new Map(),
    virtualTopics = [reportTopic()], networkTopics = [reportTopic()],
    readTopicMessages = async () => [],
    readVirtualTopics,
    readDocument, missingTopicReturnsNull = false
} = {}) {
    const topicError = new Error('Topic not found');
    const { MessagesReport: Report } = await esmock.strict(
        '../../../dist/policy-engine/helpers/messages-report.js',
        {
            '@guardian/common/helpers/workers': { Workers: class {} },
            '@guardian/hedera/message/did-message': { DIDMessage: class {} },
            '@guardian/hedera/vcjs/did/hedera-did': {
                HederaDid: { parse() { throw new Error('No public DID topic in this fixture'); } }
            },
            '@guardian/hedera/message/message': { Message: class {} },
            '@guardian/hedera/message/message-action': {
                MessageAction: {
                    PublishSchema: 'publish-schema', PublishSystemSchema: 'publish-system-schema',
                    CreateDID: 'create-did', CreateTopic: 'create-topic'
                }
            },
            '@guardian/hedera/message/message-server': {
                MessageServer: {
                    async tryGetMessage(options) {
                        const source = options.mockId ? mockMessages : messages;
                        return source.find((item) => item.id === options.messageId) || null;
                    },
                    async loadDocument(message, key, options) {
                        if (readDocument) {
                            return readDocument(message, key, options);
                        }
                        if (!files.has(message.id)) {
                            throw fileError;
                        }
                        await message.loadDocuments([JSON.stringify(files.get(message.id))], key);
                        return message;
                    },
                    async getTopic(topicId) {
                        const topic = networkTopics.find((item) => item.topicId === topicId);
                        if (!topic && !missingTopicReturnsNull) {
                            throw topicError;
                        }
                        return topic || null;
                    },
                    async getDryRunMessages(options) {
                        if (readVirtualTopics) {
                            return readVirtualTopics(options);
                        }
                        return virtualTopics.filter((item) => item.topicId === options.topicId &&
                            item.type === options.type && item.action === options.action);
                    },
                    getTopicMessages: readTopicMessages
                }
            },
            '@guardian/hedera/message/message-type': { MessageType: reportTypes },
            '@guardian/hedera/message/schema-message': { SchemaMessage: class {} },
            '@guardian/hedera/message/topic-message': { TopicMessage: class {} },
            '@guardian/hedera/message/url.interface': { UrlType: { url: 'url' } },
            '@guardian/hedera/message/vc-message': { VCMessage: class {} },
            '@guardian/interfaces': {
                TopicType: { PolicyTopic: 'POLICY_TOPIC' },
                WorkerTaskType: { GET_TOKEN_INFO: 'GET_TOKEN_INFO' }
            }
        }
    );
    const ref = {
        dryRun, mockId, policyId: 'policy-1',
        databaseServer: {
            async getVcDocument(filters) {
                return records.find((item) => item.kind === 'vc' &&
                    item.dryRun === dryRun && item.policyId === filters.policyId &&
                    item.messageId === filters.messageId) || null;
            },
            async getVpDocument(filters) {
                return records.find((item) => item.kind === 'vp' &&
                    item.dryRun === dryRun && item.policyId === filters.policyId &&
                    item.messageId === filters.messageId) || null;
            }
        }
    };
    const report = new Report();
    return { report, ref, topicError };
}

function recordFor(messageId, document = storedCredential(), extra = {}) {
    return { messageId, document, kind: 'vc', policyId: 'policy-1', dryRun: 'dry-run-1', ...extra };
}

function reportDocuments(report) {
    const visit = (topics) => topics.flatMap((topic) => [
        ...topic.messages, ...visit(topic.children)
    ]);
    return visit(report.toJson().topics);
}

describe('@unit MessagesReport dry-run documents and topics', () => {
    for (const type of [MessageType.VCDocument, MessageType.RoleDocument, MessageType.VPDocument]) {
        it(`loads a stored ${type} body when the file is unavailable`, async () => {
            const document = type === MessageType.VPDocument
                ? { '@context': ['https://www.w3.org/2018/credentials/v1'],
                    type: ['VerifiablePresentation'], verifiableCredential: [storedCredential()] }
                : storedCredential();
            const { report, ref } = await reportHarness({
                messages: [reportMessage('1.1', type)], networkTopics: [],
                records: [recordFor('1.1', document, { kind: type === MessageType.VPDocument ? 'vp' : 'vc' })]
            });
            await report.start(ref, '1.1', null);
            assert.deepEqual(reportDocuments(report).map((item) => item.document), [document]);
            if (type === MessageType.RoleDocument) {
                assert.equal(report.toJson().roles[0].id, '1.1');
            }
        });
    }

    it('walks the policy, role and registration relationships without duplicating a cycle', async () => {
        const { report, ref } = await reportHarness({
            messages: [
                reportMessage('4.1', MessageType.VCDocument, ['3.1', '2.1']),
                reportMessage('3.1', MessageType.VCDocument, ['2.1']),
                reportMessage('2.1', MessageType.RoleDocument, ['1.1']),
                reportMessage('1.1', 'Instance-Policy', ['4.1'])
            ],
            records: ['4.1', '3.1', '2.1'].map((id) => recordFor(id)), networkTopics: []
        });
        await report.start(ref, '4.1', null);
        assert.deepEqual(reportDocuments(report).map((item) => item.id), ['4.1', '3.1', '2.1', '1.1']);
        assert.deepEqual(reportDocuments(report).map((item) => item.order), [3, 2, 1, 0]);
        assert.equal(report.toJson().roles.length, 1);
    });

    it('keeps a file-backed body instead of replacing it with a stored body', async () => {
        const document = storedCredential('Original file');
        const { report, ref } = await reportHarness({
            mockId: 'mock-1', messages: [reportMessage('1.1')],
            files: new Map([['1.1', document]]), records: [recordFor('1.1', storedCredential('Later record'))],
            virtualTopics: [reportTopic('0.0.20', { name: 'Later topic' })],
            networkTopics: [reportTopic('0.0.20', { name: 'Original topic' })]
        });
        await report.start(ref, '1.1', null);
        assert.deepEqual(reportDocuments(report)[0].document, document);
        assert.equal(report.toJson().topics[0].message.name, 'Original topic');
    });

    it('uses a stored body after the mock and IPFS file read fails', async () => {
        const document = storedCredential();
        const { report, ref } = await reportHarness({
            mockId: 'mock-1', messages: [reportMessage('1.1')], records: [recordFor('1.1', document)]
        });
        await report.start(ref, '1.1', null);
        assert.deepEqual(reportDocuments(report)[0].document, document);
    });

    it('finds a message created before Mock Data was enabled', async () => {
        const { report, ref } = await reportHarness({
            mockId: 'mock-1', mockMessages: [], messages: [reportMessage('1.1')],
            records: [recordFor('1.1')], networkTopics: []
        });
        await report.start(ref, '1.1', null);
        assert.equal(reportDocuments(report)[0]?.id, '1.1');
    });

    it('omits a missing related document while keeping the rest of the chain', async () => {
        const { report, ref } = await reportHarness({
            messages: [reportMessage('3.1', MessageType.VCDocument, ['2.1', '1.1']),
                reportMessage('2.1', MessageType.VCDocument, ['0.1']),
                reportMessage('1.1', MessageType.RoleDocument), reportMessage('0.1')],
            records: ['3.1', '1.1', '0.1'].map((id) => recordFor(id))
        });
        await report.start(ref, '3.1', null);
        assert.deepEqual(reportDocuments(report).map((item) => item.id), ['3.1', '1.1']);
    });

    it('returns an empty report when the searched document record is missing', async () => {
        const { report, ref } = await reportHarness({ messages: [reportMessage('1.1')] });
        await report.start(ref, '1.1', null);
        assert.deepEqual(report.toJson(), { roles: [], topics: [], schemas: [], users: [], tokens: [] });
    });

    it('does not use records from a different policy or dry run', async () => {
        const { report, ref } = await reportHarness({
            messages: [reportMessage('1.1')], records: [
                recordFor('1.1', storedCredential('Other policy'), { policyId: 'policy-2' }),
                recordFor('1.1', storedCredential('Other run'), { dryRun: 'dry-run-2' })
            ]
        });
        await report.start(ref, '1.1', null);
        assert.deepEqual(reportDocuments(report), []);
    });

    for (const mockId of [null, 'mock-1']) {
        for (const [type, extra] of [
            [reportTypes.EVCDocument, {}],
            [MessageType.VCDocument, { encodedData: true }],
            [MessageType.RoleDocument, { encodedData: true }]
        ]) {
            it(`omits encrypted ${type} contents and relationships with mock ${mockId}`, async () => {
                const { report, ref } = await reportHarness({
                    mockId, messages: [reportMessage('1.1', type, ['0.1'], extra), reportMessage('0.1')],
                    records: [recordFor('1.1', storedCredential('Private body')), recordFor('0.1')],
                    files: new Map([['1.1', storedCredential('Private body')]])
                });
                await report.start(ref, '1.1', null);
                assert.deepEqual(report.toJson(), { roles: [], topics: [], schemas: [], users: [], tokens: [] });
            });
        }
    }

    it('uses the virtual topic description and reads a real parent topic normally', async () => {
        const { report, ref } = await reportHarness({
            files: new Map([['1.1', storedCredential()]]),
            messages: [reportMessage('1.1')], records: [recordFor('1.1')],
            virtualTopics: [
                reportTopic('0.0.20', { childId: '0.0.99', name: 'Child link' }),
                reportTopic('0.0.20', { parentId: '0.0.10', name: 'Instance topic' })
            ],
            networkTopics: [reportTopic('0.0.10', { name: 'Standard Registry' })]
        });
        await report.start(ref, '1.1', null);
        const [parent] = report.toJson().topics;
        assert.equal(parent.message.name, 'Standard Registry');
        assert.equal(parent.children[0].message.name, 'Instance topic');
        assert.equal(parent.children[0].messages[0].id, '1.1');
    });

    it('walks the topic rationale to the policy message', async () => {
        const { report, ref } = await reportHarness({
            files: new Map([['2.1', storedCredential()]]),
            messages: [reportMessage('2.1'), reportMessage('1.1', 'Instance-Policy')],
            records: [recordFor('2.1')], networkTopics: [],
            virtualTopics: [reportTopic('0.0.20', { rationale: '1.1' })]
        });
        await report.start(ref, '2.1', null);
        assert.deepEqual(reportDocuments(report).map((item) => item.id), ['2.1', '1.1']);
    });

    for (const missingResult of ['throws', 'null']) {
        it(`uses a virtual topic when the mock topic read ${missingResult}`, async () => {
            const { report, ref } = await reportHarness({
                files: new Map([['1.1', storedCredential()]]),
                mockId: 'mock-1', messages: [reportMessage('1.1')], records: [recordFor('1.1')],
                networkTopics: [], missingTopicReturnsNull: missingResult === 'null',
                virtualTopics: [reportTopic('0.0.20', { name: 'Stored topic' })]
            });
            await report.start(ref, '1.1', null);
            assert.equal(report.toJson().topics[0].message.name, 'Stored topic');
        });
    }

    it('keeps a document under a topic with missing metadata without failing', async () => {
        const { report, ref } = await reportHarness({
            files: new Map([['1.1', storedCredential()]]),
            messages: [reportMessage('1.1')], records: [recordFor('1.1')],
            virtualTopics: [], networkTopics: []
        });
        await report.start(ref, '1.1', null);
        assert.isNull(report.toJson().topics[0].message);
        assert.equal(reportDocuments(report)[0].id, '1.1');
    });

    it('does not query mirror-node schemas for a non-mock virtual policy topic', async () => {
        const { report, ref } = await reportHarness({
            files: new Map([['1.1', storedCredential()]]),
            messages: [reportMessage('1.1')], records: [recordFor('1.1')], networkTopics: [],
            virtualTopics: [reportTopic('0.0.20', { messageType: 'POLICY_TOPIC' })],
            readTopicMessages: async () => { throw new Error('Virtual topic is not on Hedera'); }
        });
        await report.start(ref, '1.1', null);
        assert.equal(reportDocuments(report)[0].id, '1.1');
        assert.deepEqual(report.toJson().schemas, []);
    });

    it('returns an empty report for an unknown message', async () => {
        const { report, ref } = await reportHarness();
        await report.start(ref, 'unknown', null);
        assert.deepEqual(report.toJson(), { roles: [], topics: [], schemas: [], users: [], tokens: [] });
    });

    it('preserves a published file-read error even when a local record exists', async () => {
        const { report, ref } = await reportHarness({
            dryRun: null, messages: [reportMessage('1.1')],
            records: [recordFor('1.1', storedCredential(), { dryRun: null })]
        });
        try {
            await report.start(ref, '1.1', null);
            assert.fail('Expected the published file-read error');
        } catch (error) {
            assert.strictEqual(error, fileError);
        }
    });

    it('preserves a published topic-read error', async () => {
        const { report, ref, topicError } = await reportHarness({
            dryRun: null, messages: [reportMessage('1.1')], files: new Map([['1.1', storedCredential()]]),
            virtualTopics: [reportTopic()], networkTopics: []
        });
        try {
            await report.start(ref, '1.1', null);
            assert.fail('Expected the published topic-read error');
        } catch (error) {
            assert.strictEqual(error, topicError);
        }
    });

    it('preserves a successful published report without querying virtual topics', async () => {
        const document = storedCredential();
        const { report, ref } = await reportHarness({
            dryRun: null, messages: [reportMessage('1.1')], files: new Map([['1.1', document]]),
            readVirtualTopics: async () => { throw new Error('Published report must not read dry-run topics'); }
        });
        await report.start(ref, '1.1', null);
        assert.deepEqual(reportDocuments(report)[0].document, document);
        assert.equal(report.toJson().topics[0].topicId, '0.0.20');
    });
});
