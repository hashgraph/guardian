import assert from 'node:assert/strict';
import { VCJS } from '../../../../dist/vcjs/vcjs.js';
import { VcHelper } from '../../../../dist/vc-helper.js';
import { TimestampUtils } from '../../../../dist/timestamp-utils.js';
import { SchemaEntity, SignatureType } from '@guardian/interfaces';

describe('common credential preparation before signing', () => {
    let savedNow;
    let savedSchema;

    beforeEach(() => {
        savedNow = TimestampUtils.now;
        savedSchema = VcHelper.getSchemaByContext;
        TimestampUtils.now = () => TimestampUtils.fromJson('2026-10-24T00:00:00.000Z');
    });

    afterEach(() => {
        TimestampUtils.now = savedNow;
        VcHelper.getSchemaByContext = savedSchema;
    });

    const issuer = { getDid: () => 'did:issuer' };
    const subject = () => ({ '@context': ['ctx:subject'], type: 'Plot', area: 7, location: { lat: 1 } });
    const options = {
        uuid: 'urn:uuid:fixed-credential',
        group: { groupId: 'g1', type: 'Group', context: 'ctx:group' },
        evidenceContext: 'ctx:evidence',
        evidence: [{ type: ['Evidence'], dataType: 'text/plain', data: 'proof-of-area' }]
    };

    const simulateSignature = (helper) => {
        const calls = [];
        helper.createSuiteByMethod = async () => { calls.push('suite'); return {}; };
        helper.issue = async (vc) => { calls.push('sign'); vc.setProof({ type: 'TestSignature' }); return vc; };
        helper.issuePresentation = async (vp) => { calls.push('signVP'); return vp; };
        return calls;
    };

    it('uses the same envelope, group, evidence and hash for signed and unsigned VC preparation', async () => {
        const helper = new VCJS();
        const calls = simulateSignature(helper);
        const signed = await helper.createVerifiableCredential(subject(), issuer, SignatureType.Ed25519Signature2018, options);
        assert.deepEqual(calls, ['suite', 'sign']);
        calls.length = 0;
        const preview = await helper.createUnsignedCredential(subject(), issuer.getDid(), SignatureType.Ed25519Signature2018, options);
        const expected = signed.toJsonTree();
        delete expected.proof;
        assert.deepEqual(preview.toJsonTree(), expected);
        assert.equal(preview.toCredentialHash(), signed.toCredentialHash());
        assert.deepEqual(preview.toJsonTree().evidence, options.evidence);
        assert.deepEqual(calls, []);
    });

    it('does not require a DID private document or a signing suite for unsigned preparation', async () => {
        const helper = new VCJS();
        helper.createSuiteByMethod = async () => { throw new Error('must not load signing material'); };
        helper.issue = async () => { throw new Error('must not sign'); };
        const vc = await helper.createUnsignedCredential(subject(), 'did:remote', SignatureType.Ed25519Signature2018, options);
        assert.equal(vc.getIssuerDid(), 'did:remote');
        assert.equal(vc.toJsonTree().proof, undefined);
        assert.equal(vc.toJsonTree().credentialSubject[0].area, 7);
    });

    it('keeps schema-selected EVC subject preparation on both paths', async () => {
        VcHelper.getSchemaByContext = async () => ({ entity: SchemaEntity.EVC });
        const helper = new VcHelper();
        simulateSignature(helper);
        let sequence = 0;
        helper.generateUUID = (config) => config?.uuid ?? `urn:uuid:node-${++sequence}`;
        const signed = await helper.createVerifiableCredential(subject(), issuer, null, options);
        sequence = 0;
        const preview = await helper.createUnsignedCredential(subject(), issuer.getDid(), null, options);
        const expected = signed.toJsonTree();
        delete expected.proof;
        assert.deepEqual(preview.toJsonTree(), expected);
        assert.equal(preview.toJsonTree().credentialSubject[0].location.id, 'urn:uuid:node-2');
        assert.equal(subject().location.id, undefined);
    });

    it('shares VP construction and retains its input credential data without signing', async () => {
        const helper = new VCJS();
        const calls = simulateSignature(helper);
        const vc = await helper.createUnsignedCredential(subject(), issuer.getDid(), SignatureType.Ed25519Signature2018, options);
        const signed = await helper.createVerifiablePresentation([vc], issuer, null, { uuid: 'urn:uuid:vp' });
        assert.deepEqual(calls, ['suite', 'signVP']);
        calls.length = 0;
        const preview = await helper.createUnsignedPresentation([vc], { uuid: 'urn:uuid:vp' });
        assert.deepEqual(preview.toJsonTree(), signed.toJsonTree());
        assert.deepEqual(calls, []);
    });

    it('prepares signed BBS inputs for VP while retaining newly unsigned inputs', async () => {
        VcHelper.getSchemaByContext = async () => null;
        const helper = new VcHelper();
        const unsigned = await helper.createUnsignedCredential(subject(), issuer.getDid(), null, options);
        const signed = await helper.createUnsignedCredential({ ...subject(), area: 9 }, issuer.getDid(), null, options);
        signed.setProof({ type: SignatureType.BbsBlsSignature2020 });
        const visited = [];
        helper.prepareVCs = async (vcs) => { visited.push(...vcs); return vcs; };
        const vp = await helper.createUnsignedPresentation([signed, unsigned], { uuid: 'urn:uuid:vp' });
        assert.deepEqual(visited, [signed]);
        assert.equal(vp.toJsonTree().verifiableCredential.length, 2);
        assert.equal(vp.toJsonTree().verifiableCredential[1].credentialSubject[0].area, 7);
    });
});
