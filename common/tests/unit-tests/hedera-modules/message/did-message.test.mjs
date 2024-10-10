import { assert } from 'chai';

import { DIDMessage } from '../../../../dist/hedera-modules/message/did-message.js';
import { DIDDocument } from '../../../../dist/hedera-modules/vcjs/did-document.js';

import { MessageStatus } from '../../../../dist/hedera-modules/message/message.js';
import { MessageType } from '../../../../dist/hedera-modules/message/message-type.js';
import { MessageAction } from '../../../../dist/hedera-modules/message/message-action.js';

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
