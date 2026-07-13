import assert from 'node:assert/strict';
import { AuthEvents } from '@guardian/interfaces';
import { MeecoAuth } from '../../dist/helpers/meeco.js';

function encodeJwt(payload) {
    const header = { alg: 'none', typ: 'JWT' };
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    return `${b64(header)}.${b64(payload)}.`;
}

function buildApprovedSubmission(vc) {
    const innerVc = encodeJwt({ vc });
    const vpToken = encodeJwt({ vp: { verifiableCredential: [innerVc] } });
    return { vpRequest: { submission: { vp_token: vpToken } } };
}

function freshAuth() {
    const auth = new MeecoAuth();
    auth.clients = {};
    return auth;
}

describe('api-gateway MeecoAuth static token extraction', () => {
    it('extractVerifiableCredentialFromMeecoToken returns the inner vc', () => {
        const vc = { credentialSubject: { firstName: 'Ada', familyName: 'Lovelace', id: 'did:1' } };
        const submission = buildApprovedSubmission(vc);
        const result = MeecoAuth.extractVerifiableCredentialFromMeecoToken(submission);
        assert.deepEqual(result, vc);
    });

    it('extractUserFromApprovedMeecoToken returns the credentialSubject', () => {
        const credentialSubject = { firstName: 'Ada', familyName: 'Lovelace', id: 'did:1' };
        const submission = buildApprovedSubmission({ credentialSubject });
        const result = MeecoAuth.extractUserFromApprovedMeecoToken(submission);
        assert.deepEqual(result, credentialSubject);
    });
});

describe('api-gateway MeecoAuth.createMeecoAuthRequest', () => {
    it('registers the ws client and returns the redirect uri', async () => {
        const auth = freshAuth();
        const calls = [];
        auth.sendMessage = async (subject, data) => {
            calls.push({ subject, data });
            return { redirectUri: 'https://redirect' };
        };
        const ws = { id: 'ws-1' };
        const result = await auth.createMeecoAuthRequest(ws);
        assert.deepEqual(result, { redirectUri: 'https://redirect' });
        assert.equal(auth.clients['ws-1'], ws);
        assert.equal(calls[0].subject, AuthEvents.MEECO_AUTH_START);
        assert.deepEqual(calls[0].data, { cid: 'ws-1' });
    });
});

describe('api-gateway MeecoAuth.approveSubmission', () => {
    it('registers the ws client and forwards approval ids', async () => {
        const auth = freshAuth();
        const calls = [];
        auth.sendMessage = async (subject, data) => {
            calls.push({ subject, data });
            return 'approved';
        };
        const ws = { id: 'ws-2' };
        const result = await auth.approveSubmission(ws, 'pres-req', 'sub-id');
        assert.equal(result, 'approved');
        assert.equal(auth.clients['ws-2'], ws);
        assert.equal(calls[0].subject, AuthEvents.MEECO_APPROVE_SUBMISSION);
        assert.deepEqual(calls[0].data, {
            presentation_request_id: 'pres-req',
            submission_id: 'sub-id',
            cid: 'ws-2',
        });
    });
});

describe('api-gateway MeecoAuth.rejectSubmission', () => {
    it('registers the ws client and forwards rejection ids', async () => {
        const auth = freshAuth();
        const calls = [];
        auth.sendMessage = async (subject, data) => {
            calls.push({ subject, data });
            return 'rejected';
        };
        const ws = { id: 'ws-3' };
        const result = await auth.rejectSubmission(ws, 'pres-req', 'sub-id');
        assert.equal(result, 'rejected');
        assert.equal(auth.clients['ws-3'], ws);
        assert.equal(calls[0].subject, AuthEvents.MEECO_REJECT_SUBMISSION);
        assert.deepEqual(calls[0].data, {
            presentation_request_id: 'pres-req',
            submission_id: 'sub-id',
            cid: 'ws-3',
        });
    });
});

describe('api-gateway MeecoAuth.registerListeners', () => {
    function captureListeners(auth) {
        const handlers = {};
        auth.getMessages = (subject, cb) => { handlers[subject] = cb; };
        auth.registerListeners();
        return handlers;
    }

    it('registers handlers for both verify-vp subjects', () => {
        const auth = freshAuth();
        const handlers = captureListeners(auth);
        assert.equal(typeof handlers[AuthEvents.MEECO_VERIFY_VP], 'function');
        assert.equal(typeof handlers[AuthEvents.MEECO_VERIFY_VP_FAILED], 'function');
    });

    it('MEECO_VERIFY_VP looks up the user, sets role, and sends to the ws', async () => {
        const auth = freshAuth();
        let sent;
        const ws = { id: 'cid-1', send: (payload) => { sent = JSON.parse(payload); } };
        auth.clients['cid-1'] = ws;
        const sendCalls = [];
        auth.sendMessage = async (subject, data) => {
            sendCalls.push({ subject, data });
            return { role: 'STANDARD_USER' };
        };
        const handlers = captureListeners(auth);
        const msg = { cid: 'cid-1', vc: { firstName: 'Ada', familyName: 'Lovelace', id: 'abc' } };
        await handlers[AuthEvents.MEECO_VERIFY_VP](msg);
        assert.equal(sendCalls[0].subject, AuthEvents.GET_USER);
        assert.equal(sendCalls[0].data.username, sendCalls[0].data.username.toLowerCase());
        assert.ok(sendCalls[0].data.username.startsWith('adalovelace'));
        assert.equal(msg.role, 'STANDARD_USER');
        assert.equal(sent.event, 'MEECO_VERIFY_VP');
        assert.equal(sent.data.role, 'STANDARD_USER');
    });

    it('MEECO_VERIFY_VP sets role to null when no user is found', async () => {
        const auth = freshAuth();
        let sent;
        const ws = { id: 'cid-2', send: (payload) => { sent = JSON.parse(payload); } };
        auth.clients['cid-2'] = ws;
        auth.sendMessage = async () => null;
        const handlers = captureListeners(auth);
        const msg = { cid: 'cid-2', vc: { firstName: 'Grace', familyName: 'Hopper', id: 'xyz' } };
        await handlers[AuthEvents.MEECO_VERIFY_VP](msg);
        assert.equal(msg.role, null);
        assert.equal(sent.data.role, null);
    });

    it('MEECO_VERIFY_VP_FAILED forwards the failure to the ws', async () => {
        const auth = freshAuth();
        let sent;
        const ws = { id: 'cid-3', send: (payload) => { sent = JSON.parse(payload); } };
        auth.clients['cid-3'] = ws;
        const handlers = captureListeners(auth);
        const msg = { cid: 'cid-3', reason: 'denied' };
        await handlers[AuthEvents.MEECO_VERIFY_VP_FAILED](msg);
        assert.equal(sent.event, 'MEECO_VERIFY_VP_FAILED');
        assert.deepEqual(sent.data, msg);
    });
});
