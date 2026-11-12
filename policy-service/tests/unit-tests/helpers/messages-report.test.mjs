import { assert } from 'chai';
import esmock from 'esmock';
import { SchemaMessage as ReportSchemaMessage } from '@guardian/hedera/message/schema-message';
import { DIDMessage as ReportDIDMessage } from '@guardian/hedera/message/did-message';
import { VCMessage as ReportVCMessage } from '@guardian/hedera/message/vc-message';
import { VPMessage as ReportVPMessage } from '@guardian/hedera/message/vp-message';
import { RoleMessage as ReportRoleMessage } from '@guardian/hedera/message/role-message';

const MessageType = {
    VCDocument: 'VC-Document',
    VPDocument: 'VP-Document',
    RoleDocument: 'Role-Document',
};

const { MessagesReport } = await esmock.strict(
    '../../../dist/policy-engine/helpers/messages-report.js',
    {
        '@guardian/common/database-modules/database-server': { DatabaseServer: class {} },
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
            TokenType: { NON_FUNGIBLE: 'non-fungible', FUNGIBLE: 'fungible' },
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

const reportTypes = { ...MessageType, EVCDocument: 'EVC-Document', Topic: 'Topic', DIDDocument: 'DID-Document' };
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
        getOwner() { return this.owner || 'did:hedera:testnet:virtual'; },
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
    messages = [], mockMessages = messages, networkMessages = messages,
    records = [], files = new Map(),
    virtualTopics = [reportTopic()], networkTopics = [reportTopic()],
    readTopicMessages = async () => [],
    readVirtualTopics,
    readDocument, missingTopicReturnsNull = false,
    schemaStore = [], readSchemas, didRecords = [], globalDidRecords = [],
    tokenRecords = [], globalTokenRecords = [],
    parseDid = () => ({ topicId: '0.0.20' }),
    readToken = async () => { throw new Error('Token not on network'); }
} = {}) {
    const topicError = new Error('Topic not found');
    const { MessagesReport: Report } = await esmock.strict(
        '../../../dist/policy-engine/helpers/messages-report.js',
        {
            '@guardian/common/database-modules/database-server': {
                DatabaseServer: {
                    async getDidDocument(did) { return globalDidRecords.find((item) => item.did === did) || null; },
                    async getToken(tokenId) { return globalTokenRecords.find((item) => item.tokenId === tokenId) || null; },
                    async getSchemas(filters) {
                        if (readSchemas) {
                            return readSchemas(filters);
                        }
                        return schemaStore.filter((schema) => filters.topicId.$in.includes(schema.topicId) &&
                            (!filters.contextURL || filters.contextURL.$in.includes(schema.contextURL)));
                    }
                }
            },
            '@guardian/common/helpers/workers': { Workers: class { async addRetryableTask() { return readToken(); } } },
            '@guardian/hedera/message/did-message': { DIDMessage: ReportDIDMessage },
            '@guardian/hedera/vcjs/did/hedera-did': {
                HederaDid: { parse: parseDid }
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
                        const source = options.mockId ? mockMessages : options.dryRun ? messages : networkMessages;
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
            '@guardian/hedera/message/schema-message': { SchemaMessage: ReportSchemaMessage },
            '@guardian/hedera/message/topic-message': { TopicMessage: class {} },
            '@guardian/hedera/message/url.interface': { UrlType: { url: 'url' } },
            '@guardian/hedera/message/vc-message': { VCMessage: class {} },
            '@guardian/interfaces': {
                TokenType: { NON_FUNGIBLE: 'non-fungible', FUNGIBLE: 'fungible' },
                TopicType: { PolicyTopic: 'POLICY_TOPIC' },
                WorkerTaskType: { GET_TOKEN_INFO: 'GET_TOKEN_INFO' }
            }
        }
    );
    const ref = {
        dryRun, mockId, policyId: 'policy-1',
        policyInstance: { topicId: '0.0.30', tools: [{ topicId: '0.0.40' }] },
        databaseServer: {
            async getDidDocument(did) { return didRecords.find((item) => item.did === did) || null; },
            async getToken(tokenId) { return tokenRecords.find((item) => item.tokenId === tokenId) || null; },
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

    it('keeps a missing related document and follows its relationships', async () => {
        const { report, ref } = await reportHarness({
            messages: [reportMessage('3.1', MessageType.VCDocument, ['2.1', '1.1']),
                reportMessage('2.1', MessageType.VCDocument, ['0.1']),
                reportMessage('1.1', MessageType.RoleDocument), reportMessage('0.1')],
            records: ['3.1', '1.1', '0.1'].map((id) => recordFor(id))
        });
        await report.start(ref, '3.1', null);
        assert.deepEqual(reportDocuments(report).map((item) => item.id), ['3.1', '2.1', '0.1', '1.1']);
        assert.isNull(reportDocuments(report).find((item) => item.id === '2.1').document);
    });

    it('keeps a searched message without content when its record is missing', async () => {
        const { report, ref } = await reportHarness({ messages: [reportMessage('1.1')] });
        await report.start(ref, '1.1', null);
        assert.equal(reportDocuments(report)[0]?.id, '1.1');
        assert.isNull(reportDocuments(report)[0].document);
        assert.isTrue(reportDocuments(report)[0].documentUnavailable);
    });

    it('does not use records from a different policy or dry run', async () => {
        const { report, ref } = await reportHarness({
            messages: [reportMessage('1.1')], records: [
                recordFor('1.1', storedCredential('Other policy'), { policyId: 'policy-2' }),
                recordFor('1.1', storedCredential('Other run'), { dryRun: 'dry-run-2' })
            ]
        });
        await report.start(ref, '1.1', null);
        assert.equal(reportDocuments(report)[0]?.id, '1.1');
        assert.isNull(reportDocuments(report)[0].document);
    });

    for (const mockId of [null, 'mock-1']) {
        for (const [type, extra] of [
            [reportTypes.EVCDocument, {}],
            [MessageType.VCDocument, { encodedData: true }],
            [MessageType.RoleDocument, { encodedData: true }]
        ]) {
            it(`keeps encrypted ${type} metadata and relationships without exposing contents with mock ${mockId}`, async () => {
                const { report, ref } = await reportHarness({
                    mockId, messages: [reportMessage('1.1', type, ['0.1'], extra), reportMessage('0.1')],
                    records: [recordFor('1.1', storedCredential('Private body')), recordFor('0.1')],
                    files: new Map([['1.1', storedCredential('Private body')]])
                });
                await report.start(ref, '1.1', null);
                const messages = reportDocuments(report);
                assert.deepEqual(messages.map((item) => item.id), ['1.1', '0.1']);
                assert.isNull(messages[0].document);
                assert.isTrue(messages[0].documentUnavailable);
                assert.notInclude(JSON.stringify(report.toJson()), 'Private body');
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

function storedSchema(contextURL = 'schema:project', extra = {}) {
    return {
        name: 'Project Description Schema', topicId: '0.0.30', contextURL,
        documentURL: 'schema:project-document', uuid: 'project-schema', version: '1.0.0',
        document: { type: 'object', properties: { name: { type: 'string' } } },
        context: { '@context': { Project: 'schema:project#Project' } }, ...extra
    };
}

function fileSchema(name = 'Published schema') {
    const schema = new ReportSchemaMessage('publish-schema');
    schema.setDocument(storedSchema('schema:project', { name }));
    schema.setUrls([
        { cid: 'project-document', url: 'schema:project-document' },
        { cid: 'project', url: 'schema:project' }
    ]);
    return schema;
}

describe('@unit MessagesReport dry-run schemas', () => {
    it('returns the schema name, form document and context in the report', async () => {
        const schema = storedSchema();
        const { report, ref } = await reportHarness({
            messages: [reportMessage('1.1')], files: new Map([['1.1', storedCredential()]]),
            schemaStore: [schema]
        });
        await report.start(ref, '1.1', null);
        const [result] = report.toJson().schemas;
        assert.equal(result?.name, schema.name);
        assert.equal(result.contextUrl, schema.contextURL);
        assert.equal(result.documentUrl, schema.documentURL);
        assert.deepEqual(result.document, schema.document);
        assert.deepEqual(result.context, schema.context);
    });

    it('includes matching tool schemas and excludes schemas on unrelated topics', async () => {
        const document = storedCredential();
        document['@context'].push('schema:tool');
        const { report, ref } = await reportHarness({
            messages: [reportMessage('1.1')], files: new Map([['1.1', document]]),
            schemaStore: [
                storedSchema('schema:project', { topicId: '0.0.99', name: 'Wrong topic' }),
                storedSchema('schema:tool', { topicId: '0.0.40', name: 'Tool schema' }),
                storedSchema(), storedSchema('schema:unused', { name: 'Unused schema' })
            ]
        });
        await report.start(ref, '1.1', null);
        assert.sameMembers(report.toJson().schemas.map((schema) => schema.name),
            ['Project Description Schema', 'Tool schema']);
    });

    it('includes the schema of a VC embedded in a VP', async () => {
        const document = { '@context': ['https://www.w3.org/2018/credentials/v1'],
            verifiableCredential: [storedCredential()] };
        const { report, ref } = await reportHarness({
            messages: [reportMessage('1.1', MessageType.VPDocument)],
            files: new Map([['1.1', document]]), schemaStore: [storedSchema()]
        });
        await report.start(ref, '1.1', null);
        assert.equal(report.toJson().schemas[0]?.contextUrl, 'schema:project');
    });

    it('retains a schema already loaded through Mock Data', async () => {
        const schema = fileSchema();
        const { report, ref } = await reportHarness({
            mockId: 'mock-1', messages: [reportMessage('1.1')],
            networkTopics: [reportTopic('0.0.20', { messageType: 'POLICY_TOPIC' })],
            schemaStore: [storedSchema('schema:project', { name: 'Later schema' })],
            readTopicMessages: async () => [schema],
            readDocument: async (message) => {
                if (message.type !== 'Schema') {
                    await message.loadDocuments([JSON.stringify(storedCredential())]);
                }
                return message;
            }
        });
        await report.start(ref, '1.1', null);
        assert.equal(report.toJson().schemas.length, 1);
        assert.equal(report.toJson().schemas[0].name, 'Published schema');
    });

    it('recovers the schema store after a mocked topic listing fails', async () => {
        const { report, ref } = await reportHarness({
            mockId: 'mock-1', messages: [reportMessage('1.1')],
            files: new Map([['1.1', storedCredential()]]),
            networkTopics: [reportTopic('0.0.20', { messageType: 'POLICY_TOPIC' })],
            readTopicMessages: async () => { throw new Error('Mock schema messages unavailable'); },
            schemaStore: [storedSchema()]
        });
        await report.start(ref, '1.1', null);
        assert.equal(report.toJson().schemas[0]?.name, 'Project Description Schema');
    });

    it('recovers a missing schema file without discarding other loaded schemas', async () => {
        const missing = fileSchema('Missing file');
        const loaded = fileSchema('Loaded schema');
        loaded.setUrls([{ cid: 'other-document', url: 'schema:other-document' },
            { cid: 'other', url: 'schema:other' }]);
        const { report, ref } = await reportHarness({
            mockId: 'mock-1', messages: [reportMessage('1.1')],
            networkTopics: [reportTopic('0.0.20', { messageType: 'POLICY_TOPIC' })],
            readTopicMessages: async () => [missing, loaded], schemaStore: [storedSchema()],
            readDocument: async (message) => {
                if (message === missing) {
                    throw new Error('Missing mock and IPFS schema file');
                }
                if (message.type !== 'Schema') {
                    await message.loadDocuments([JSON.stringify(storedCredential())]);
                }
                return message;
            }
        });
        await report.start(ref, '1.1', null);
        assert.sameMembers(report.toJson().schemas.map((schema) => schema.name),
            ['Loaded schema', 'Project Description Schema']);
    });

    it('keeps published schema errors and does not query the local schema store', async () => {
        const failure = new Error('Published schema unavailable');
        const { report, ref } = await reportHarness({
            dryRun: null, messages: [reportMessage('1.1')],
            files: new Map([['1.1', storedCredential()]]),
            networkTopics: [reportTopic('0.0.20', { messageType: 'POLICY_TOPIC' })],
            readTopicMessages: async () => { throw failure; },
            readSchemas: async () => { assert.fail('Published report queried schema store'); }
        });
        try {
            await report.start(ref, '1.1', null);
            assert.fail('Expected published schema error');
        } catch (error) {
            assert.strictEqual(error, failure);
        }
    });

    it('leaves a report with no matching stored schema usable', async () => {
        const { report, ref } = await reportHarness({
            messages: [reportMessage('1.1')], files: new Map([['1.1', storedCredential()]])
        });
        await report.start(ref, '1.1', null);
        assert.equal(reportDocuments(report)[0].id, '1.1');
        assert.deepEqual(report.toJson().schemas, []);
    });
});

function storedDid(did = 'did:hedera:testnet:virtual', extra = {}) {
    return { did, topicId: '0.0.20', document: { id: did, verificationMethod: [{ id: `${did}#key-1` }] }, ...extra };
}

function storedToken(extra = {}) {
    return { tokenId: '0.0.50', tokenName: 'Project credits', tokenSymbol: 'PRJ',
        tokenType: 'non-fungible', decimals: 0, ...extra };
}

function mintCredential() {
    const document = storedCredential();
    document.credentialSubject = [{ type: 'MintToken', tokenId: '0.0.50', amount: 1 }];
    return document;
}

describe('@unit MessagesReport dry-run users and tokens', () => {
    it('returns the virtual DID document without requiring a published DID message', async () => {
        const did = storedDid();
        const { report, ref } = await reportHarness({
            messages: [reportMessage('1.1')], files: new Map([['1.1', storedCredential()]]),
            didRecords: [did], readTopicMessages: async () => { throw new Error('DID is not on network'); }
        });
        await report.start(ref, '1.1', null);
        const [user] = report.toJson().users;
        assert.equal(user?.did, did.did);
        assert.equal(user.type, 'DID-Document');
        assert.equal(user.action, 'create-did');
        assert.deepEqual(user.document, did.document);
        assert.equal(reportDocuments(report).length, 1);
    });

    it('uses the global registry DID when no dry-run DID record exists', async () => {
        const did = storedDid('did:hedera:testnet:registry', { messageId: '0.1' });
        const { report, ref } = await reportHarness({
            messages: [reportMessage('1.1', MessageType.VCDocument, [], { owner: did.did })],
            files: new Map([['1.1', storedCredential()]]), globalDidRecords: [did]
        });
        await report.start(ref, '1.1', null);
        assert.deepEqual(report.toJson().users[0]?.document, did.document);
        assert.equal(report.toJson().users[0]?.id, '0.1');
        assert.equal(reportDocuments(report).find((item) => item.id === '0.1')?.type, 'DID-Document');
    });

    it('prefers the dry-run DID over a global record for the same DID', async () => {
        const did = storedDid();
        const { report, ref } = await reportHarness({
            messages: [reportMessage('1.1')], files: new Map([['1.1', storedCredential()]]),
            didRecords: [did], globalDidRecords: [storedDid(did.did, { document: { id: 'other' } })]
        });
        await report.start(ref, '1.1', null);
        assert.deepEqual(report.toJson().users[0]?.document, did.document);
    });

    it('retains a DID document successfully loaded through mocks', async () => {
        const did = storedDid();
        const message = ReportDIDMessage.fromJson({ id: '0.1', type: 'DID-Document',
            action: 'create-did', topicId: '0.0.20', did: did.did, document: did.document });
        const { report, ref } = await reportHarness({
            mockId: 'mock-1', messages: [reportMessage('1.1')],
            files: new Map([['1.1', storedCredential()], ['0.1', did.document]]),
            didRecords: [storedDid(did.did, { document: { id: 'later' } })],
            readTopicMessages: async () => [message]
        });
        await report.start(ref, '1.1', null);
        assert.deepEqual(report.toJson().users[0]?.document, did.document);
    });

    it('keeps the chain usable when a DID is missing from both stores', async () => {
        const { report, ref } = await reportHarness({
            messages: [reportMessage('1.1')], files: new Map([['1.1', storedCredential()]])
        });
        await report.start(ref, '1.1', null);
        assert.deepEqual(report.toJson().users, []);
        assert.equal(reportDocuments(report)[0].id, '1.1');
    });

    for (const [label, tokenRecords, globalTokenRecords] of [
        ['dry-run', [storedToken()], []], ['pre-existing', [], [storedToken()]]
    ]) {
        it(`returns the ${label} token name and symbol from stored data`, async () => {
            const { report, ref } = await reportHarness({
                messages: [reportMessage('1.1')], files: new Map([['1.1', mintCredential()]]),
                tokenRecords, globalTokenRecords
            });
            await report.start(ref, '1.1', null);
            assert.deepEqual(report.toJson().tokens, [{ name: 'Project credits', symbol: 'PRJ',
                tokenId: '0.0.50', type: 'NON_FUNGIBLE_UNIQUE', memo: '', decimals: 0 }]);
        });
    }

    it('uses stored token data when the worker returns no token', async () => {
        const { report, ref } = await reportHarness({
            messages: [reportMessage('1.1')], files: new Map([['1.1', mintCredential()]]),
            tokenRecords: [storedToken({ tokenType: 'fungible', decimals: 2 })], readToken: async () => null
        });
        await report.start(ref, '1.1', null);
        assert.equal(report.toJson().tokens[0]?.type, 'FUNGIBLE_COMMON');
        assert.equal(report.toJson().tokens[0]?.decimals, 2);
    });

    it('retains the token information returned by the existing worker', async () => {
        const { report, ref } = await reportHarness({
            messages: [reportMessage('1.1')], files: new Map([['1.1', mintCredential()]]),
            tokenRecords: [storedToken()],
            readToken: async () => ({ name: 'Original token', symbol: 'ORIG', token_id: '0.0.50',
                type: 'NON_FUNGIBLE_UNIQUE', memo: 'original memo', decimals: 0 })
        });
        await report.start(ref, '1.1', null);
        assert.equal(report.toJson().tokens[0].name, 'Original token');
        assert.equal(report.toJson().tokens[0].memo, 'original memo');
    });

    it('preserves published missing-token and missing-DID behavior without reading local fallback data', async () => {
        const { report, ref } = await reportHarness({
            dryRun: null, messages: [reportMessage('1.1')], files: new Map([['1.1', mintCredential()]]),
            tokenRecords: [storedToken()], didRecords: [storedDid()]
        });
        await report.start(ref, '1.1', null);
        assert.deepEqual(report.toJson().tokens, [null]);
        assert.deepEqual(report.toJson().users, []);
    });
});

describe('@unit MessagesReport historical document messages', () => {
    const cases = [
        {
            name: 'emission reductions linked to the first project description',
            rootId: '1794.432960076', oldId: '1794.414951554', latestId: '1794.433034035',
            roleId: '1794.413415539', policyId: '1794.413284824',
            rootTag: 'pp_ex_calculations_assign_update_save'
        },
        {
            name: 'issuance request linked to an earlier verified project record',
            rootId: '1794.435208584', oldId: '1794.435193721', latestId: '1794.435211817',
            roleId: '1794.435027761', policyId: '1794.435016834',
            rootTag: 'admin_issuance_approve_save'
        }
    ];
    for (const sample of cases) {
        for (const mockId of [null, 'mock-later']) {
            it(`keeps the complete chain for ${sample.name} with mock ${mockId}`, async () => {
                const old = reportMessage(sample.oldId, MessageType.VCDocument, [sample.roleId], { startMessage: sample.oldId });
                const latest = reportMessage(sample.latestId, MessageType.VCDocument, [sample.roleId]);
                const root = reportMessage(sample.rootId, MessageType.VCDocument, [sample.oldId], { tag: sample.rootTag });
                const role = reportMessage(sample.roleId, MessageType.RoleDocument);
                const policy = reportMessage(sample.policyId, 'Instance-Policy');
                const historicalFile = storedCredential('Original historical body');
                const { report, ref } = await reportHarness({
                    mockId, messages: [root, old, latest, role, policy],
                    virtualTopics: [reportTopic('0.0.20', { rationale: sample.policyId })],
                    networkTopics: [],
                    records: [recordFor(sample.rootId), recordFor(sample.roleId),
                        recordFor(sample.latestId, storedCredential('Latest content must not become historical content'))]
                });
                await report.start(ref, sample.rootId, null);
                const messages = reportDocuments(report);
                assert.sameMembers(messages.map((item) => item.id),
                    [sample.rootId, sample.oldId, sample.roleId, sample.policyId]);
                const oldCard = messages.find((item) => item.id === sample.oldId);
                assert.isNull(oldCard.document);
                assert.isTrue(oldCard.documentUnavailable);
                assert.deepEqual(oldCard.relationships, [sample.roleId]);
                assert.equal(report.toJson().roles[0].id, sample.roleId);
                assert.notInclude(JSON.stringify(report.toJson()), 'Latest content must not');
                const { report: latestReport, ref: latestRef } = await reportHarness({
                    messages: [latest], records: [recordFor(sample.latestId, storedCredential('Latest content'))]
                });
                await latestReport.start(latestRef, sample.latestId, null);
                assert.equal(reportDocuments(latestReport)[0].document.credentialSubject[0].name, 'Latest content');
                const { report: mockReport, ref: mockRef } = await reportHarness({
                    mockId: 'mock-available', messages: [reportMessage(sample.oldId)],
                    files: new Map([[sample.oldId, historicalFile]]),
                    records: [recordFor(sample.latestId, storedCredential('Later state'))]
                });
                await mockReport.start(mockRef, sample.oldId, null);
                assert.deepEqual(reportDocuments(mockReport)[0].document, historicalFile);
                assert.isUndefined(reportDocuments(mockReport)[0].documentUnavailable);
            });
        }
    }

    it('keeps cycle protection when a missing body links back to the searched message', async () => {
        const { report, ref } = await reportHarness({
            messages: [reportMessage('2.1', MessageType.VCDocument, ['1.1']),
                reportMessage('1.1', MessageType.VCDocument, ['2.1'])],
            records: [recordFor('2.1')]
        });
        await report.start(ref, '2.1', null);
        assert.sameMembers(reportDocuments(report).map((message) => message.id), ['2.1', '1.1']);
    });
});

describe('@unit MessagesReport pre-existing chain messages', () => {
    it('loads a real create-policy rationale reached through the policy topic', async () => {
        const createPolicy = reportMessage('1794412906.816569104', 'Policy', [], { topicId: '0.0.10' });
        const { report, ref } = await reportHarness({
            messages: [reportMessage('1.1')], records: [recordFor('1.1')], networkMessages: [createPolicy],
            virtualTopics: [reportTopic('0.0.20', { parentId: '0.0.30' }),
                reportTopic('0.0.30', { rationale: createPolicy.id, parentId: '0.0.10' })],
            networkTopics: [reportTopic('0.0.10')]
        });
        await report.start(ref, '1.1', null);
        assert.equal(reportDocuments(report).find((message) => message.id === createPolicy.id)?.type, 'Policy');
    });

    it('does not search Hedera for an initial non-mock dry-run query', async () => {
        const { report, ref } = await reportHarness({ messages: [],
            networkMessages: [reportMessage('1794412906.816569104', 'Policy')] });
        await report.start(ref, '1794412906.816569104', null);
        assert.deepEqual(report.toJson(), { topics: [], roles: [], schemas: [], tokens: [], users: [] });
    });

    it('reads a pre-existing linked document file outside the virtual file context', async () => {
        const real = reportMessage('1794412906.816569104');
        const document = storedCredential('Before dry run');
        const { report, ref } = await reportHarness({
            messages: [reportMessage('1.1', 'Instance-Policy', [real.id])], networkMessages: [real],
            readDocument: async (message, key, options) => {
                if (options.dryRun) { throw new Error('Real file read incorrectly marked virtual'); }
                await message.loadDocuments([JSON.stringify(document)], key);
                return message;
            }
        });
        await report.start(ref, '1.1', null);
        assert.deepEqual(reportDocuments(report).find((message) => message.id === real.id)?.document, document);
    });

    it('finishes when a linked message is missing from both stores', async () => {
        const { report, ref } = await reportHarness({
            messages: [reportMessage('1.1', 'Instance-Policy', ['missing'])], networkMessages: []
        });
        await report.start(ref, '1.1', null);
        assert.deepEqual(reportDocuments(report).map((message) => message.id), ['1.1']);
    });
});

describe('@unit MessagesReport message columns', () => {
    const orderedIds = (report) => reportDocuments(report).sort((a, b) => a.order - b.order).map((message) => message.id);

    for (const mockId of [null, 'mock-enabled-later']) {
        it(`places real policy messages before native dry-run messages with mock ${mockId}`, async () => {
            const createId = '1794432486.918928104';
            const instanceId = '1794.432502360';
            const requestId = '1794.432506831';
            const createPolicy = reportMessage(createId, 'Policy', [], { topicId: '0.0.10' });
            const did = storedDid('did:hedera:testnet:virtual', {
                topicId: '0.0.10', messageId: '1786971810.334647133'
            });
            const { report, ref } = await reportHarness({
                mockId, mockMessages: [createPolicy],
                messages: [reportMessage(requestId, MessageType.VCDocument, [instanceId]),
                    reportMessage(instanceId, 'Instance-Policy', [createId])],
                records: [recordFor(requestId)], networkMessages: [createPolicy], globalDidRecords: [did],
                networkTopics: [], virtualTopics: [reportTopic(), reportTopic('0.0.10')]
            });
            await report.start(ref, requestId, null);
            assert.deepEqual(orderedIds(report), [did.messageId, createId, instanceId, requestId]);
            assert.equal(reportDocuments(report).find((message) => message.id === createId).order, 1);
            const again = orderedIds(report);
            assert.deepEqual(again, [did.messageId, createId, instanceId, requestId]);
        });
    }

    it('keeps nanosecond precision when ordering real messages alongside virtual ones', async () => {
        const firstId = '1794432486.918928104';
        const nextId = '1794432486.918928105';
        const rootId = '1794.432506831';
        const { report, ref } = await reportHarness({
            messages: [reportMessage(rootId, 'Instance-Policy', [nextId, firstId])],
            networkMessages: [reportMessage(nextId, 'Policy'), reportMessage(firstId, 'Policy')]
        });
        await report.start(ref, rootId, null);
        assert.deepEqual(orderedIds(report), [firstId, nextId, rootId]);
    });

    it('preserves a mock-only report order without applying the native virtual time scale', async () => {
        const createId = '1794432513.078262104';
        const instanceId = '17944325299.618270208';
        const requestId = '17944325336.317388800';
        const { report, ref } = await reportHarness({
            mockId: 'mock-from-start', messages: [reportMessage(requestId, 'Instance-Policy', [instanceId]),
                reportMessage(instanceId, 'Instance-Policy', [createId]), reportMessage(createId, 'Policy')]
        });
        await report.start(ref, requestId, null);
        assert.deepEqual(orderedIds(report), [createId, instanceId, requestId]);
    });

    it('preserves the existing ordering of published messages', async () => {
        const firstId = '1786971810.334647133';
        const policyId = '1794432486.918928104';
        const rootId = '1794432502.360000000';
        const { report, ref } = await reportHarness({
            dryRun: null, messages: [reportMessage(rootId, 'Instance-Policy', [policyId, firstId]),
                reportMessage(policyId, 'Policy'), reportMessage(firstId, 'DID-Document')]
        });
        await report.start(ref, rootId, null);
        assert.deepEqual(orderedIds(report), [firstId, policyId, rootId]);
    });
});

describe('@unit MessagesReport serialized document availability', () => {
    for (const [type, MessageClass] of [
        [MessageType.VCDocument, ReportVCMessage],
        [MessageType.VPDocument, ReportVPMessage],
        [MessageType.RoleDocument, ReportRoleMessage]
    ]) {
        it(`preserves metadata and links of a real ${type} instance without a stored body`, async () => {
            const id = '1794.432506831';
            const latestId = '1794.432506900';
            const ancestorId = '1794.432502360';
            const owner = 'did:example:issuer';
            const makeMessage = (messageId) => {
                const message = MessageClass.fromMessageObject({
                    id: `urn:uuid:${messageId}`, status: 'ISSUE', type,
                    action: type === MessageType.VPDocument ? 'create-vp-document' : 'create-vc-document',
                    issuer: owner, relationships: [ancestorId], cid: `cid-${messageId}`,
                    role: 'Project Proponent', group: 'Project group'
                });
                message.setId(messageId);
                message.setTopicId('0.0.20');
                return message;
            };
            const latestBody = type === MessageType.VPDocument
                ? { '@context': ['https://www.w3.org/2018/credentials/v1'],
                    type: ['VerifiablePresentation'], holder: owner, verifiableCredential: [storedCredential('Latest body')] }
                : storedCredential('Latest body');
            const { report, ref } = await reportHarness({
                messages: [makeMessage(id), reportMessage(ancestorId, 'Instance-Policy')],
                records: [recordFor(latestId, latestBody, { kind: type === MessageType.VPDocument ? 'vp' : 'vc' })]
            });
            await report.start(ref, id, null);
            const messages = reportDocuments(report);
            const card = messages.find((message) => message.id === id);
            assert.equal(card.type, type);
            assert.equal(card.issuer, owner);
            assert.notExists(card.document);
            assert.isTrue(card.documentUnavailable);
            assert.deepEqual(card.relationships, [ancestorId]);
            assert.exists(messages.find((message) => message.id === ancestorId));
            assert.notInclude(JSON.stringify(report.toJson()), 'Latest body');
            if (type === MessageType.RoleDocument) {
                assert.equal(report.toJson().roles[0].role, 'Project Proponent');
                assert.equal(report.toJson().roles[0].group, 'Project group');
            }
            const { report: latestReport, ref: latestRef } = await reportHarness({
                messages: [makeMessage(latestId), reportMessage(ancestorId, 'Instance-Policy')],
                records: [recordFor(latestId, latestBody, { kind: type === MessageType.VPDocument ? 'vp' : 'vc' })]
            });
            await latestReport.start(latestRef, latestId, null);
            const latest = reportDocuments(latestReport).find((message) => message.id === latestId);
            assert.deepEqual(latest.document, latestBody);
            assert.isUndefined(latest.documentUnavailable);
        });
    }
});
