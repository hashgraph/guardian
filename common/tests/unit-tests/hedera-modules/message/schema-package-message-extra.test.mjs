import { assert } from 'chai';

import {
    SchemaPackageMessage,
    MessageAction,
    MessageType,
    MessageStatus,
    UrlType
} from '../../../../dist/hedera-modules/message/index.js';

describe('SchemaPackageMessage extra', function () {
    const pack = {
        name: 'Pack',
        owner: 'did:hedera:testnet:owner',
        version: '1.0.0',
        document: { docField: 1 },
        context: { ctxField: 2 }
    };

    const schemaA = {
        iri: '#iriA',
        uuid: 'uuid-a',
        name: 'A',
        description: 'da',
        entity: 'VC',
        owner: 'did:owner',
        version: '1.0.0',
        codeVersion: '1.0.0',
        messageId: 'm-a'
    };

    const schemaB = {
        iri: '#iriB',
        uuid: 'uuid-b',
        name: 'B',
        description: 'db',
        entity: 'VC',
        owner: 'did:owner',
        version: '1.0.0',
        codeVersion: '1.0.0',
        messageId: 'm-b'
    };

    const body = {
        id: 'msg-id',
        status: MessageStatus.ISSUE,
        type: MessageType.SchemaPackage,
        action: MessageAction.PublishSchemas,
        lang: 'en-US',
        name: 'Pack',
        owner: 'did:hedera:testnet:owner',
        version: '1.0.0',
        schemas: 2,
        document_cid: 'cidDoc',
        document_uri: 'ipfs://cidDoc',
        context_cid: 'cidCtx',
        context_uri: 'ipfs://cidCtx',
        metadata_cid: 'cidMeta',
        metadata_uri: 'ipfs://cidMeta'
    };

    function buildMessage() {
        const m = new SchemaPackageMessage(MessageAction.PublishSchemas);
        m.setDocument(pack);
        m.setMetadata([schemaA, schemaB], [schemaA, schemaB, { iri: '#x' }]);
        return m;
    }

    it('setDocument stores name/owner/version and the documents array', function () {
        const m = new SchemaPackageMessage(MessageAction.PublishSchemas);
        m.setDocument(pack);
        assert.equal(m.name, 'Pack');
        assert.equal(m.owner, pack.owner);
        assert.equal(m.version, '1.0.0');
        assert.deepEqual(m.documents[0], pack.document);
        assert.deepEqual(m.documents[1], pack.context);
        assert.isUndefined(m.documents[2]);
    });

    it('setMetadata fills metadata schemas and counts them', function () {
        const m = buildMessage();
        assert.equal(m.schemas, 2);
        const metadata = m.getMetadata();
        assert.lengthOf(metadata.schemas, 2);
        assert.deepEqual(metadata.schemas[0], {
            id: schemaA.iri,
            uuid: schemaA.uuid,
            name: schemaA.name,
            description: schemaA.description,
            entity: schemaA.entity,
            owner: schemaA.owner,
            version: schemaA.version,
            codeVersion: schemaA.codeVersion
        });
    });

    it('setMetadata collects unique relationship messageIds and skips missing ones', function () {
        const m = new SchemaPackageMessage(MessageAction.PublishSchemas);
        m.setDocument(pack);
        m.setMetadata([schemaA], [schemaA, schemaA, schemaB, { iri: '#none' }]);
        assert.deepEqual(m.getMetadata().relationships, ['m-a', 'm-b']);
    });

    it('setMetadata with null arguments produces empty metadata', function () {
        const m = new SchemaPackageMessage(MessageAction.PublishSchemas);
        m.setDocument(pack);
        m.setMetadata(null, null);
        assert.equal(m.schemas, 0);
        assert.deepEqual(m.getMetadata(), { schemas: [], relationships: [] });
    });

    it('getDocument and getContext read the documents array', function () {
        const m = buildMessage();
        assert.deepEqual(m.getDocument(), pack.document);
        assert.deepEqual(m.getContext(), pack.context);
    });

    it('toDocuments serializes all parts for PublishSchemas', async function () {
        const m = buildMessage();
        const docs = await m.toDocuments();
        assert.lengthOf(docs, 3);
        assert.deepEqual(JSON.parse(docs[0].toString()), pack.document);
        assert.deepEqual(JSON.parse(docs[1].toString()), pack.context);
        assert.deepEqual(JSON.parse(docs[2].toString()).schemas.length, 2);
    });

    it('toDocuments serializes for PublishSystemSchemas as well', async function () {
        const m = new SchemaPackageMessage(MessageAction.PublishSystemSchemas);
        m.setDocument(pack);
        m.setMetadata([schemaA], []);
        const docs = await m.toDocuments();
        assert.lengthOf(docs, 3);
    });

    it('toDocuments returns an empty array for other actions', async function () {
        const m = new SchemaPackageMessage(MessageAction.CreateSchema);
        m.setDocument(pack);
        m.setMetadata([schemaA], []);
        assert.deepEqual(await m.toDocuments(), []);
    });

    it('loadDocuments parses every string entry', function () {
        const m = new SchemaPackageMessage(MessageAction.PublishSchemas);
        const result = m.loadDocuments([JSON.stringify({ a: 1 }), JSON.stringify({ b: 2 })]);
        assert.equal(result, m);
        assert.deepEqual(m.documents, [{ a: 1 }, { b: 2 }]);
    });

    it('loadDocuments ignores non-array input', function () {
        const m = new SchemaPackageMessage(MessageAction.PublishSchemas);
        m.loadDocuments('nope');
        assert.isUndefined(m.documents);
    });

    it('fromMessageObject maps fields and all three url slots', function () {
        const m = SchemaPackageMessage.fromMessageObject(body);
        assert.equal(m.name, 'Pack');
        assert.equal(m.owner, body.owner);
        assert.equal(m.version, '1.0.0');
        assert.equal(m.schemas, 2);
        assert.equal(m.getDocumentUrl(UrlType.cid), 'cidDoc');
        assert.equal(m.getContextUrl(UrlType.cid), 'cidCtx');
        assert.equal(m.getMetadataUrl(UrlType.cid), 'cidMeta');
        assert.equal(m.getMetadataUrl(UrlType.url), 'ipfs://cidMeta');
    });

    it('fromMessageObject prefers *_url over *_uri when both present', function () {
        const m = SchemaPackageMessage.fromMessageObject({
            ...body,
            document_url: 'ipfs://other',
            document_uri: 'ipfs://cidDoc'
        });
        assert.equal(m.getDocumentUrl(UrlType.url), 'ipfs://other');
    });

    it('fromMessageObject drops url slots without a cid', function () {
        const m = SchemaPackageMessage.fromMessageObject({
            ...body,
            context_cid: undefined,
            metadata_cid: undefined
        });
        assert.lengthOf(m.getUrls(), 1);
        assert.isUndefined(m.getContextUrl(UrlType.cid));
    });

    it('getUrl returns the same array as getUrls', function () {
        const m = SchemaPackageMessage.fromMessageObject(body);
        assert.deepEqual(m.getUrl(), m.getUrls());
    });

    it('toJson exposes document/context/metadata when documents are set', function () {
        const m = buildMessage();
        const json = m.toJson();
        assert.equal(json.name, 'Pack');
        assert.equal(json.owner, pack.owner);
        assert.equal(json.version, '1.0.0');
        assert.deepEqual(json.document, pack.document);
        assert.deepEqual(json.context, pack.context);
        assert.equal(json.metadata.schemas.length, 2);
    });

    it('toJson omits documents when none are loaded', function () {
        const m = new SchemaPackageMessage(MessageAction.PublishSchemas);
        const json = m.toJson();
        assert.isUndefined(json.document);
        assert.isUndefined(json.context);
        assert.isUndefined(json.metadata);
    });

    it('fromJson restores documents triple', function () {
        const m = SchemaPackageMessage.fromJson({
            action: MessageAction.PublishSchemas,
            name: 'n',
            owner: 'o',
            version: 'v',
            schemas: 5,
            document: { d: 1 },
            context: { c: 2 },
            metadata: { schemas: [], relationships: [] }
        });
        assert.equal(m.name, 'n');
        assert.equal(m.schemas, 5);
        assert.deepEqual(m.getDocument(), { d: 1 });
        assert.deepEqual(m.getContext(), { c: 2 });
        assert.deepEqual(m.getMetadata(), { schemas: [], relationships: [] });
    });

    it('fromJson throws on empty input', function () {
        assert.throws(() => SchemaPackageMessage.fromJson(null), 'JSON Object is empty');
    });

    it('validate returns true and getOwner returns the owner', function () {
        const m = SchemaPackageMessage.fromMessageObject(body);
        assert.isTrue(m.validate());
        assert.equal(m.getOwner(), body.owner);
    });

    it('toMessage embeds the package payload for ISSUE status', function () {
        const m = buildMessage();
        const parsed = JSON.parse(m.toMessage());
        assert.equal(parsed.type, MessageType.SchemaPackage);
        assert.equal(parsed.name, 'Pack');
        assert.equal(parsed.schemas, 2);
        assert.equal(parsed.status, MessageStatus.ISSUE);
    });
});
