import {
    DidDocumentStatus,
    DocumentStatus,
    MessageAPI,
    MessageError,
    MessageResponse,
    SchemaEntity,
    TopicType
} from 'interfaces';
import { MongoRepository } from 'typeorm';
import { Logger } from 'logger-helper';
import { VcHelper } from '@helpers/vcHelper';
import { KeyType, Wallet } from '@helpers/wallet';
import { Users } from '@helpers/users';
import {
    DIDDocument,
    DIDMessage,
    HederaSDKHelper,
    MessageAction,
    MessageServer,
    VCMessage
} from '@hedera-modules';
import { getMongoRepository } from 'typeorm';
import { Topic } from '@entity/topic';
import { DidDocument as DidDocumentCollection } from '@entity/did-document';
import { VcDocument as VcDocumentCollection } from '@entity/vc-document';
import { ApiResponse } from '@api/api-response';
import { TopicHelper } from '@helpers/topicHelper';

/**
 * Connect to the message broker methods of working with Address books.
 * 
 * @param channel - channel
 * @param configRepository - table with Address books
 * @param didDocumentRepository - table with DID Documents
 * @param vcDocumentRepository - table with VC Documents
 */
export const profileAPI = async function (channel: any) {
    ApiResponse(channel, MessageAPI.GET_USER_BALANCE, async (msg, res) => {
        try {
            const { username } = msg.payload;

            const wallet = new Wallet();
            const users = new Users();

            const user = await users.getUser(username);

            if (!user) {
                res.send(new MessageResponse('Invalid Account'));
                return;
            }

            if (!user.hederaAccountId) {
                res.send(new MessageResponse('Invalid Hedera Account Id'));
                return;
            }

            const key = await wallet.getKey(user.walletToken, KeyType.KEY, user.did);
            const client = new HederaSDKHelper(user.hederaAccountId, key);
            const balance = await client.balance(user.hederaAccountId);
            res.send(new MessageResponse(balance));
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message, 500));
        }
    })

    ApiResponse(channel, MessageAPI.CREATE_USER_PROFILE, async (msg, res) => {
        try {
            const {
                hederaAccountId,
                hederaAccountKey,
                parent,
                vcDocument
            } = msg.payload;

            let topic: any, newTopic = false;
            if (parent) {
                topic = await getMongoRepository(Topic).findOne({
                    owner: parent,
                    type: TopicType.UserTopic
                });
            }

            if (!topic) {
                const topicHelper = new TopicHelper(hederaAccountId, hederaAccountKey);
                topic = await topicHelper.create({
                    type: TopicType.UserTopic,
                    name: TopicType.UserTopic,
                    description: TopicType.UserTopic,
                    owner: topic,
                    policyId: null,
                    policyUUID: null
                });
                await topicHelper.link(topic, null, null);
                newTopic = true;
            }

            let didMessage: DIDMessage;
            let vcMessage: VCMessage;
            let didDoc: DidDocumentCollection;
            let vcDoc: VcDocumentCollection;

            const didObject = DIDDocument.create(hederaAccountKey, topic.topicId);
            const userDID = didObject.getDid();
            didMessage = new DIDMessage(MessageAction.CreateDID);
            didMessage.setDocument(didObject);
            didDoc = getMongoRepository(DidDocumentCollection).create({
                did: didMessage.did,
                document: didMessage.document
            });
            didDoc = await getMongoRepository(DidDocumentCollection).save(didDoc);

            if (vcDocument) {
                const vcHelper = new VcHelper();
                const vc: any = vcDocument || {};
                vc.id = userDID;
                const vcObject = await vcHelper.createVC(userDID, hederaAccountKey, vc);
                vcMessage = new VCMessage(MessageAction.CreateVC);
                vcMessage.setDocument(vcObject);
                vcDoc = getMongoRepository(VcDocumentCollection).create({
                    hash: vcMessage.hash,
                    owner: didMessage.did,
                    document: vcMessage.document,
                    type: SchemaEntity.ROOT_AUTHORITY
                });
                vcDoc = await getMongoRepository(VcDocumentCollection).save(vcDoc);
            }

            if (newTopic) {
                topic.owner = didMessage.did;
                await getMongoRepository(Topic).update(topic.id, topic);
            }

            const messageServer = new MessageServer(hederaAccountId, hederaAccountKey);
            try {
                const didMessageResult =await messageServer.setTopicObject(topic).sendMessage(didMessage)
                didDoc.status = DidDocumentStatus.CREATE;
                didDoc.messageId = didMessageResult.getId();
                getMongoRepository(DidDocumentCollection).update(didDoc.id, didDoc);
            } catch (error) {
                new Logger().error(error.message, ['GUARDIAN_SERVICE']);
                console.error(error);
                didDoc.status = DidDocumentStatus.FAILED;
                getMongoRepository(DidDocumentCollection).update(didDoc.id, didDoc);
            }
            if (vcMessage) {
                try {
                    const vcMessageResult = await messageServer.setTopicObject(topic).sendMessage(vcMessage);
                    vcDoc.hederaStatus = DocumentStatus.ISSUE;
                    vcDoc.messageId = vcMessageResult.getId();
                    getMongoRepository(VcDocumentCollection).update(vcDoc.id, vcDoc);
                } catch (error) {
                    new Logger().error(error.message, ['GUARDIAN_SERVICE']);
                    console.error(error);
                    vcDoc.hederaStatus = DocumentStatus.FAILED;
                    getMongoRepository(VcDocumentCollection).update(vcDoc.id, vcDoc);
                }
            }

            res.send(new MessageResponse(userDID));
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message, 500));
        }
    })
}