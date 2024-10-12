import { assert } from 'chai';

import { VCMessage } from '../../../../dist/hedera-modules/message/vc-message.js';
import { VcDocument } from '../../../../dist/hedera-modules/vcjs/vc-document.js';

import { MessageStatus } from '../../../../dist/hedera-modules/message/message.js';
import { MessageType } from '../../../../dist/hedera-modules/message/message-type.js';
import { MessageAction } from '../../../../dist/hedera-modules/message/message-action.js';
import { UrlType } from '../../../../dist/hedera-modules/message/url.interface.js';

import { vc_document } from '../../dump/vc_document.mjs';

describe('VCMessage', function () {

    const testVCMessage = {
        id: "testId",
        status: MessageStatus.ISSUE,
        type: MessageType.VCDocumnet,
        action: MessageAction.CreateVC,
        issuer: "testIssuer",
        cid: "testCID",
        url: "ipfs://testCID",
        relationships: ["testRelation1", "testRelation2", "testRelation3"]
    };
    const testDocumentObject = JSON.stringify({
        name: "testDocumentName"
    });

    it('Test VCMessage', async function () {
        assert.throws(VCMessage.fromMessageObject);
        assert.throws(VCMessage.fromMessage);

        const vcMessage = new VCMessage(MessageAction.CreateVC);
        assert.exists(vcMessage);

        const testVcDocument = VcDocument.fromJsonTree(vc_document[0].document);
        vcMessage.setDocument(testVcDocument);
        assert.deepEqual(vcMessage.getDocument(), testVcDocument.getDocument());
        assert.exists(vcMessage.toDocuments());

        vcMessage.loadDocuments([testDocumentObject]);
        assert.exists(vcMessage.toDocuments());
        assert.isTrue(vcMessage.validate());

        const vcMessageByTestMessage = VCMessage.fromMessageObject(testVCMessage);
        assert.exists(vcMessageByTestMessage);
        assert.deepEqual(vcMessageByTestMessage.getUrl(), {
            cid: testVCMessage.cid, url: testVCMessage.url
        });
        assert.equal(vcMessageByTestMessage.getDocumentUrl(UrlType.cid), testVCMessage.cid);
        assert.equal(vcMessageByTestMessage.getDocumentUrl(UrlType.url), testVCMessage.url);
        assert.exists(vcMessageByTestMessage.toMessageObject());

        const vcMessageByTestJSON = VCMessage.fromMessage(JSON.stringify(testVCMessage));
        assert.exists(vcMessageByTestJSON);
        assert.deepEqual(vcMessageByTestJSON.getUrl(), {
            cid: testVCMessage.cid, url: testVCMessage.url
        });
        assert.equal(vcMessageByTestJSON.getDocumentUrl(UrlType.cid), testVCMessage.cid);
        assert.equal(vcMessageByTestJSON.getDocumentUrl(UrlType.url), testVCMessage.url);
        assert.exists(vcMessageByTestJSON.toMessageObject());
    });
});
