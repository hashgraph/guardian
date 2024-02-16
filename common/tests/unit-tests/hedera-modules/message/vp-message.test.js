const { expect, assert } = require('chai');

const {
    VPMessage
} = require('../../../../dist/hedera-modules/message/vp-message');
const {
    VpDocument
} = require('../../../../dist/hedera-modules/vcjs/vp-document');
const { MessageStatus } = require('../../../../dist/hedera-modules/message/message');
const { MessageType } = require('../../../../dist/hedera-modules/message/message-type');
const { MessageAction } = require('../../../../dist/hedera-modules/message/message-action');
const { UrlType } = require('../../../../dist/hedera-modules/message/url.interface');
const { vp_document } = require('../../dump/vp_document');

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