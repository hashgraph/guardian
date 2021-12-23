const {
    HcsVcDocument, VcSubject, HcsVpDocument
} = require('../../../dist/index');

const { FileId } = require('@hashgraph/sdk');
const { TimestampUtils } = require('@hashgraph/did-sdk-js');
const { expect, assert } = require('chai');
const network = 'testnet';

describe('HcsVpDocument', function () {
    let id, date, did, vcSubject, proof, data, vc;

    before(async function () {
        data = {
            date: 1,
            amount: 0,
            period: 0,
            policyId: '6166be37d739af60e05258bf',
            accountId: '0.0.2770197',
        }
        id = 'f5630d9a-3c27-4ccc-a371-f4d30c2da4e1';
        date = TimestampUtils.fromJson('2021-10-13T11:21:47.894Z');
        did = 'did:hedera:testnet:HTHJ72yoyTjipbHX765xCXM2kVcvREPg8JxeXgnDLzRA;hedera:testnet:fid=0.0.2770224';
        vcSubject = new VcSubject('MRV', data);
        const schemaContext = ['https://localhost/schema'];
        for (let i = 0; i < schemaContext.length; i++) {
            const element = schemaContext[i];
            vcSubject.addContext(element);
        }
        proof = {
            'type': 'Ed25519Signature2018',
            'created': '2021-10-13T11:21:47Z',
            'verificationMethod': 'did:hedera:testnet:HTHJ72yoyTjipbHX765xCXM2kVcvREPg8JxeXgnDLzRA;hedera:testnet:fid=0.0.2770224#did-root-key',
            'proofPurpose': 'assertionMethod',
            'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..cIuQVujCbCfdv7N2pdK4TcP94ZcFiG2eJ1MKDTGvfsyPupxBc3ajHBI14rmRCDKFc4BD6bLmFeKvotewyw45Ag'
        }

        vc = new HcsVcDocument();
        vc.setId(id);
        vc.setIssuanceDate(date);
        vc.addType(vcSubject.getType());
        vc.addCredentialSubject(vcSubject);
        vc.setIssuer(did);
        vc.setProof(proof);

    });

    it('Test HcsVpDocumentConstruction', async function () {
        const vp = new HcsVpDocument();
        vp.setId(id);
        vp.addVerifiableCredential(vc);

        const root = vp.toJsonTree();
        assert.deepEqual(root, {
            'id': 'f5630d9a-3c27-4ccc-a371-f4d30c2da4e1',
            'type': [
                'VerifiablePresentation'
            ],
            '@context': [
                'https://www.w3.org/2018/credentials/v1'
            ],
            'verifiableCredential': [
                {
                    '@context': [
                        'https://www.w3.org/2018/credentials/v1'
                    ],
                    'id': 'f5630d9a-3c27-4ccc-a371-f4d30c2da4e1',
                    'type': [
                        'VerifiableCredential',
                        'MRV'
                    ],
                    'credentialSubject': [
                        {
                            '@context': [
                                'https://localhost/schema'
                            ],
                            'type': 'MRV',
                            'date': 1,
                            'amount': 0,
                            'period': 0,
                            'policyId': '6166be37d739af60e05258bf',
                            'accountId': '0.0.2770197'
                        }
                    ],
                    'issuer': 'did:hedera:testnet:HTHJ72yoyTjipbHX765xCXM2kVcvREPg8JxeXgnDLzRA;hedera:testnet:fid=0.0.2770224',
                    'issuanceDate': '2021-10-13T11:21:47.894Z',
                    'proof': {
                        'type': 'Ed25519Signature2018',
                        'created': '2021-10-13T11:21:47Z',
                        'verificationMethod': 'did:hedera:testnet:HTHJ72yoyTjipbHX765xCXM2kVcvREPg8JxeXgnDLzRA;hedera:testnet:fid=0.0.2770224#did-root-key',
                        'proofPurpose': 'assertionMethod',
                        'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..cIuQVujCbCfdv7N2pdK4TcP94ZcFiG2eJ1MKDTGvfsyPupxBc3ajHBI14rmRCDKFc4BD6bLmFeKvotewyw45Ag'
                    }
                }
            ]
        });
    });

    it('Test HcsVpDocumentConversion', async function () {
        const vp = new HcsVpDocument();
        vp.setId(id);
        vp.addVerifiableCredential(vc);

        const json = vp.toJSON();
        const newVP = HcsVpDocument.fromJson(json);

        assert.equal(vp.getId(), newVP.getId());
        assert.deepEqual(vp.getType(), newVP.getType());
        assert.deepEqual(vp.getVerifiableCredential(), newVP.getVerifiableCredential());

        const root = vp.toJsonTree();
        const newVP2 = HcsVpDocument.fromJsonTree(root);

        assert.equal(vp.getId(), newVP2.getId());
        assert.deepEqual(vp.getType(), newVP2.getType());
        assert.deepEqual(vp.getVerifiableCredential(), newVP2.getVerifiableCredential());
    });

    it('Test CredentialHash', async function () {
        const vp = new HcsVpDocument();
        vp.setId(id);
        vp.addVerifiableCredential(vc);

        let credentialHash = vp.toCredentialHash();
        assert.equal(credentialHash, '9jNHkRY3VtjSe61bMknZVNbzysyc8pnvh6KQkpvRUSua');

        // Recalculation should give the same value
        assert.equal(credentialHash, vp.toCredentialHash());

        // Hash shall not change if we don't change anything in the document
        vp.addVerifiableCredential(vc);
        assert.notEqual(credentialHash, vp.toCredentialHash());

        credentialHash = vp.toCredentialHash();

        vc.setId('');
        assert.notEqual(credentialHash, vp.toCredentialHash());
    });
});
