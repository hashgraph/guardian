import { assert } from 'chai';
import {
    CommentMessage,
    DiscussionMessage,
    MessageType,
    MessageAction
} from '../../../../dist/hedera-modules/message/index.js';

describe('CommentMessage', () => {
    const body = (over = {}) => ({
        id: 'id1', status: 'ISSUE', type: MessageType.PolicyComment, action: MessageAction.CreateComment,
        lang: 'en', account: '0.0.1',
        hash: 'h1', target: 't1', discussion: 'd1', cid: 'cid1', uri: 'ipfs://cid1', ...over
    });

    it('constructs with the PolicyComment type', () => {
        assert.equal(new CommentMessage(MessageAction.CreateComment).type, MessageType.PolicyComment);
    });

    it('default lang is en-US', () => {
        assert.equal(new CommentMessage(MessageAction.CreateComment).lang, 'en-US');
    });

    it('fromMessage throws on empty string', () => {
        assert.throws(() => CommentMessage.fromMessage(''), /Message Object is empty/);
    });

    it('fromMessageObject throws on empty json', () => {
        assert.throws(() => CommentMessage.fromMessageObject(null), /JSON Object is empty/);
    });

    it('fromJson throws on empty json', () => {
        assert.throws(() => CommentMessage.fromJson(null), /JSON Object is empty/);
    });

    it('fromMessageObject maps comment fields', () => {
        const m = CommentMessage.fromMessageObject(body());
        assert.equal(m.hash, 'h1');
        assert.equal(m.target, 't1');
        assert.equal(m.discussion, 'd1');
    });

    it('fromMessageObject builds url from cid', () => {
        const m = CommentMessage.fromMessageObject(body());
        assert.equal(m.getUrl().cid, 'cid1');
        assert.equal(m.getDocumentUrl('cid'), 'cid1');
    });

    it('fromMessage parses a serialized object', () => {
        const m = CommentMessage.fromMessage(JSON.stringify(body()));
        assert.equal(m.hash, 'h1');
        assert.equal(m.target, 't1');
    });

    it('setDocument copies entity fields', () => {
        const m = new CommentMessage(MessageAction.CreateComment);
        m.setDocument({ hash: 'hh', target: 'tt', discussionMessageId: 'dd', document: { a: 1 } });
        assert.equal(m.hash, 'hh');
        assert.equal(m.target, 'tt');
        assert.equal(m.discussion, 'dd');
        assert.deepEqual(m.getDocument(), { a: 1 });
    });

    it('setDocument defaults missing target/discussion to empty', () => {
        const m = new CommentMessage(MessageAction.CreateComment);
        m.setDocument({ hash: 'hh', document: {} });
        assert.equal(m.target, '');
        assert.equal(m.discussion, '');
    });

    it('toMessageObject reflects type and action', () => {
        const m = CommentMessage.fromMessageObject(body());
        const obj = m.toMessageObject();
        assert.equal(obj.type, MessageType.PolicyComment);
        assert.equal(obj.action, MessageAction.CreateComment);
        assert.equal(obj.hash, 'h1');
    });

    it('validate returns true', () => {
        assert.isTrue(new CommentMessage(MessageAction.CreateComment).validate());
    });

    it('toJson round-trips through fromJson', () => {
        const m = CommentMessage.fromMessageObject(body());
        m.document = { content: 'hello' };
        const json = m.toJson();
        const restored = CommentMessage.fromJson(json);
        assert.equal(restored.hash, 'h1');
        assert.equal(restored.target, 't1');
        assert.equal(restored.discussion, 'd1');
        assert.deepEqual(restored.document, { content: 'hello' });
    });

    it('toDocuments rejects without a key', async () => {
        const m = new CommentMessage(MessageAction.CreateComment);
        m.document = { a: 1 };
        let threw = false;
        try { await m.toDocuments(''); } catch (e) { threw = true; }
        assert.isTrue(threw);
    });

    it('toDocuments/loadDocuments round-trips with a key', async () => {
        const m = new CommentMessage(MessageAction.CreateComment);
        m.document = { secret: 'value' };
        const docs = await m.toDocuments('pass');
        assert.isArray(docs);
        const loaded = await m.loadDocuments(docs.map((b) => b.toString()), 'pass');
        assert.equal(loaded.document, JSON.stringify({ secret: 'value' }));
    });
});

describe('DiscussionMessage', () => {
    const body = (over = {}) => ({
        id: 'id1', status: 'ISSUE', type: MessageType.PolicyDiscussion, action: MessageAction.CreateComment,
        lang: 'en', account: '0.0.1',
        hash: 'h1', target: 't1', relationships: ['r1', 'r2'], cid: 'cid1', uri: 'ipfs://cid1', ...over
    });

    it('constructs with the PolicyDiscussion type', () => {
        assert.equal(new DiscussionMessage(MessageAction.CreateComment).type, MessageType.PolicyDiscussion);
    });

    it('fromMessage throws on empty string', () => {
        assert.throws(() => DiscussionMessage.fromMessage(''), /Message Object is empty/);
    });

    it('fromMessageObject throws on empty json', () => {
        assert.throws(() => DiscussionMessage.fromMessageObject(null), /JSON Object is empty/);
    });

    it('fromJson throws on empty json', () => {
        assert.throws(() => DiscussionMessage.fromJson(null), /JSON Object is empty/);
    });

    it('fromMessageObject maps discussion fields', () => {
        const m = DiscussionMessage.fromMessageObject(body());
        assert.equal(m.hash, 'h1');
        assert.equal(m.target, 't1');
        assert.deepEqual(m.relationships, ['r1', 'r2']);
    });

    it('fromMessageObject builds url from cid', () => {
        const m = DiscussionMessage.fromMessageObject(body());
        assert.equal(m.getUrl().cid, 'cid1');
        assert.equal(m.getDocumentUrl('url'), 'ipfs://cid1');
    });

    it('setDocument copies entity fields', () => {
        const m = new DiscussionMessage(MessageAction.CreateComment);
        m.setDocument({ hash: 'hh', target: 'tt', relationships: ['x'], document: { a: 1 } });
        assert.equal(m.hash, 'hh');
        assert.equal(m.target, 'tt');
        assert.deepEqual(m.relationships, ['x']);
    });

    it('setDocument defaults missing target/relationships', () => {
        const m = new DiscussionMessage(MessageAction.CreateComment);
        m.setDocument({ hash: 'hh', document: {} });
        assert.equal(m.target, '');
        assert.deepEqual(m.relationships, []);
    });

    it('toMessageObject reflects fields', () => {
        const obj = DiscussionMessage.fromMessageObject(body()).toMessageObject();
        assert.equal(obj.type, MessageType.PolicyDiscussion);
        assert.deepEqual(obj.relationships, ['r1', 'r2']);
    });

    it('validate returns true', () => {
        assert.isTrue(new DiscussionMessage(MessageAction.CreateComment).validate());
    });

    it('toJson round-trips through fromJson', () => {
        const m = DiscussionMessage.fromMessageObject(body());
        m.document = { content: 'hi' };
        const restored = DiscussionMessage.fromJson(m.toJson());
        assert.equal(restored.hash, 'h1');
        assert.deepEqual(restored.relationships, ['r1', 'r2']);
        assert.deepEqual(restored.document, { content: 'hi' });
    });

    it('toDocuments rejects without a key', async () => {
        const m = new DiscussionMessage(MessageAction.CreateComment);
        m.document = { a: 1 };
        let threw = false;
        try { await m.toDocuments(''); } catch (e) { threw = true; }
        assert.isTrue(threw);
    });

    it('toDocuments/loadDocuments round-trips with a key', async () => {
        const m = new DiscussionMessage(MessageAction.CreateComment);
        m.document = { secret: 'v' };
        const docs = await m.toDocuments('pass');
        const loaded = await m.loadDocuments(docs.map((b) => b.toString()), 'pass');
        assert.equal(loaded.document, JSON.stringify({ secret: 'v' }));
    });
});
