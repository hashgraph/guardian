import { expect, assert } from 'chai';

import { SchemaMessage } from '../../../../dist/hedera-modules/message/schema-message.js';

import { MessageStatus } from '../../../../dist/hedera-modules/message/message.js';
import { MessageType } from '../../../../dist/hedera-modules/message/message-type.js';
import { MessageAction } from '../../../../dist/hedera-modules/message/message-action.js';
import { UrlType } from '../../../../dist/hedera-modules/message/url.interface.js';

describe('SchemaMessage', function () {

    const testSchemaMessage = {
        id: "testId",
        status: MessageStatus.ISSUE,
        type: MessageType.Schema,
        action: MessageAction.CreateSchema,
        name: "testName",
        description: "testDescription",
        entity: "testEntity",
        owner: "testOwner",
        uuid: "testUUID",
        version: "testVersion",
        document_cid: "testDocumentCID",
        document_url: "testDocumentURL",
        context_cid: "testContextCID",
        context_url: "testContextURL"
    };
    const testDocument = "testDocument";
    const testContext = "testContext";
    const testDocumentObject = JSON.stringify({
        name: "testDocumentName"
    });

    it('Test SchemaMessage', async function () {
        assert.throws(SchemaMessage.fromMessageObject);
        assert.throws(SchemaMessage.fromMessage);

        const schemaMessage = new SchemaMessage(MessageAction.CreateSchema);
        assert.exists(schemaMessage);

        schemaMessage.setDocument({ ...testSchemaMessage, document: testDocument, context: testContext});
        assert.equal(schemaMessage.getDocument(), testDocument);
        assert.equal(schemaMessage.getContext(), testContext);
        assert.exists(schemaMessage.toDocuments());
        assert.isTrue(schemaMessage.validate());

        schemaMessage.loadDocuments([testDocumentObject]);
        assert.exists(schemaMessage.toDocuments());

        const schemaMessageByTestMessage = SchemaMessage.fromMessageObject(testSchemaMessage);
        assert.exists(schemaMessageByTestMessage);
        assert.deepEqual(schemaMessageByTestMessage.getUrl(), [{
            cid: testSchemaMessage.document_cid, url: testSchemaMessage.document_url
        }, {
            cid: testSchemaMessage.context_cid, url: testSchemaMessage.context_url
        }]);
        assert.equal(schemaMessageByTestMessage.getDocumentUrl(UrlType.cid), testSchemaMessage.document_cid);
        assert.equal(schemaMessageByTestMessage.getDocumentUrl(UrlType.url), testSchemaMessage.document_url);
        assert.exists(schemaMessageByTestMessage.toMessageObject());

        const schemaMessageByTestJSON = SchemaMessage.fromMessage(JSON.stringify(testSchemaMessage));
        assert.exists(schemaMessageByTestJSON);
        assert.deepEqual(schemaMessageByTestJSON.getUrl(), [{
            cid: testSchemaMessage.document_cid, url: testSchemaMessage.document_url
        }, {
            cid: testSchemaMessage.context_cid, url: testSchemaMessage.context_url
        }]);
        assert.equal(schemaMessageByTestJSON.getDocumentUrl(UrlType.cid), testSchemaMessage.document_cid);
        assert.equal(schemaMessageByTestJSON.getDocumentUrl(UrlType.url), testSchemaMessage.document_url);
        assert.exists(schemaMessageByTestJSON.toMessageObject());
    });
});
