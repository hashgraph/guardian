const { expect, assert } = require('chai');

const {
    DIDMessage
} = require('../../../../dist/hedera-modules/message/did-message');

const {
    DIDDocument
} = require('../../../../dist/hedera-modules/vcjs/did-document');

const { MessageStatus } = require('../../../../dist/hedera-modules/message/message');
const { MessageType } = require('../../../../dist/hedera-modules/message/message-type');
const { MessageAction } = require('../../../../dist/hedera-modules/message/message-action');

describe('DIDMessage', function () {
    const testDidMessage = {
        id: "testId",
        status: MessageStatus.ISSUE,
        type: MessageType.DIDDocument,
        action: MessageAction.CreateDID,
        did: "testDid",
        cid: "testCid",
        url: "ipfs://testCid"
    };
    const testDocumentObject = JSON.stringify({
        name: "testDocumentName"
    });

    it('Test DIDMessage', async function () {
        assert.throws(DIDMessage.fromMessage);
        assert.throws(DIDMessage.fromMessageObject);

        const testDidDocument = await DIDDocument.create();
        const didMessage = new DIDMessage(MessageAction.CreateDID);
        assert.exists(didMessage);
        didMessage.setDocument(testDidDocument);
        assert.deepEqual(didMessage.getDocument(), testDidDocument.getDocument());
        assert.equal((await didMessage.toDocuments()).toString(), JSON.stringify(testDidDocument.getDocument()))
        assert.isTrue(didMessage.validate())

        didMessage.loadDocuments([testDocumentObject]);
        assert.exists(didMessage.toDocuments());

        const didMessageByTestMessage = DIDMessage.fromMessageObject(testDidMessage);
        assert.exists(didMessageByTestMessage);
        assert.deepEqual(didMessageByTestMessage.getUrl(), { cid: testDidMessage.cid, url: testDidMessage.url });
        assert.exists(didMessageByTestMessage.toMessageObject());

        const didMessageByTestJson = DIDMessage.fromMessage(JSON.stringify(testDidMessage));
        assert.exists(didMessageByTestJson);
        assert.deepEqual(didMessageByTestJson.getUrl(), { cid: testDidMessage.cid, url: testDidMessage.url });
        assert.exists(didMessageByTestMessage.toMessageObject());
    });
});