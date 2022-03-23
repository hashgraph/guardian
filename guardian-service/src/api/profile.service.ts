import { RootConfig } from '@entity/root-config';
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
    VcDocument,
    VCMessage
} from '@hedera-modules';
import { getMongoRepository } from 'typeorm';
import { Topic } from '@entity/topic';
import { DidDocument as DidDocumentCollection } from '@entity/did-document';
import { VcDocument as VcDocumentCollection } from '@entity/vc-document';

async function wait(s: number): Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, s * 1000);
    })
}

/**
 * Connect to the message broker methods of working with Address books.
 * 
 * @param channel - channel
 * @param configRepository - table with Address books
 * @param didDocumentRepository - table with DID Documents
 * @param vcDocumentRepository - table with VC Documents
 */
export const profileAPI = async function (
    channel: any,
    topicRepository: MongoRepository<Topic>,
    configRepository: MongoRepository<RootConfig>
) {
    channel.response(MessageAPI.GET_USER_BALANCE, async (msg, res) => {
        try {
            const { username } = msg.payload;

            const wallet = new Wallet();
            const users = new Users();

            const user = await users.getUser(username);

            if (!user.hederaAccountId) {
                res.send(new MessageResponse('Invalid Hedera Account Id'));
                return;
            }

            const key = await wallet.getKey(user.walletToken, KeyType.KEY, user.did);
            const client = new HederaSDKHelper(user.hederaAccountId, key);
            const balance = await client.balance(user.hederaAccountId);
            res.send(new MessageResponse(balance));
        } catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message, 500));
        }
    })

    channel.response(MessageAPI.CREATE_USER_PROFILE, async (msg, res) => {
        try {
            const {
                hederaAccountId,
                hederaAccountKey,
                owner
            } = msg.payload;

            const topic = await topicRepository.findOne({
                where: {
                    did: owner,
                    type: TopicType.UserTopic
                }
            });

            if (!topic) {
                throw 'Topic not found';
            }

            const topicId = topic.topicId;

            const didDocument = DIDDocument.create(hederaAccountKey, topicId);
            const did = didDocument.getDid();
            const document = didDocument.getDocument();

            const doc = getMongoRepository(DidDocumentCollection).create({ did, document });

            const message = new DIDMessage(MessageAction.CreateDID);
            message.setDocument(document);

            const client = new MessageServer(hederaAccountId, hederaAccountKey);
            client.setSubmitKey(topic.key);
            client.sendMessage(topicId, message).then(function (message) {
                doc.status = DidDocumentStatus.CREATE;
                getMongoRepository(DidDocumentCollection).save(doc);
            }, function (error) {
                new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
                console.error(error);
                doc.status = DidDocumentStatus.FAILED;
                getMongoRepository(DidDocumentCollection).save(doc);
            });

            res.send(new MessageResponse(did));
        } catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message, 500));
        }
    })

    channel.response(MessageAPI.CREATE_ROOT_AUTHORITY, async (msg, res) => {
        try {
            const vcHelper = new VcHelper();

            const {
                hederaAccountId,
                hederaAccountKey,
                vcDocument,
                addressBook
            } = msg.payload;

            const topicMemo = JSON.stringify(addressBook);
            const client = new HederaSDKHelper(hederaAccountId, hederaAccountKey);
            const topicId = await client.newTopic(hederaAccountKey, null, topicMemo);

            await wait(15);

            const didObject = DIDDocument.create(hederaAccountKey, topicId);
            const userDID = didObject.getDid();

            const vc: any = vcDocument || {};
            vc.id = userDID;
            const vcObject = await vcHelper.createVC(userDID, hederaAccountKey, vc);

            const didMessage = new DIDMessage(MessageAction.CreateDID);
            didMessage.setDocument(didObject);

            const vcMessage = new VCMessage(MessageAction.CreateVC);
            vcMessage.setDocument(vcObject);

            const tokenObject = topicRepository.create({
                topicId: topicId,
                description: topicMemo,
                owner: didMessage.did,
                type: TopicType.UserTopic,
                key: null
            });
            await topicRepository.save(tokenObject);
            const didDoc = getMongoRepository(DidDocumentCollection).create({
                did: didMessage.did,
                document: didMessage.document
            });
            const vcDoc = getMongoRepository(VcDocumentCollection).create({
                hash: vcMessage.hash,
                owner: didMessage.did,
                document: vcMessage.document,
                type: SchemaEntity.ROOT_AUTHORITY
            });

            const messageServer = new MessageServer(hederaAccountId, hederaAccountKey);
            messageServer.sendMessage(topicId, didMessage).then(function (message: DIDMessage) {
                didDoc.status = DidDocumentStatus.CREATE;
                getMongoRepository(DidDocumentCollection).save(didDoc);
            }, function (error) {
                new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
                console.error(error);
                didDoc.status = DidDocumentStatus.FAILED;
                getMongoRepository(DidDocumentCollection).save(didDoc);
            });

            await wait(1);

            messageServer.sendMessage(topicId, vcMessage).then(function (message: VCMessage) {
                vcDoc.hederaStatus = DocumentStatus.ISSUE;
                getMongoRepository(VcDocumentCollection).save(vcDoc);
            }, function (error) {
                new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
                console.error(error);
                vcDoc.hederaStatus = DocumentStatus.FAILED;
                getMongoRepository(VcDocumentCollection).save(vcDoc);
            });

            //NEED DELETE
            const rootObject = configRepository.create({
                hederaAccountId: hederaAccountId,
                hederaAccountKey: hederaAccountKey,
                did: userDID,
            });
            await configRepository.save(rootObject);
            //

            await wait(1);

            res.send(new MessageResponse(userDID));
        } catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message, 500));
        }
    })
}
