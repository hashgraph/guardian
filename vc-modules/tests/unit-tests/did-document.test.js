const {
    HcsDidDocument
} = require("../../dist/did-document");
const {FileId} = require("@hashgraph/sdk");
const {DidDocumentBase, HcsDidRootKey, HcsDid} = require("did-sdk-js");
const {expect, assert} = require('chai');
const network = 'testnet';

describe("HcsDidDocument", function() {
    it('Test fromDocumentBase', async function() {
        const privateKey = HcsDid.generateDidRootKey();
        const did = new HcsDid(network, privateKey.publicKey, FileId.fromString('0.0.1'));
        const doc = did.generateDidDocument();
        const hcsDidDoc = HcsDidDocument.fromDocumentBase(doc);

        const didJson = hcsDidDoc.toJSON();
        const root = JSON.parse(didJson);

        const didJson2 = doc.toJSON();
        const root2 = JSON.parse(didJson2);

        assert.deepEqual(root, root2);
    });

    it('Test fromJson', async function() {
        const privateKey = HcsDid.generateDidRootKey();
        const did = new HcsDid(network, privateKey.publicKey, FileId.fromString('0.0.1'));
        const doc = did.generateDidDocument();
        const didJson2 = doc.toJSON();
        const root2 = JSON.parse(didJson2);


        const hcsDidDoc = HcsDidDocument.fromJson(didJson2);
        const didJson = hcsDidDoc.toJSON();
        const root = JSON.parse(didJson);

        assert.deepEqual(root, root2);
    });

    it('Test getDidDocument', async function() {
        const privateKey = HcsDid.generateDidRootKey();
        const did = new HcsDid(network, privateKey.publicKey, FileId.fromString('0.0.1'));
        const doc = did.generateDidDocument();
        const hcsDidDoc = HcsDidDocument.fromDocumentBase(doc);
        const document = hcsDidDoc.getDidDocument();

        expect(document).to.have.keys([
            '@context',
            'id',
            'verificationMethod',
            'authentication',
            'assertionMethod'
        ]);
        assert.deepEqual(document['@context'], [
            'https://www.w3.org/ns/did/v1',
            'https://ns.did.ai/transmute/v1'
        ]);
        assert.equal(document['id'], did.toDid());
        assert.deepEqual(document['verificationMethod'], [doc.getDidRootKey().toJsonTree()]);
        assert.equal(document['authentication'], doc.getDidRootKey().getId());
        assert.deepEqual(document['assertionMethod'], [HcsDidRootKey.DID_ROOT_KEY_NAME]);
    });
});