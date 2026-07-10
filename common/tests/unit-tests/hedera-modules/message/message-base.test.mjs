import { assert } from 'chai';
import { Message, MessageStatus } from '../../../../dist/hedera-modules/message/message.js';
import { MessageType } from '../../../../dist/hedera-modules/message/message-type.js';
import { MessageAction } from '../../../../dist/hedera-modules/message/message-action.js';
import { UrlType } from '../../../../dist/hedera-modules/message/url.interface.js';

class TestMessage extends Message {
    constructor() {
        super(MessageAction.CreateVC, MessageType.VCDocument);
    }
    toMessageObject() {
        return { type: this.type, action: this.action, foo: 'bar' };
    }
    async toDocuments() {
        return [];
    }
    loadDocuments() {
        return this;
    }
    validate() {
        return true;
    }
}

describe('Message base: simple accessors', () => {
    let m;
    beforeEach(() => {
        m = new TestMessage();
    });

    it('constructor seeds type/lang/action/status and a messageId', () => {
        assert.equal(m.type, MessageType.VCDocument);
        assert.equal(m.lang, 'en-US');
        assert.equal(m.action, MessageAction.CreateVC);
        assert.isString(m.getMessageId());
        assert.equal(m.responseType, 'str');
    });

    it('setId/getId round-trips', () => {
        m.setId('id-1');
        assert.equal(m.getId(), 'id-1');
    });

    it('setPayer / setOwnerAccount / setIndex assign fields', () => {
        m.setPayer('0.0.10');
        m.setOwnerAccount('0.0.11');
        m.setIndex(5);
        assert.equal(m.payer, '0.0.10');
        assert.equal(m.account, '0.0.11');
        assert.equal(m.index, 5);
    });

    it('setTopicId/getTopicId stringifies; null when unset', () => {
        assert.isNull(m.getTopicId());
        m.setTopicId('0.0.99');
        assert.equal(m.getTopicId(), '0.0.99');
    });

    it('setLang falls back to en-US for falsy input', () => {
        m.setLang('uk');
        assert.equal(m.lang, 'uk');
        m.setLang('');
        assert.equal(m.lang, 'en-US');
    });

    it('setMemo/getMemo round-trips', () => {
        m.setMemo('hello');
        assert.equal(m.getMemo(), 'hello');
    });

    it('getOwner returns null at the base level', () => {
        assert.isNull(m.getOwner());
    });

    it('getRelationships returns an empty array at the base level', () => {
        assert.deepEqual(m.getRelationships(), []);
    });
});

describe('Message base: URLs', () => {
    let m;
    beforeEach(() => {
        m = new TestMessage();
    });

    it('setUrls drops entries without a cid', () => {
        m.setUrls([{ cid: 'a', url: 'ua' }, { url: 'no-cid' }, { cid: 'b', url: 'ub' }]);
        assert.equal(m.getUrls().length, 2);
    });

    it('getUrl returns the same array as getUrls', () => {
        m.setUrls([{ cid: 'a', url: 'ua' }]);
        assert.deepEqual(m.getUrl(), m.getUrls());
    });

    it('getUrlValue returns cid or url by type', () => {
        m.setUrls([{ cid: 'a', url: 'ua' }]);
        assert.equal(m.getUrlValue(0, UrlType.cid), 'a');
        assert.equal(m.getUrlValue(0, UrlType.url), 'ua');
    });

    it('getUrlValue returns undefined for out-of-range index', () => {
        m.setUrls([{ cid: 'a', url: 'ua' }]);
        assert.isUndefined(m.getUrlValue(5, UrlType.cid));
    });

    it('isDocuments reflects URL presence at an index', () => {
        assert.isFalse(m.isDocuments());
        m.setUrls([{ cid: 'a', url: 'ua' }]);
        assert.isTrue(m.isDocuments(0));
        assert.isFalse(m.isDocuments(1));
    });
});

describe('Message base: status transitions', () => {
    it('revoke sets REVOKE status and RevokeDocument action (document reason)', () => {
        const m = new TestMessage();
        m.revoke('msg', 'owner');
        assert.isTrue(m.isRevoked());
        assert.equal(m.action, MessageAction.RevokeDocument);
    });

    it('revoke with parentIds uses the ParentRevoked reason path', () => {
        const m = new TestMessage();
        m.revoke('msg', 'owner', ['p1']);
        assert.isTrue(m.isRevoked());
        const body = JSON.parse(m.toMessage());
        assert.equal(body.reason, 'Parent Revoked');
        assert.deepEqual(body.parentIds, ['p1']);
    });

    it('delete sets DELETED status and DeleteDocument action', () => {
        const m = new TestMessage();
        m.delete('gone', ['p1']);
        assert.isFalse(m.isRevoked());
        assert.equal(m.action, MessageAction.DeleteDocument);
        const body = JSON.parse(m.toMessage());
        assert.equal(body.status, MessageStatus.DELETED);
        assert.equal(body.deleteMessage, 'gone');
    });

    it('setMessageStatus updates status and sets ChangeMessageStatus action', () => {
        const m = new TestMessage();
        m.setMessageStatus(MessageStatus.WITHDRAW, 'note');
        assert.equal(m.action, MessageAction.ChangeMessageStatus);
        const body = JSON.parse(m.toMessage());
        assert.equal(body.status, MessageStatus.WITHDRAW);
        assert.equal(body.statusMessage, 'note');
    });
});

describe('Message base: serialization', () => {
    it('toMessage for ISSUE embeds toMessageObject + id/status', () => {
        const m = new TestMessage();
        const body = JSON.parse(m.toMessage());
        assert.equal(body.status, MessageStatus.ISSUE);
        assert.equal(body.foo, 'bar');
        assert.isString(body.id);
    });

    it('toHash is a deterministic base58 string', () => {
        const m = new TestMessage();
        const h1 = m.toHash();
        const h2 = m.toHash();
        assert.isString(h1);
        assert.equal(h1, h2);
    });

    it('toJson exposes the documented surface', () => {
        const m = new TestMessage();
        m.setId('id-1');
        m.setTopicId('0.0.5');
        m.setMemo('memo');
        const json = m.toJson();
        assert.equal(json.id, 'id-1');
        assert.equal(json.topicId, '0.0.5');
        assert.equal(json.transactionMemo, 'memo');
        assert.equal(json.type, MessageType.VCDocument);
        assert.equal(json.lang, 'en-US');
        assert.isString(json.messageId);
    });

    it('toJson topicId is null when unset', () => {
        const m = new TestMessage();
        assert.isNull(m.toJson().topicId);
    });
});
