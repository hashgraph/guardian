import assert from 'node:assert/strict';
import { AnalyticsUtils } from '../dist/helpers/utils.js';
import { AnalyticsUserService } from '../dist/analytics/user.service.js';
import { AnalyticsTokenService } from '../dist/analytics/token.service.js';
import { AnalyticsDocumentService } from '../dist/analytics/document.service.js';
import { AnalyticsPolicyService } from '../dist/analytics/policy.service.js';
import {
    DatabaseServer,
    RegistrationMessage,
    TagMessage,
    VCMessage,
    VPMessage,
    RoleMessage,
    DIDMessage,
    TopicMessage,
    PolicyMessage,
    ModuleMessage,
    SchemaMessage,
    SchemaPackageMessage,
    TokenMessage,
    UrlType,
} from '@guardian/common';

const db = { create: [], save: [], find: [], findOne: [] };
let findResults = [];

function resetDb() {
    db.create.length = 0;
    db.save.length = 0;
    db.find.length = 0;
    db.findOne.length = 0;
    findResults = [];
}

const DB_METHODS = ['create', 'save', 'find', 'findOne'];
const originalProto = {};
for (const m of DB_METHODS) { originalProto[m] = DatabaseServer.prototype[m]; }
function patchDb() {
    DatabaseServer.prototype.create = function (_, d) { db.create.push(d); return d; };
    DatabaseServer.prototype.save = async function (_, d) { db.save.push(d); return d; };
    DatabaseServer.prototype.find = async function (_, q) { db.find.push(q); return findResults.shift() || []; };
    DatabaseServer.prototype.findOne = async function (_, q) { db.findOne.push(q); return null; };
}
function restoreDb() {
    for (const m of DB_METHODS) { DatabaseServer.prototype[m] = originalProto[m]; }
}

const UTIL_METHODS = ['updateStatus', 'updateProgress', 'searchMessages', 'getTokenInfo', 'unique'];
const originalUtils = {};
for (const m of UTIL_METHODS) { originalUtils[m] = AnalyticsUtils[m]; }
function patchUtils(searchImpl) {
    AnalyticsUtils.updateStatus = async (r) => r;
    AnalyticsUtils.updateProgress = (r) => r;
    AnalyticsUtils.unique = (arr) => arr;
    AnalyticsUtils.searchMessages = searchImpl;
}
function restoreUtils() {
    for (const m of UTIL_METHODS) { AnalyticsUtils[m] = originalUtils[m]; }
}

function parsedItem(type, fields = {}) {
    return {
        type,
        validate: () => true,
        setPayer() {}, setIndex() {}, setId() {}, setTopicId() {},
        getUrlValue: () => 'cid://x',
        getDocumentUrl: () => 'cid://doc',
        payer: '0.0.9', id: 'ts-1', uuid: 'u-x', name: 'n', description: 'd',
        owner: 'did:owner', action: 'create', topicId: '0.0.7',
        ...fields,
    };
}

function patchMessageStatic(MsgClass, type, fields = {}) {
    const orig = MsgClass.fromMessageObject;
    MsgClass.fromMessageObject = () => parsedItem(type, fields);
    return () => { MsgClass.fromMessageObject = orig; };
}

const fakeReport = () => ({ uuid: 'r-1', root: '0.0.1', error: null });

describe('AnalyticsUserService.search (coverage)', () => {
    let undo;
    beforeEach(() => { resetDb(); patchDb(); });
    afterEach(() => { restoreDb(); restoreUtils(); if (undo) { undo(); undo = null; } });

    it('parses a StandardRegistry message and persists a user row', async () => {
        undo = patchMessageStatic(RegistrationMessage, 'Standard Registry', { registrantTopicId: '0.0.5', did: 'did:sr' });
        patchUtils(async (report, topicId, skip, cb) => {
            await cb({ message: JSON.stringify({ type: 'Standard Registry' }), payer_account_id: '0.0.9', sequence_number: 1, id: 't1', topicId: '0.0.5' });
            return report;
        });
        const out = await AnalyticsUserService.search(fakeReport(), false);
        assert.equal(db.create.length, 1);
        assert.equal(db.create[0].type, 'STANDARD_REGISTRY');
        assert.equal(db.create[0].did, 'did:sr');
        assert.equal(db.save.length, 1);
        assert.ok(out);
    });

    it('ignores a non-JSON message body', async () => {
        patchUtils(async (report, topicId, skip, cb) => {
            await cb({ message: 'not-json' });
            return report;
        });
        const out = await AnalyticsUserService.search(fakeReport());
        assert.equal(db.create.length, 0);
        assert.ok(out);
    });

    it('ignores a message whose type is not StandardRegistry', async () => {
        patchUtils(async (report, topicId, skip, cb) => {
            await cb({ message: JSON.stringify({ type: 'Other' }) });
            return report;
        });
        const out = await AnalyticsUserService.search(fakeReport());
        assert.equal(db.create.length, 0);
        assert.ok(out);
    });

    it('records the error when searchMessages throws', async () => {
        patchUtils(async () => { throw new Error('mirror-down'); });
        const out = await AnalyticsUserService.search(fakeReport());
        assert.match(out.error, /mirror-down/);
    });
});

describe('AnalyticsTokenService (coverage)', () => {
    let undo;
    beforeEach(() => { resetDb(); patchDb(); });
    afterEach(() => { restoreDb(); restoreUtils(); if (undo) { undo(); undo = null; } });

    it('getTokenCache returns cache when present and not skipped', async () => {
        DatabaseServer.prototype.findOne = async () => ({ tokenId: 'T', balance: 5 });
        const out = await AnalyticsTokenService.getTokenCache('u', 'T', false);
        assert.equal(out.balance, 5);
    });

    it('getTokenCache returns null when present but skip=true', async () => {
        DatabaseServer.prototype.findOne = async () => ({ tokenId: 'T' });
        const out = await AnalyticsTokenService.getTokenCache('u', 'T', true);
        assert.equal(out, null);
    });

    it('getTokenCache creates a fresh cache when missing', async () => {
        DatabaseServer.prototype.findOne = async () => null;
        const out = await AnalyticsTokenService.getTokenCache('u', 'T');
        assert.equal(out.balance, 0);
        assert.equal(out.tokenId, 'T');
    });

    it('updateTokenCache saves through the database server', async () => {
        const cache = { tokenId: 'T', balance: 1 };
        const out = await AnalyticsTokenService.updateTokenCache(cache);
        assert.equal(db.save.length, 1);
        assert.equal(out, cache);
    });

    it('searchBalanceByToken applies fetched token info', async () => {
        DatabaseServer.prototype.findOne = async () => ({ tokenId: 'T', balance: 0, topicId: null });
        patchUtils(async (r) => r);
        AnalyticsUtils.getTokenInfo = async () => ({ total_supply: '42', memo: '0.0.123' });
        const report = fakeReport();
        const out = await AnalyticsTokenService.searchBalanceByToken(report, { tokenId: 'T' }, false);
        const saved = db.save.find((s) => s.tokenId === 'T');
        assert.equal(saved.balance, 42);
        assert.equal(saved.topicId, '0.0.123');
        assert.equal(out.error, null);
    });

    it('searchBalanceByToken records error when token info is empty', async () => {
        DatabaseServer.prototype.findOne = async () => ({ tokenId: 'T', balance: 0 });
        patchUtils(async (r) => r);
        AnalyticsUtils.getTokenInfo = async () => null;
        const out = await AnalyticsTokenService.searchBalanceByToken(fakeReport(), { tokenId: 'T' });
        assert.match(out.error, /Invalid token info/);
    });

    it('searchBalanceByToken records error when getTokenInfo throws', async () => {
        DatabaseServer.prototype.findOne = async () => ({ tokenId: 'T', balance: 0 });
        patchUtils(async (r) => r);
        AnalyticsUtils.getTokenInfo = async () => { throw new Error('boom'); };
        const out = await AnalyticsTokenService.searchBalanceByToken(fakeReport(), { tokenId: 'T' });
        assert.match(out.error, /boom/);
    });

    it('searchBalanceByToken returns early when cache missing (skip)', async () => {
        DatabaseServer.prototype.findOne = async () => ({ tokenId: 'T' });
        patchUtils(async (r) => r);
        const report = fakeReport();
        const out = await AnalyticsTokenService.searchBalanceByToken(report, { tokenId: 'T' }, true);
        assert.equal(out, report);
        assert.equal(db.save.length, 0);
    });

    it('searchTagByToken persists a Tag from a Tag message', async () => {
        undo = patchMessageStatic(TagMessage, 'Tag', { uuid: 'tag-1', target: 'tgt', operation: 'op', entity: 'ent', date: 'dt' });
        patchUtils(async (report, topicId, skip, cb) => {
            await cb({ message: JSON.stringify({ type: 'Tag' }) });
            return report;
        });
        const out = await AnalyticsTokenService.searchTagByToken(fakeReport(), { topicId: '0.0.5' });
        assert.equal(db.create.length, 1);
        assert.equal(db.create[0].tagUUID, 'tag-1');
        assert.ok(out);
    });

    it('searchTagByToken ignores a non-object string body and an unknown type', async () => {
        patchUtils(async (report, topicId, skip, cb) => {
            await cb({ message: 'plain text' });
            await cb({ message: JSON.stringify({ type: 'Unknown' }) });
            return report;
        });
        const out = await AnalyticsTokenService.searchTagByToken(fakeReport(), { topicId: '0.0.5' });
        assert.equal(db.create.length, 0);
        assert.ok(out);
    });

    it('searchTagByToken records error on throw', async () => {
        patchUtils(async () => { throw new Error('tag-fail'); });
        const out = await AnalyticsTokenService.searchTagByToken(fakeReport(), { topicId: '0.0.5' });
        assert.match(out.error, /tag-fail/);
    });

    it('search runs the balance and tag passes', async () => {
        DatabaseServer.prototype.findOne = async () => ({ tokenId: 'T', balance: 0 });
        patchUtils(async (r) => r);
        AnalyticsUtils.getTokenInfo = async () => ({ total_supply: '1', memo: '0.0.1' });
        findResults = [
            [{ tokenId: 'T' }],
            [{ topicId: '0.0.5' }],
        ];
        const out = await AnalyticsTokenService.search(fakeReport(), false);
        assert.ok(out);
        assert.equal(db.find.length, 2);
    });
});

describe('AnalyticsDocumentService (coverage)', () => {
    let undos = [];
    beforeEach(() => { resetDb(); patchDb(); });
    afterEach(() => { restoreDb(); restoreUtils(); undos.forEach((u) => u()); undos = []; });

    const instance = { policyUUID: 'p-1', policyTopicId: '0.0.2', instanceTopicId: '0.0.3' };

    it('persists VC documents', async () => {
        undos.push(patchMessageStatic(VCMessage, 'VC-Document', { issuer: 'iss' }));
        patchUtils(async (report, topicId, skip, cb) => {
            await cb({ message: JSON.stringify({ type: 'VC-Document' }) });
            return report;
        });
        const out = await AnalyticsDocumentService.searchByInstance(fakeReport(), '0.0.3', instance);
        assert.equal(db.create[0].type, 'VC');
        assert.ok(out);
    });

    it('persists VP documents', async () => {
        undos.push(patchMessageStatic(VPMessage, 'VP-Document', { issuer: 'iss' }));
        patchUtils(async (report, topicId, skip, cb) => { await cb({ message: JSON.stringify({ type: 'VP-Document' }) }); return report; });
        await AnalyticsDocumentService.searchByInstance(fakeReport(), '0.0.3', instance);
        assert.equal(db.create[0].type, 'VP');
    });

    it('persists Role documents', async () => {
        undos.push(patchMessageStatic(RoleMessage, 'Role-Document', { issuer: 'iss', role: 'r', group: 'g' }));
        patchUtils(async (report, topicId, skip, cb) => { await cb({ message: JSON.stringify({ type: 'Role-Document' }) }); return report; });
        await AnalyticsDocumentService.searchByInstance(fakeReport(), '0.0.3', instance);
        assert.equal(db.create[0].type, 'ROLE');
        assert.equal(db.create[0].role, 'r');
    });

    it('persists DID documents', async () => {
        undos.push(patchMessageStatic(DIDMessage, 'DID-Document', { did: 'did:doc' }));
        patchUtils(async (report, topicId, skip, cb) => { await cb({ message: JSON.stringify({ type: 'DID-Document' }) }); return report; });
        await AnalyticsDocumentService.searchByInstance(fakeReport(), '0.0.3', instance);
        assert.equal(db.create[0].type, 'DID');
        assert.equal(db.create[0].issuer, 'did:doc');
    });

    it('persists child Topic when childId is present', async () => {
        undos.push(patchMessageStatic(TopicMessage, 'Topic', { childId: '0.0.99' }));
        patchUtils(async (report, topicId, skip, cb) => { await cb({ message: JSON.stringify({ type: 'Topic' }) }); return report; });
        await AnalyticsDocumentService.searchByInstance(fakeReport(), '0.0.3', instance);
        assert.equal(db.create[0].topicId, '0.0.99');
    });

    it('skips Topic message without childId', async () => {
        undos.push(patchMessageStatic(TopicMessage, 'Topic', { childId: null }));
        patchUtils(async (report, topicId, skip, cb) => { await cb({ message: JSON.stringify({ type: 'Topic' }) }); return report; });
        await AnalyticsDocumentService.searchByInstance(fakeReport(), '0.0.3', instance);
        assert.equal(db.create.length, 0);
    });

    it('ignores a non-object string body and an unknown type', async () => {
        patchUtils(async (report, topicId, skip, cb) => {
            await cb({ message: 'plain text' });
            await cb({ message: JSON.stringify({ type: 'Unknown' }) });
            return report;
        });
        await AnalyticsDocumentService.searchByInstance(fakeReport(), '0.0.3', instance);
        assert.equal(db.create.length, 0);
    });

    it('records error on throw', async () => {
        patchUtils(async () => { throw new Error('doc-fail'); });
        const out = await AnalyticsDocumentService.searchByInstance(fakeReport(), '0.0.3', instance);
        assert.match(out.error, /doc-fail/);
    });

    it('searchDocuments fans out over instances and topics', async () => {
        patchUtils(async (r) => r);
        findResults = [
            [{ instanceTopicId: '0.0.3', policyUUID: 'p', policyTopicId: '0.0.2' }],
            [{ topicId: '0.0.4' }],
        ];
        const out = await AnalyticsDocumentService.searchDocuments(fakeReport(), false);
        assert.ok(out);
        assert.equal(db.find.length, 2);
    });
});

describe('AnalyticsPolicyService (coverage)', () => {
    let undos = [];
    beforeEach(() => { resetDb(); patchDb(); });
    afterEach(() => { restoreDb(); restoreUtils(); undos.forEach((u) => u()); undos = []; });

    const sr = { did: 'did:sr', topicId: '0.0.5' };

    it('searchByUser persists a sub-user from a DID message with different did', async () => {
        undos.push(patchMessageStatic(DIDMessage, 'DID-Document', { did: 'did:other', topicId: '0.0.6' }));
        patchUtils(async (report, topicId, skip, cb) => { await cb({ message: JSON.stringify({ type: 'DID-Document' }) }); return report; });
        await AnalyticsPolicyService.searchByUser(fakeReport(), sr);
        assert.equal(db.create[0].type, 'USER');
        assert.equal(db.create[0].did, 'did:other');
    });

    it('searchByUser skips DID with same did as SR', async () => {
        undos.push(patchMessageStatic(DIDMessage, 'DID-Document', { did: 'did:sr' }));
        patchUtils(async (report, topicId, skip, cb) => { await cb({ message: JSON.stringify({ type: 'DID-Document' }) }); return report; });
        await AnalyticsPolicyService.searchByUser(fakeReport(), sr);
        assert.equal(db.create.length, 0);
    });

    it('searchByUser persists Policy/Module/Tag/Schema/SchemaPackage', async () => {
        for (const [Msg, type] of [
            [PolicyMessage, 'Policy'],
            [ModuleMessage, 'Module'],
            [TagMessage, 'Tag'],
            [SchemaMessage, 'Schema'],
            [SchemaPackageMessage, 'Schema-Package'],
        ]) {
            resetDb();
            undos.push(patchMessageStatic(Msg, type, { policyTopicId: '0.0.8', version: '1', entity: 'e', schemas: 3 }));
            patchUtils(async (report, topicId, skip, cb) => { await cb({ message: JSON.stringify({ type }) }); return report; });
            await AnalyticsPolicyService.searchByUser(fakeReport(), sr);
            assert.equal(db.create.length, 1, `expected create for ${type}`);
        }
    });

    it('searchByUser ignores a non-object string body and unknown type', async () => {
        patchUtils(async (report, topicId, skip, cb) => {
            await cb({ message: 'plain text' });
            await cb({ message: JSON.stringify({ type: 'Unknown' }) });
            return report;
        });
        await AnalyticsPolicyService.searchByUser(fakeReport(), sr);
        assert.equal(db.create.length, 0);
    });

    it('searchByPolicy ignores a non-object string body and unknown type', async () => {
        patchUtils(async (report, topicId, skip, cb) => {
            await cb({ message: 'plain text' });
            await cb({ message: JSON.stringify({ type: 'Unknown' }) });
            return report;
        });
        await AnalyticsPolicyService.searchByPolicy(fakeReport(), { topicId: '0.0.2', owner: 'o' });
        assert.equal(db.create.length, 0);
    });

    it('searchByUser records error on throw', async () => {
        patchUtils(async () => { throw new Error('user-fail'); });
        const out = await AnalyticsPolicyService.searchByUser(fakeReport(), sr);
        assert.match(out.error, /user-fail/);
    });

    const policy = { topicId: '0.0.2', owner: 'did:owner' };

    it('searchByPolicy persists InstancePolicy/Token/Tag/Schema/SchemaPackage', async () => {
        for (const [Msg, type] of [
            [PolicyMessage, 'Instance-Policy'],
            [TokenMessage, 'Token'],
            [TagMessage, 'Tag'],
            [SchemaMessage, 'Schema'],
            [SchemaPackageMessage, 'Schema-Package'],
        ]) {
            resetDb();
            undos.push(patchMessageStatic(Msg, type, { instanceTopicId: '0.0.9', version: '1', tokenId: 'T', tokenName: 'N', tokenSymbol: 'S', tokenType: 'fungible', entity: 'e', schemas: 2 }));
            patchUtils(async (report, topicId, skip, cb) => { await cb({ message: JSON.stringify({ type }) }); return report; });
            await AnalyticsPolicyService.searchByPolicy(fakeReport(), policy);
            assert.equal(db.create.length, 1, `expected create for ${type}`);
        }
    });

    it('searchByPolicy records error on throw', async () => {
        patchUtils(async () => { throw new Error('policy-fail'); });
        const out = await AnalyticsPolicyService.searchByPolicy(fakeReport(), policy);
        assert.match(out.error, /policy-fail/);
    });

    it('searchPolicy fans out over SR users', async () => {
        patchUtils(async (r) => r);
        findResults = [[{ topicId: '0.0.5', did: 'did:sr' }]];
        const out = await AnalyticsPolicyService.searchPolicy(fakeReport(), false);
        assert.ok(out);
        assert.equal(db.find[0].type, 'STANDARD_REGISTRY');
    });

    it('searchInstance fans out over policies', async () => {
        patchUtils(async (r) => r);
        findResults = [[{ topicId: '0.0.2', owner: 'did:owner' }]];
        const out = await AnalyticsPolicyService.searchInstance(fakeReport(), false);
        assert.ok(out);
        assert.equal(db.find.length, 1);
    });
});
