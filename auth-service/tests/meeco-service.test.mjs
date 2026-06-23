import assert from 'node:assert/strict';
import esmock from 'esmock';

describe('MeecoService', function () {
    this.timeout(60000);

    let MeecoService;
    let lastApi;
    let lastCryppo;
    let jwtDecodeQueue;
    let statusListStatus;
    let statusListDecodeArg;

    before(async () => {
        jwtDecodeQueue = [];
        const mod = await esmock('../dist/meeco/meeco.service.js', {
            '../dist/meeco/meeco-api.js': {
                MeecoApi: class {
                    constructor(config) {
                        this.config = config;
                        this.calls = [];
                        lastApi = this;
                    }
                    async getMe() { return this._me ?? { user: { did: 'did:example:abc', private_dek_external_id: 'DEK-EXT' } }; }
                    async getPassphraseArtefact() {
                        return { passphrase_derivation_artefact: { derivation_artefacts: 'DA', verification_artefacts: 'VA' } };
                    }
                    async getKeyEncryptionKey() { return { key_encryption_key: { serialized_key_encryption_key: 'SER-KEK' } }; }
                    async getDataEncryptionKey(id) { this.calls.push(['getDataEncryptionKey', id]); return { data_encryption_key: { serialized_data_encryption_key: 'SER-DEK' } }; }
                    async getKeyPairs(id) { this.calls.push(['getKeyPairs', id]); return { keypair: { encrypted_serialized_key: 'SER-KP' } }; }
                    async getSchema(id) { this.calls.push(['getSchema', id]); return { schema: id }; }
                    async getSchemas() { return [{ id: 1 }]; }
                    async createSchema(name, data) { this.calls.push(['createSchema', name, data]); return { created: name }; }
                    async createPresentationRequest(...a) { this.calls.push(['createPresentationRequest', ...a]); return { id: 'pr' }; }
                    async submitPresentationRequestSignature(...a) { this.calls.push(['submit', ...a]); return { id: 'signed' }; }
                    async getVPSubmissions(id) { this.calls.push(['getVPSubmissions', id]); return { submissions: [] }; }
                    async verifyVP(...a) { this.calls.push(['verifyVP', ...a]); return true; }
                    async approveVPSubmission(...a) { this.calls.push(['approve', ...a]); return { ok: true }; }
                    async getVCStatusList(url) { this.calls.push(['getVCStatusList', url]); return this._statusList; }
                },
            },
            '../dist/meeco/cryppo.js': {
                Cryppo: class {
                    constructor(p) { this.passphrase = p; lastCryppo = this; this.calls = []; }
                    async deriveMEK(da, va) { this.calls.push(['deriveMEK', da, va]); return { key: { key: { id: 'mek' } } }; }
                    async decryptKey(key, data) { this.calls.push(['decryptKey', key, data]); return { key: { bytes: Buffer.alloc(32) }, serializedKey: data }; }
                },
            },
            jsonwebtoken: {
                decode: (token) => {
                    jwtDecodeQueue.push(token);
                    if (token === 'VP') { return { vp: { verifiableCredential: ['VC-JWT'] } }; }
                    if (token === 'VC-JWT') { return { id: 'vc-decoded' }; }
                    return { decoded: token };
                },
            },
            base64url: { default: { encode: (b) => `b64:${Buffer.from(b).length}` } },
            tweetnacl: {
                default: {
                    sign: {
                        keyPair: { fromSeed: (seed) => ({ secretKey: new Uint8Array(64), seedLen: seed.length }) },
                        detached: () => new Uint8Array([1, 2, 3]),
                    },
                },
            },
            '../dist/helpers/credentials-validation/status-list.js': {
                StatusList: {
                    decode: async (arg) => {
                        statusListDecodeArg = arg;
                        return { getStatus: () => statusListStatus };
                    },
                },
            },
            '@guardian/common': {},
        });
        MeecoService = mod.MeecoService;
    });

    function service(config) {
        return new MeecoService(config ?? { baseUrl: 'https://api.meeco.test' }, 'PASSPHRASE32');
    }

    it('exports a constructible class (link sanity)', () => {
        assert.equal(typeof MeecoService, 'function');
        assert.equal(typeof service().decodeVPToken, 'function');
    });

    it('freezes its config', () => {
        const svc = service({ baseUrl: 'https://x' });
        assert.throws(() => { svc.config.baseUrl = 'y'; });
    });

    describe('getVPSubmissionRedirectUri', () => {
        it('builds an openid-vc deeplink with the request_uri', async () => {
            const svc = service({ baseUrl: 'https://api.meeco.test' });
            const out = await svc.getVPSubmissionRedirectUri('REQ-1');
            assert.equal(
                out,
                'openid-vc://?request_uri=https://api.meeco.test/oidc/presentations/requests/REQ-1/jwt'
            );
        });
    });

    describe('decodeVPToken', () => {
        it('decodes the vp token then the first verifiable credential', () => {
            jwtDecodeQueue.length = 0;
            const svc = service();
            const out = svc.decodeVPToken('VP');
            assert.deepEqual(out, { id: 'vc-decoded' });
            assert.deepEqual(jwtDecodeQueue, ['VP', 'VC-JWT']);
        });
    });

    describe('createSchema', () => {
        it('parses the schema string then forwards to the api', async () => {
            const svc = service();
            const out = await svc.createSchema('S1', '{"a":1}');
            const call = svc.meecoApi.calls.find(c => c[0] === 'createSchema');
            assert.equal(call[1], 'S1');
            assert.deepEqual(call[2], { a: 1 });
            assert.deepEqual(out, { created: 'S1' });
        });

        it('rejects on invalid JSON', async () => {
            const svc = service();
            await assert.rejects(() => svc.createSchema('S', 'not-json'));
        });
    });

    describe('getMEK', () => {
        it('derives the MEK from passphrase artefacts', async () => {
            const svc = service();
            const out = await svc.getMEK();
            assert.deepEqual(out.key.key, { id: 'mek' });
            const cryppoCall = svc.cryppo.calls.find(c => c[0] === 'deriveMEK');
            assert.deepEqual(cryppoCall.slice(1), ['DA', 'VA']);
        });
    });

    describe('getKEK', () => {
        it('decrypts the serialized KEK with the MEK key', async () => {
            const svc = service();
            const out = await svc.getKEK();
            assert.equal(out.serializedKey, 'SER-KEK');
            const decryptCall = svc.cryppo.calls.find(c => c[0] === 'decryptKey');
            assert.deepEqual(decryptCall[1], { id: 'mek' });
        });
    });

    describe('getDEK', () => {
        it('uses the private_dek_external_id from /me', async () => {
            const svc = service();
            const out = await svc.getDEK();
            const dekCall = svc.meecoApi.calls.find(c => c[0] === 'getDataEncryptionKey');
            assert.equal(dekCall[1], 'DEK-EXT');
            assert.equal(out.serializedKey, 'SER-DEK');
        });
    });

    describe('getKeyPair', () => {
        it('derives the external id as the hex of the did', async () => {
            const svc = service();
            await svc.getKeyPair();
            const kpCall = svc.meecoApi.calls.find(c => c[0] === 'getKeyPairs');
            assert.equal(kpCall[1], Buffer.from('did:example:abc').toString('hex'));
        });
    });

    describe('signPresentationRequestToken', () => {
        it('appends a base64url signature to the unsigned jwt and submits it', async () => {
            const svc = service();
            await svc.signPresentationRequestToken('REQ-9', 'UNSIGNED');
            const submitCall = svc.meecoApi.calls.find(c => c[0] === 'submit');
            assert.equal(submitCall[1], 'REQ-9');
            assert.ok(submitCall[2].startsWith('UNSIGNED.b64:'));
        });
    });

    describe('delegating methods forward to the api', () => {
        it('getMe / getSchemas / getVPSubmissions / verifyVP / approveVPSubmission', async () => {
            const svc = service();
            assert.deepEqual(await svc.getSchemas(), [{ id: 1 }]);
            assert.deepEqual(await svc.getVPSubmissions('R'), { submissions: [] });
            assert.equal(await svc.verifyVP('id', 'r', 'vp'), true);
            assert.deepEqual(await svc.approveVPSubmission('r', 's', true), { ok: true });
            assert.deepEqual(await svc.createPresentationRequest('n', 'd', 'c', 'p'), { id: 'pr' });
        });

        it('getSchema passes the schema id through', async () => {
            const svc = service();
            const out = await svc.getSchema('SCH-1');
            assert.deepEqual(out, { schema: 'SCH-1' });
        });
    });

    describe('validateCredentials', () => {
        const vc = { credentialStatus: { statusListCredential: 'https://status/list', statusListIndex: 3 } };

        it('returns failure when no encoded list is present', async () => {
            const svc = service();
            svc.meecoApi._statusList = { vc: { credentialSubject: {} } };
            const out = await svc.validateCredentials(vc);
            assert.equal(out.success, false);
            assert.match(out.message, /No encoded list/);
        });

        it('returns revoked failure when getStatus is false', async () => {
            const svc = service();
            svc.meecoApi._statusList = { vc: { credentialSubject: { encodedList: 'EL' } } };
            statusListStatus = false;
            const out = await svc.validateCredentials(vc);
            assert.equal(out.success, false);
            assert.match(out.message, /revoked/);
            assert.deepEqual(statusListDecodeArg, { encodedList: 'EL' });
        });

        it('returns success when the status bit is set (not revoked)', async () => {
            const svc = service();
            svc.meecoApi._statusList = { vc: { credentialSubject: { encodedList: 'EL' } } };
            statusListStatus = true;
            const out = await svc.validateCredentials(vc);
            assert.equal(out.success, true);
            assert.match(out.message, /Valid credentials/);
        });
    });
});
