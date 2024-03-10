import { assert } from 'chai';

import { VPMessage } from '../../../../dist/hedera-modules/message/vp-message.js';
import { VpDocument } from '../../../../dist/hedera-modules/vcjs/vp-document.js';

import { MessageStatus } from '../../../../dist/hedera-modules/message/message.js';
import { MessageType } from '../../../../dist/hedera-modules/message/message-type.js';
import { MessageAction } from '../../../../dist/hedera-modules/message/message-action.js';
import { UrlType } from '../../../../dist/hedera-modules/message/url.interface.js';

import { vp_document } from '../../dump/vp_document.mjs';

describe('VPMessage', function () {

    const testVPMessage = {
        id: "testId",
        status: MessageStatus.ISSUE,
        type: MessageType.VPDocumnet,
        action: MessageAction.CreateVP,
        issuer: "testIssuer",
        cid: "testCID",
        url: "ipfs://testCID",
        relationships: ["testRelation1", "testRelation2", "testRelation3"]
    };
    const testDocumentObject = JSON.stringify({
        name: "testDocumentName"
    });

    it('Test VPMessage', async function () {
        assert.throws(VPMessage.fromMessageObject);
        assert.throws(VPMessage.fromMessage);

        const vpMessage = new VPMessage(MessageAction.CreateVP);
        assert.exists(vpMessage);

        const testVpDocument = VpDocument.fromJsonTree(vp_document[0].document);
        vpMessage.setDocument(testVpDocument);
        assert.deepEqual(vpMessage.getDocument(), testVpDocument.getDocument());
        assert.exists(vpMessage.toDocuments());

        vpMessage.loadDocuments([testDocumentObject]);
        assert.exists(vpMessage.toDocuments());
        assert.isTrue(vpMessage.validate());

        const vpMessageByTestMessage = VPMessage.fromMessageObject(testVPMessage);
        assert.exists(vpMessageByTestMessage);
        assert.deepEqual(vpMessageByTestMessage.getUrl(), {
            cid: testVPMessage.cid, url: testVPMessage.url
        });
        assert.equal(vpMessageByTestMessage.getDocumentUrl(UrlType.cid), testVPMessage.cid);
        assert.equal(vpMessageByTestMessage.getDocumentUrl(UrlType.url), testVPMessage.url);
        assert.exists(vpMessageByTestMessage.toMessageObject());

        const vpMessageByTestJSON = VPMessage.fromMessage(JSON.stringify(testVPMessage));
        assert.exists(vpMessageByTestJSON);
        assert.deepEqual(vpMessageByTestJSON.getUrl(), {
            cid: testVPMessage.cid, url: testVPMessage.url
        });
        assert.equal(vpMessageByTestJSON.getDocumentUrl(UrlType.cid), testVPMessage.cid);
        assert.equal(vpMessageByTestJSON.getDocumentUrl(UrlType.url), testVPMessage.url);
        assert.exists(vpMessageByTestJSON.toMessageObject());
    });
});
