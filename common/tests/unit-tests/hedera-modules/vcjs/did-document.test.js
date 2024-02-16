const { expect, assert } = require('chai');

const {
    DidRootKey,
    DIDDocument,
    DidDocumentBase
} = require('../../../../dist/hedera-modules/vcjs/did-document');

const { PrivateKey } = require("@hashgraph/sdk");
const { did_document } = require('../../dump/did_document');

describe('DidDocuments', function () {
    const topicId = "0.0.34195177";
    const did = `did:hedera:testnet:4TxrFRUL3zxz5tMb9ioZEzhDq6h3QBijWAFbPWC7mXFv;hedera:testnet:tid=${topicId}`;
    const newPrivateKey = PrivateKey.generate();

    it('Test DidRootKey', async function () {
        assert.throw(DidRootKey.createByPublicKey);
        assert.throw(DidRootKey.createByPublicKey.bind(did));
        assert.throw(DidRootKey.createByPrivateKey);
        assert.throw(DidRootKey.createByPrivateKey.bind(did));
        assert.throw(DidRootKey.create);
        assert.throw(DidRootKey.fromJsonTree);
        assert.throw(DidRootKey.fromJson);

        const didRootKeyWithoutKeys = DidRootKey.create(did);
        assert.exists(didRootKeyWithoutKeys);
        assert.equal(didRootKeyWithoutKeys.getMethod(), DidRootKey.DID_ROOT_KEY_NAME);
        assert.equal(didRootKeyWithoutKeys.getId(), did + DidRootKey.DID_ROOT_KEY_NAME);
        assert.equal(didRootKeyWithoutKeys.getType(), DidRootKey.DID_ROOT_KEY_TYPE);
        assert.equal(didRootKeyWithoutKeys.getController(), did);
        assert.isNull(didRootKeyWithoutKeys.getPublicKey());
        assert.isNull(didRootKeyWithoutKeys.getPublicKeyBase58())
        assert.isNull(didRootKeyWithoutKeys.getPrivateKey());
        assert.isNull(didRootKeyWithoutKeys.getPrivateKeyBase58());

        const didRootKeyCreatedByPublicKey = DidRootKey.createByPublicKey(did, newPrivateKey.publicKey);
        assert.exists(didRootKeyCreatedByPublicKey);
        assert.equal(didRootKeyCreatedByPublicKey.getId(), did + DidRootKey.DID_ROOT_KEY_NAME);
        assert.equal(didRootKeyCreatedByPublicKey.getType(), DidRootKey.DID_ROOT_KEY_TYPE);
        assert.equal(didRootKeyCreatedByPublicKey.getController(), did);
        assert.deepEqual(didRootKeyCreatedByPublicKey.getPublicKey(), newPrivateKey.publicKey);
        assert.isString(didRootKeyCreatedByPublicKey.getPublicKeyBase58())
        assert.isNull(didRootKeyCreatedByPublicKey.getPrivateKey());
        assert.isNull(didRootKeyCreatedByPublicKey.getPrivateKeyBase58());

        const didRootKeyCreatedByPrivateKey = DidRootKey.createByPrivateKey(did, newPrivateKey);
        assert.exists(didRootKeyCreatedByPrivateKey);
        assert.equal(didRootKeyCreatedByPrivateKey.getId(), did + DidRootKey.DID_ROOT_KEY_NAME);
        assert.equal(didRootKeyCreatedByPrivateKey.getType(), DidRootKey.DID_ROOT_KEY_TYPE);
        assert.equal(didRootKeyCreatedByPrivateKey.getController(), did);
        assert.deepEqual(didRootKeyCreatedByPrivateKey.getPublicKey(), newPrivateKey.publicKey);
        assert.isString(didRootKeyCreatedByPrivateKey.getPublicKeyBase58())
        assert.deepEqual(didRootKeyCreatedByPrivateKey.getPrivateKey(), newPrivateKey);
        assert.isString(didRootKeyCreatedByPrivateKey.getPrivateKeyBase58());

        const verificationMethod = did_document[0].document.verificationMethod[0];
        const didRootKeyFromJsonTree = DidRootKey.fromJsonTree(verificationMethod);
        assert.exists(didRootKeyFromJsonTree);
        assert.deepEqual(didRootKeyFromJsonTree.getVerificationMethod(), verificationMethod);
        assert.hasAllKeys(didRootKeyFromJsonTree.getPrivateVerificationMethod(), ['id', 'type', 'controller', 'publicKeyBase58', 'privateKeyBase58']);
        assert.deepEqual(didRootKeyFromJsonTree.toJsonTree(), verificationMethod);

        const verificationMethodJson = JSON.stringify(verificationMethod);
        const didRootKeyFromJson = DidRootKey.fromJson(verificationMethodJson);
        assert.deepEqual(didRootKeyFromJson.getVerificationMethod(), verificationMethod);
        assert.hasAllKeys(didRootKeyFromJson.getPrivateVerificationMethod(), ['id', 'type', 'controller', 'publicKeyBase58', 'privateKeyBase58']);
        assert.equal(didRootKeyFromJson.toJson(), verificationMethodJson);
    });

    it('Test DidDocumentBase', async function () {
        assert.isFunction(DidDocumentBase.createByPrivateKey);
        assert.isFunction(DidDocumentBase.createByPrivateKey.bind(did));
        assert.isFunction(DidDocumentBase.createByPublicKey);
        assert.isFunction(DidDocumentBase.createByPublicKey.bind(did));

        assert.equal(new DidDocumentBase().getContext(), DidDocumentBase.DID_DOCUMENT_CONTEXT);

        const didDocumentBaseCreatedByPrivateKey = await DidDocumentBase.createByPrivateKey(did, newPrivateKey);
        assert.isObject(didDocumentBaseCreatedByPrivateKey);
        assert.isFunction(didDocumentBaseCreatedByPrivateKey.getPrivateDidDocument);
        assert.hasAllKeys(didDocumentBaseCreatedByPrivateKey.getPrivateDidDocument(), [
            DidDocumentBase.CONTEXT,
            DidDocumentBase.ID,
            DidDocumentBase.VERIFICATION_METHOD,
            DidDocumentBase.AUTHENTICATION,
            DidDocumentBase.ASSERTION_METHOD
        ]);
        assert.equal(didDocumentBaseCreatedByPrivateKey.getId(), did);

        const didDocumentBaseCreatedByPublicKey = DidDocumentBase.createByPublicKey(did, newPrivateKey.publicKey);
        assert.exists(didDocumentBaseCreatedByPublicKey);
        assert.hasAllKeys(didDocumentBaseCreatedByPublicKey.getDidDocument(), [
            DidDocumentBase.CONTEXT,
            DidDocumentBase.ID,
            DidDocumentBase.VERIFICATION_METHOD,
            DidDocumentBase.AUTHENTICATION,
            DidDocumentBase.ASSERTION_METHOD
        ]);
        assert.equal(didDocumentBaseCreatedByPublicKey.getId(), did);
    });

    it('Test DIDDocument', async function () {
        assert.throw(DIDDocument.from);
        assert.throw(DIDDocument.from.bind(did));

        const createdDidDocument = await DIDDocument.create(newPrivateKey, topicId);
        assert.exists(createdDidDocument);
        assert.equal(createdDidDocument.getMethod(), DIDDocument.HEDERA_HCS);
        assert.isString(createdDidDocument.buildDid());
        assert.deepEqual(createdDidDocument.getPublicKey(), newPrivateKey.publicKey);
        assert.isString(createdDidDocument.getPrivateKeyString());
        assert.deepEqual(createdDidDocument.getPrivateKey(), newPrivateKey);
        assert.isString(createdDidDocument.getPublicKeyString());
        assert.equal(createdDidDocument.getDidTopicId(), topicId);
        assert.isString(createdDidDocument.toString());
        assert.isString(createdDidDocument.getDid());
        assert.exists(createdDidDocument.getDocument());

        // const createdDidDocumentFromTestDid = DIDDocument.from(createdDidDocument.buildDid(), createdDidDocument.getPublicKeyString());
        // assert.exists(createdDidDocumentFromTestDid);
        // assert.equal(createdDidDocumentFromTestDid.getMethod(), DIDDocument.HEDERA_HCS);
        // assert.equal(createdDidDocumentFromTestDid.getPublicKeyString(), createdDidDocument.getPublicKeyString());
        // assert.deepEqual(createdDidDocumentFromTestDid.getDidTopicId(), createdDidDocument.getDidTopicId());
        // assert.equal(createdDidDocumentFromTestDid.toString(), createdDidDocument.toString());
        // assert.equal(createdDidDocumentFromTestDid.getDid(), createdDidDocument.getDid());
        // assert.exists(createdDidDocumentFromTestDid.getDocument());
    });
});