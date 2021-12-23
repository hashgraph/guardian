const {
    HcsVcDocument,
    VcSubject
} = require('../../../dist/index');

const { FileId } = require('@hashgraph/sdk');
const { TimestampUtils } = require('@hashgraph/did-sdk-js');
const { expect, assert } = require('chai');
const network = 'testnet';

describe('HcsVcDocument', function () {
    let id, date, did, vcSubject, proof, data;

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
    });

    it('Test VcDocumentConstruction', async function () {
        const vc = new HcsVcDocument();
        vc.setId(id);
        vc.setIssuanceDate(date);
        vc.addType(vcSubject.getType());
        vc.addCredentialSubject(vcSubject);
        vc.setIssuer(did);
        vc.setProof(proof);

        assert.equal(vc.getId(), id);
        assert.deepEqual(vc.getType(), ['VerifiableCredential', 'MRV']);
        assert.deepEqual(vc.getCredentialSubject(), [vcSubject]);
        assert.deepEqual(vc.getIssuer(), { id: did, name: null });
        assert.deepEqual(vc.getIssuanceDate(), date);
        assert.deepEqual(vc.getProof(), proof);
    });


    it('Test VcJsonConversion', async function () {
        const vc = new HcsVcDocument();
        vc.setId(id);
        vc.setIssuanceDate(date);
        vc.addType(vcSubject.getType());
        vc.addCredentialSubject(vcSubject);
        vc.setIssuer(did);
        vc.setProof(proof);

        const json = vc.toJSON();
        const newVC = HcsVcDocument.fromJson(json, VcSubject);

        assert.equal(vc.getId(), newVC.getId());
        assert.deepEqual(vc.getType(), newVC.getType());
        assert.deepEqual(vc.getCredentialSubject(), newVC.getCredentialSubject());
        assert.deepEqual(vc.getIssuer(), newVC.getIssuer());
        assert.deepEqual(vc.getIssuanceDate(), newVC.getIssuanceDate());
        assert.deepEqual(vc.getProof(), newVC.getProof());

        const root = vc.toJsonTree();
        const newVC2 = HcsVcDocument.fromJsonTree(root, null, VcSubject);

        assert.equal(vc.getId(), newVC2.getId());
        assert.deepEqual(vc.getType(), newVC2.getType());
        assert.deepEqual(vc.getCredentialSubject(), newVC2.getCredentialSubject());
        assert.deepEqual(vc.getIssuer(), newVC2.getIssuer());
        assert.deepEqual(vc.getIssuanceDate(), newVC2.getIssuanceDate());
        assert.deepEqual(vc.getProof(), newVC2.getProof());

        assert.deepEqual(root, {
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
        });
    });

    it('Test CredentialHash', async function () {
        const vc = new HcsVcDocument();
        vc.setId(id);
        vc.setIssuanceDate(date);
        vc.addType(vcSubject.getType());
        vc.addCredentialSubject(vcSubject);
        vc.setIssuer(did);
        vc.setProof(proof);

        const credentialHash = vc.toCredentialHash();
        assert.equal(credentialHash, 'BavQZg17SeBfmcSXD4dtgP8XJ8pveXcXZtBSn8Gie9fT');

        // Recalculation should give the same value
        assert.equal(credentialHash, vc.toCredentialHash());

        // Hash shall not change if we don't change anything in the document
        vc.addCredentialSubject(vcSubject);
        assert.equal(credentialHash, vc.toCredentialHash());

        vc.setId('');
        assert.notEqual(credentialHash, vc.toCredentialHash());
    });
});
