import assert from 'node:assert/strict';
import esmock from 'esmock';

function makeAxiosFake() {
    const calls = [];
    const responses = { get: [], post: [], patch: [] };
    function next(method) {
        const queue = responses[method];
        if (queue.length) {
            return queue.shift();
        }
        return { data: {}, status: 200 };
    }
    const axios = {
        calls,
        responses,
        queue(method, value) { responses[method].push(value); },
        async post(url, data, config) {
            const r = next('post');
            calls.push({ method: 'post', url, data, config });
            if (r instanceof Error) { throw r; }
            return r;
        },
        async patch(url, data, config) {
            const r = next('patch');
            calls.push({ method: 'patch', url, data, config });
            if (r instanceof Error) { throw r; }
            return r;
        },
        async get(url, config) {
            const r = next('get');
            calls.push({ method: 'get', url, config });
            if (r instanceof Error) { throw r; }
            return r;
        },
    };
    return axios;
}

const baseConfig = () => ({
    baseUrl: 'https://api.meeco.test',
    meecoOrganizationId: 'ORG-1',
    oauth: {
        url: 'https://auth.meeco.test/token',
        clientId: 'CID',
        clientSecret: 'CSECRET',
        scope: 'read write',
        grantType: 'client_credentials',
    },
});

describe('MeecoApi', function () {
    this.timeout(60000);

    let MeecoApi;
    let axios;
    let jwtDecodeCalls;

    before(async () => {
        axios = makeAxiosFake();
        jwtDecodeCalls = [];
        const mod = await esmock('../dist/meeco/meeco-api.js', {
            axios: { default: axios },
            jsonwebtoken: {
                decode: (token) => { jwtDecodeCalls.push(token); return { decoded: token }; },
            },
        });
        MeecoApi = mod.MeecoApi;
    });

    beforeEach(() => {
        axios.calls.length = 0;
        axios.responses.get.length = 0;
        axios.responses.post.length = 0;
        axios.responses.patch.length = 0;
        jwtDecodeCalls.length = 0;
    });

    function api() {
        return new MeecoApi(baseConfig());
    }

    it('exports a constructible class (link sanity)', () => {
        assert.equal(typeof MeecoApi, 'function');
        assert.equal(typeof api().getMe, 'function');
    });

    it('freezes the config so it cannot be mutated', () => {
        const cfg = baseConfig();
        const a = new MeecoApi(cfg);
        const inner = a.config;
        assert.ok(Object.isFrozen(inner));
        assert.throws(() => { inner.baseUrl = 'x'; });
    });

    describe('getTokenOauth2', () => {
        it('posts form-encoded oauth data to the oauth url', async () => {
            axios.queue('post', { data: { token_type: 'Bearer', access_token: 'AT' } });
            const out = await api().getTokenOauth2();
            const call = axios.calls[0];
            assert.equal(call.method, 'post');
            assert.equal(call.url, 'https://auth.meeco.test/token');
            assert.equal(call.config.headers['content-type'], 'application/x-www-form-urlencoded');
            assert.equal(out, 'Bearer AT');
        });

        it('serializes all oauth params into the body', async () => {
            axios.queue('post', { data: { token_type: 'Bearer', access_token: 'AT' } });
            await api().getTokenOauth2();
            const body = axios.calls[0].data;
            assert.ok(body.includes('grant_type=client_credentials'));
            assert.ok(body.includes('client_id=CID'));
            assert.ok(body.includes('client_secret=CSECRET'));
            assert.ok(body.includes('scope=read%20write'));
        });
    });

    describe('getMe', () => {
        it('authenticates then GETs /me with org header', async () => {
            axios.queue('post', { data: { token_type: 'Bearer', access_token: 'AT' } });
            axios.queue('get', { data: { id: 'me-1' } });
            const out = await api().getMe();
            const getCall = axios.calls.find(c => c.method === 'get');
            assert.equal(getCall.url, 'https://api.meeco.test/me');
            assert.equal(getCall.config.headers['Authorization'], 'Bearer AT');
            assert.equal(getCall.config.headers['Meeco-Organisation-Id'], 'ORG-1');
            assert.deepEqual(out, { id: 'me-1' });
        });
    });

    describe('getKeyEncryptionKey', () => {
        it('GETs /key_encryption_key and returns the data body', async () => {
            axios.queue('post', { data: { token_type: 'Bearer', access_token: 'AT' } });
            axios.queue('get', { data: { kek: 1 } });
            const out = await api().getKeyEncryptionKey();
            const getCall = axios.calls.find(c => c.method === 'get');
            assert.equal(getCall.url, 'https://api.meeco.test/key_encryption_key');
            assert.deepEqual(out, { kek: 1 });
        });
    });

    describe('getSchema / getSchemas', () => {
        it('getSchema interpolates schemaId into the URL', async () => {
            axios.queue('post', { data: { token_type: 'Bearer', access_token: 'AT' } });
            axios.queue('get', { data: { schema: 's' } });
            const out = await api().getSchema('SCHEMA-42');
            const getCall = axios.calls.find(c => c.method === 'get');
            assert.equal(getCall.url, 'https://api.meeco.test/schemas/SCHEMA-42');
            assert.deepEqual(out, { schema: 's' });
        });

        it('getSchemas hits the collection endpoint', async () => {
            axios.queue('post', { data: { token_type: 'Bearer', access_token: 'AT' } });
            axios.queue('get', { data: [{ id: 1 }] });
            const out = await api().getSchemas();
            const getCall = axios.calls.find(c => c.method === 'get');
            assert.equal(getCall.url, 'https://api.meeco.test/schemas');
            assert.deepEqual(out, [{ id: 1 }]);
        });
    });

    describe('createSchema', () => {
        it('POSTs a schema wrapper with name, json and org ids', async () => {
            axios.queue('post', { data: { token_type: 'Bearer', access_token: 'AT' } });
            axios.queue('post', { data: { id: 'new' } });
            const out = await api().createSchema('MySchema', { fields: [] });
            const postCall = axios.calls.filter(c => c.method === 'post')[1];
            assert.equal(postCall.url, 'https://api.meeco.test/schemas');
            const body = JSON.parse(postCall.data);
            assert.equal(body.schema.name, 'MySchema');
            assert.deepEqual(body.schema.schema_json, { fields: [] });
            assert.deepEqual(body.schema.organization_ids, ['ORG-1']);
            assert.deepEqual(out, { id: 'new' });
        });
    });

    describe('getDataEncryptionKey / getKeyPairs', () => {
        it('getDataEncryptionKey interpolates external id', async () => {
            axios.queue('post', { data: { token_type: 'Bearer', access_token: 'AT' } });
            axios.queue('get', { data: { dek: 1 } });
            await api().getDataEncryptionKey('DEK-9');
            const getCall = axios.calls.find(c => c.method === 'get');
            assert.equal(getCall.url, 'https://api.meeco.test/data_encryption_keys/DEK-9');
        });

        it('getKeyPairs interpolates external id', async () => {
            axios.queue('post', { data: { token_type: 'Bearer', access_token: 'AT' } });
            axios.queue('get', { data: { keypair: 1 } });
            await api().getKeyPairs('EXT-7');
            const getCall = axios.calls.find(c => c.method === 'get');
            assert.equal(getCall.url, 'https://api.meeco.test/keypairs/external_id/EXT-7');
        });
    });

    describe('getPassphraseArtefact', () => {
        it('GETs the passphrase derivation artefact endpoint', async () => {
            axios.queue('post', { data: { token_type: 'Bearer', access_token: 'AT' } });
            axios.queue('get', { data: { passphrase_derivation_artefact: {} } });
            const out = await api().getPassphraseArtefact();
            const getCall = axios.calls.find(c => c.method === 'get');
            assert.equal(getCall.url, 'https://api.meeco.test/passphrase_derivation_artefact');
            assert.deepEqual(out, { passphrase_derivation_artefact: {} });
        });
    });

    describe('createPresentationRequest', () => {
        it('builds the request body with method qrcode and a future expiry', async () => {
            axios.queue('post', { data: { token_type: 'Bearer', access_token: 'AT' } });
            axios.queue('post', { data: { id: 'pr-1' } });
            const before = Date.now();
            await api().createPresentationRequest('Req', 'did:abc', 'Client', 'PD-1');
            const postCall = axios.calls.filter(c => c.method === 'post')[1];
            assert.equal(postCall.url, 'https://api.meeco.test/oidc/presentations/requests');
            const body = JSON.parse(postCall.data);
            const pr = body.presentation_request;
            assert.equal(pr.name, 'Req');
            assert.equal(pr.client_id, 'did:abc');
            assert.equal(pr.client_name, 'Client');
            assert.equal(pr.presentation_definition_id, 'PD-1');
            assert.equal(pr.method, 'qrcode');
            assert.equal(pr.redirect_base_uri, 'https://api.meeco.test');
            assert.ok(new Date(pr.expires_at).getTime() > before);
        });
    });

    describe('submitPresentationRequestSignature', () => {
        it('PATCHes the request with the signed jwt', async () => {
            axios.queue('post', { data: { token_type: 'Bearer', access_token: 'AT' } });
            axios.queue('patch', { data: { id: 'pr-1' } });
            await api().submitPresentationRequestSignature('REQ-1', 'SIGNED');
            const patchCall = axios.calls.find(c => c.method === 'patch');
            assert.equal(patchCall.url, 'https://api.meeco.test/oidc/presentations/requests/REQ-1');
            const body = JSON.parse(patchCall.data);
            assert.equal(body.presentation_request.signed_request_jwt, 'SIGNED');
        });
    });

    describe('getVPSubmissions', () => {
        it('GETs the submissions collection for a request', async () => {
            axios.queue('post', { data: { token_type: 'Bearer', access_token: 'AT' } });
            axios.queue('get', { data: { submissions: [] } });
            const out = await api().getVPSubmissions('REQ-2');
            const getCall = axios.calls.find(c => c.method === 'get');
            assert.equal(getCall.url, 'https://api.meeco.test/oidc/presentations/requests/REQ-2/submissions');
            assert.deepEqual(out, { submissions: [] });
        });
    });

    describe('verifyVP', () => {
        it('returns true when the verify response status starts with 20', async () => {
            axios.queue('post', { data: { token_type: 'Bearer', access_token: 'AT' } });
            axios.queue('post', { data: {}, status: 200 });
            const out = await api().verifyVP('IDTOK', 'REQ-3', 'VPTOK');
            assert.equal(out, true);
            const verifyCall = axios.calls.filter(c => c.method === 'post')[1];
            assert.equal(verifyCall.url, 'https://api.meeco.test/oidc/presentations/response/verify');
            const body = JSON.parse(verifyCall.data);
            assert.equal(body.presentation_request_response.id_token, 'IDTOK');
            assert.equal(body.presentation_request_response.vp_token, 'VPTOK');
            assert.equal(
                body.presentation_request_response.request_uri,
                'https://api.meeco.test/oidc/presentations/requests/REQ-3/jwt'
            );
        });

        it('returns false when status does not start with 20', async () => {
            axios.queue('post', { data: { token_type: 'Bearer', access_token: 'AT' } });
            axios.queue('post', { data: {}, status: 404 });
            const out = await api().verifyVP('IDTOK', 'REQ-3', 'VPTOK');
            assert.equal(out, false);
        });

        it('rethrows the meeco reason on verification error', async () => {
            axios.queue('post', { data: { token_type: 'Bearer', access_token: 'AT' } });
            const err = new Error('orig');
            err.response = { data: { errors: [{ extra_info: { reason: 'bad signature' } }] } };
            axios.queue('post', err);
            await assert.rejects(() => api().verifyVP('I', 'R', 'V'), /bad signature/);
        });
    });

    describe('approveVPSubmission', () => {
        it('sets status verified when verified is true', async () => {
            axios.queue('post', { data: { token_type: 'Bearer', access_token: 'AT' } });
            axios.queue('patch', { data: { ok: true } });
            await api().approveVPSubmission('REQ-4', 'SUB-1', true);
            const patchCall = axios.calls.find(c => c.method === 'patch');
            assert.equal(patchCall.url, 'https://api.meeco.test/oidc/presentations/requests/REQ-4/submissions/SUB-1');
            const body = JSON.parse(patchCall.data);
            assert.equal(body.submission.status, 'verified');
        });

        it('sets status rejected when verified is false', async () => {
            axios.queue('post', { data: { token_type: 'Bearer', access_token: 'AT' } });
            axios.queue('patch', { data: { ok: true } });
            await api().approveVPSubmission('REQ-4', 'SUB-1', false);
            const patchCall = axios.calls.find(c => c.method === 'patch');
            const body = JSON.parse(patchCall.data);
            assert.equal(body.submission.status, 'rejected');
        });
    });

    describe('getVCStatusList', () => {
        it('GETs the url directly (no auth) and decodes the jwt body', async () => {
            axios.queue('get', { data: 'JWT.TOKEN' });
            const out = await api().getVCStatusList('https://status.test/list');
            const getCall = axios.calls.find(c => c.method === 'get');
            assert.equal(getCall.url, 'https://status.test/list');
            assert.equal(getCall.config, undefined);
            assert.deepEqual(jwtDecodeCalls, ['JWT.TOKEN']);
            assert.deepEqual(out, { decoded: 'JWT.TOKEN' });
        });
    });
});
