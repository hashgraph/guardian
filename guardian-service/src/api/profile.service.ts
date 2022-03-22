import { DidDocument } from '@entity/did-document';
import { RootConfig } from '@entity/root-config';
import { VcDocument } from '@entity/vc-document';
import {
    DidDocumentStatus,
    DocumentStatus,
    IAddressBookConfig,
    IRootConfig,
    IUser,
    MessageAPI,
    MessageError,
    MessageResponse,
    SchemaEntity
} from 'interfaces';
import { getMongoRepository, MongoRepository } from 'typeorm';
import { HederaHelper } from 'vc-modules';
import { Logger } from 'logger-helper';
import { VcHelper } from '@helpers/vcHelper';
import { KeyType, Wallet } from '@helpers/wallet';
import { Users } from '@helpers/users';
import { getDIDOperation, getVCOperation } from '@helpers/utils';
import { readConfig } from '@api/config.service';
import { Settings } from '@entity/settings';

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
    configRepository: MongoRepository<RootConfig>
) {
    channel.response(MessageAPI.GET_USER_BALANCE, async (msg, res) => {
        try {
            res.send(new MessageError('test', 401));
            return;

            const {username} = msg.payload;

            const wallet = new Wallet();
            const users = new Users();

            const user = await users.getUser(username);

            if (!user.hederaAccountId) {
                res.send(new MessageResponse('Invalid Hedera Account Id'));
                return;
            }

            const key = await wallet.getKey(user.walletToken, KeyType.KEY, user.did);

            const balance = await HederaHelper
                .setOperator(user.hederaAccountId, key).SDK
                .balance(user.hederaAccountId);
            res.json(balance);

            res.send(new MessageResponse(balance));
        } catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message, 500));
        }
    })

    channel.response(MessageAPI.CREATE_USER_PROFILE, async (msg, res) => {
        try {
            const profile = msg.payload as IUser;

            const config = await readConfig(getMongoRepository(Settings));
            const addressBook = {
                owner: null,
                addressBook: config['ADDRESS_BOOK'],
                vcTopic: config['VC_TOPIC_ID'],
                didTopic: config['DID_TOPIC_ID']
            }
            const hederaHelper = HederaHelper
                .setOperator(profile.hederaAccountId, profile.hederaAccountKey)
                .setAddressBook(addressBook.addressBook, addressBook.didTopic, addressBook.vcTopic);

            const {hcsDid, did, document} = await hederaHelper.DID.createDid(profile.hederaAccountKey);

            const doc = getMongoRepository(DidDocument).create({did, document});

            hederaHelper.DID.createDidTransaction(hcsDid).then(function (message: any) {
                const did = message.getDid();
                const operation = message.getOperation();
                doc.status = getDIDOperation(operation);
            }, function (error) {
                console.error('createDidTransaction:', error);
                doc.status = getDIDOperation(DidDocumentStatus.FAILED);
            });
            await getMongoRepository(DidDocument).save(doc);

            res.send(new MessageResponse(did));
        } catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message, 500));
        }
    })

    channel.response(MessageAPI.CREATE_ROOT_AUTHORITY, async (msg, res) => {
        try {
            const profile = msg.payload as IUser;

            const vcHelper = new VcHelper();

            const addressBook = await HederaHelper
                .newNetwork(
                    profile.hederaAccountId,
                    profile.hederaAccountKey,
                    profile.addressBook.appnetName,
                    profile.addressBook.didServerUrl,
                    profile.addressBook.didTopicMemo,
                    profile.addressBook.vcTopicMemo,
                );

            await wait(15);

            const hederaHelper = HederaHelper
                .setOperator(profile.hederaAccountId, profile.hederaAccountKey)
                .setAddressBook(
                    addressBook.addressBookId,
                    addressBook.didTopicId,
                    addressBook.vcTopicId,
                );

            const {hcsDid, did, document} = await hederaHelper.DID.createDid(profile.hederaAccountKey);

            const vc: any = profile.vcDocument || {};
            vc.id = did;

            const vcDocument = await vcHelper.createVC(did, profile.hederaAccountKey, vc);

            const vcDoc = getMongoRepository(VcDocument).create({
                hash: vcDocument.toCredentialHash(),
                owner: did,
                document: vcDocument.toJsonTree(),
                type: SchemaEntity.ROOT_AUTHORITY
            });

            const didDoc = getMongoRepository(DidDocument).create({did, document});

            const rootObject = configRepository.create({
                hederaAccountId: profile.hederaAccountId,
                hederaAccountKey: profile.hederaAccountKey,
                addressBook: addressBook.addressBookId,
                didTopic: addressBook.didTopicId,
                vcTopic: addressBook.vcTopicId,
                appnetName: profile.addressBook.appnetName,
                didServerUrl: profile.addressBook.didServerUrl,
                didTopicMemo: profile.addressBook.didTopicMemo,
                vcTopicMemo: profile.addressBook.vcTopicMemo,
                did: did,
                state: 1
            });
            await configRepository.save(rootObject);

            try {
                console.log((new Date()).toISOString(), 'create DID started');
                const message = await hederaHelper.DID.createDidTransaction(hcsDid)
                const did = message.getDid();
                const operation = message.getOperation();
                didDoc.status = getDIDOperation(operation);
                new Logger().info('Created RA DID', ['GUARDIAN_SERVICE']);
            } catch (error) {
                didDoc.status = getDIDOperation(DidDocumentStatus.FAILED);
                new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            }
            await getMongoRepository(DidDocument).save(didDoc);

            await wait(1);

            try {
                console.log((new Date()).toISOString(), 'create VC started');
                const message = await hederaHelper.DID.createVcTransaction(vcDocument, profile.hederaAccountKey);
                const hash = message.getCredentialHash();
                const operation = message.getOperation();
                vcDoc.hederaStatus = getVCOperation(operation);
                new Logger().info('Created RA VC', ['GUARDIAN_SERVICE']);
            } catch (error) {
                new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
                vcDoc.hederaStatus = getVCOperation(DocumentStatus.FAILED as any);
            }
            await getMongoRepository(VcDocument).save(vcDoc);

            await wait(1);

            res.send(new MessageResponse(did));
        } catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message, 500));
        }
    })

    /**
     * Return Address books, VC Document and DID Document
     *
     * @param {string} payload - DID
     *
     * @returns {IFullConfig} - approve documents
     */
    channel.response(MessageAPI.GET_ROOT_CONFIG, async (msg, res) => {
        const rootConfig = await configRepository.findOne({where: {did: {$eq: msg.payload}}});
        if (!rootConfig) {
            res.send(new MessageResponse(null));
            return;
        }
        res.send(new MessageResponse(rootConfig));
    })

    /**
     * Create Address book
     *
     * @param {Object} payload - Address book config
     *
     * @returns {IRootConfig} - Address book config
     */
    channel.response(MessageAPI.SET_ROOT_CONFIG, async (msg, res) => {
        const rootObject = configRepository.create(msg.payload as RootConfig);
        const result: IRootConfig = await configRepository.save(rootObject);
        res.send(new MessageResponse(result));
    });

    /**
     * Return Address book
     *
     * @param {Object} payload - filters
     * @param {string} payload.owner - owner DID
     *
     * @returns {IAddressBookConfig} - Address book
     */
    channel.response(MessageAPI.GET_ADDRESS_BOOK, async (msg, res) => {
        if (!msg.payload) {
            res.send(new MessageError('Address book not found'));
            return;
        }

        const rootConfig = await configRepository.findOne({where: {did: {$eq: msg.payload.owner}}});
        if (!rootConfig) {
            res.send(new MessageResponse(null));
            return;
        }
        const config: IAddressBookConfig = {
            owner: rootConfig.did,
            addressBook: rootConfig.addressBook,
            vcTopic: rootConfig.vcTopic,
            didTopic: rootConfig.didTopic
        }
        res.send(new MessageResponse(config));
    });
}
