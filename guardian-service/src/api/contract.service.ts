import { ApiResponse } from '@api/api-response';
import {
    MessageBrokerChannel,
    MessageResponse,
    MessageError,
    Logger,
    DataBaseHelper,
} from '@guardian/common';
import {
    ContractStatus,
    MessageAPI,
    Schema,
    SchemaEntity,
    SchemaHelper,
    TopicType,
    WorkerTaskType,
} from '@guardian/interfaces';
import { Contract } from '@entity/contract';
import { Workers } from '@helpers/workers';
import { Users } from '@helpers/users';
import { KeyType, Wallet } from '@helpers/wallet';
import { DatabaseServer } from '@database-modules';
import { TokenId } from '@hashgraph/sdk';
import { RetireRequest } from '@entity/retire-request';
import { Schema as SchemaCollection } from '@entity/schema';
import {
    MessageAction,
    MessageServer,
    TopicConfig,
    TopicHelper,
    VCMessage,
} from '@hedera-modules';
import { Topic } from '@entity/topic';
import { publishSystemSchema } from './schema.service';
import { VcHelper } from '@helpers/vc-helper';
import { VcDocument as VcDocumentCollection } from '@entity/vc-document';

/**
 * Connect to the message broker methods of working with contracts.
 *
 * @param channel - channel
 */
export async function contractAPI(
    channel: MessageBrokerChannel,
    contractRepository: DataBaseHelper<Contract>,
    retireRequestRepository: DataBaseHelper<RetireRequest>
): Promise<void> {
    ApiResponse(channel, MessageAPI.GET_CONTRACT, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { pageIndex, pageSize, owner } = msg;

            const otherOptions: any = {};
            const _pageSize = parseInt(pageSize, 10);
            const _pageIndex = parseInt(pageIndex, 10);
            if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = Math.min(100, _pageSize);
                otherOptions.offset = _pageIndex * _pageSize;
            } else {
                otherOptions.limit = 100;
            }

            return new MessageResponse(
                await contractRepository.findAndCount(
                    {
                        owner,
                    },
                    otherOptions
                )
            );
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.GET_RETIRE_REQUEST, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { pageIndex, pageSize, owner, contractId, did } = msg;

            const filters: any = {};
            if (owner) {
                filters.owner = owner;
            }
            if (contractId) {
                const contracts = await contractRepository.findOne({
                    owner: did
                });
                if (contracts.owner !== did) {
                    throw new Error('You are not contract owner');
                }
                filters.contractId = contractId;
            } else {
                const contracts = await contractRepository.find({
                    owner: did
                });
                filters.contractId = {
                    $in: contracts.map(contract => contract.contractId)
                }
            }

            const otherOptions: any = {};
            const _pageSize = parseInt(pageSize, 10);
            const _pageIndex = parseInt(pageIndex, 10);
            if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = Math.min(100, _pageSize);
                otherOptions.offset = _pageIndex * _pageSize;
            } else {
                otherOptions.limit = 100;
            }

            const retireRequestsAndCount =
                await retireRequestRepository.findAndCount(
                    filters,
                    otherOptions
                );

            for (const retireRequest of retireRequestsAndCount[0] as any[]) {
                if (retireRequest.vcDocumentHash) {
                    retireRequest.vcDocument = await new DataBaseHelper(
                        VcDocumentCollection
                    ).findOne({
                        hash: retireRequest.vcDocumentHash,
                    });
                }
            }

            return new MessageResponse(retireRequestsAndCount);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.CREATE_CONTRACT, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { description, did } = msg;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(did);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                did
            );

            const contractId = await workers.addNonRetryableTask(
                {
                    type: WorkerTaskType.CREATE_CONTRACT,
                    data: {
                        bytecodeFileId: process.env.CONTRACT_FILE_ID,
                        hederaAccountId: root.hederaAccountId,
                        hederaAccountKey: rootKey,
                        topicKey: rootKey,
                    },
                },
                1
            );

            return new MessageResponse(
                await contractRepository.save({
                    contractId,
                    status: ContractStatus.APPROVED,
                    owner: did,
                    isOwnerCreator: true,
                    description,
                })
            );
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.CHECK_CONTRACT_STATUS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { did, contractId } = msg;

            if (!contractId) {
                throw new Error('Invalid contract identifier');
            }

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(did);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                did
            );

            const checkStatusResult = await workers.addNonRetryableTask(
                {
                    type: WorkerTaskType.CHECK_STATUS,
                    data: {
                        contractId,
                        hederaAccountId: root.hederaAccountId,
                        hederaAccountKey: rootKey,
                    },
                },
                1
            );

            if (checkStatusResult) {
                await contractRepository.update(
                    {
                        status: ContractStatus.APPROVED,
                    },
                    {
                        contractId,
                        owner: did,
                    }
                );
            }
            return new MessageResponse(checkStatusResult);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.ADD_CONTRACT_USER, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { userId, contractId, did } = msg;

            if (!contractId) {
                throw new Error('Invalid contract identifier');
            }
            if (!userId) {
                throw new Error('Invalid user identifier')
            }

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(did);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                did
            );

            return new MessageResponse(
                await workers.addNonRetryableTask(
                    {
                        type: WorkerTaskType.ADD_CONTRACT_USER,
                        data: {
                            contractId,
                            hederaAccountId: root.hederaAccountId,
                            hederaAccountKey: rootKey,
                            userId,
                        },
                    },
                    1
                )
            );
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.ADD_CONTRACT_PAIR, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid add contract pair parameters');
            }

            const {
                baseTokenId,
                oppositeTokenId,
                baseTokenCount,
                oppositeTokenCount,
                contractId,
                did,
            } = msg;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(did);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                did
            );

            const baseToken = await new DatabaseServer().getTokenById(
                baseTokenId
            );
            const oppositeToken = await new DatabaseServer().getTokenById(
                oppositeTokenId
            );
            const baseTokenAddress =
                TokenId.fromString(baseTokenId).toSolidityAddress();
            const oppositeTokenAddress =
                TokenId.fromString(oppositeTokenId).toSolidityAddress();
            return new MessageResponse(
                await workers.addNonRetryableTask(
                    {
                        type: WorkerTaskType.ADD_CONTRACT_PAIR,
                        data: {
                            contractId,
                            hederaAccountId: root.hederaAccountId,
                            hederaAccountKey: rootKey,
                            baseTokenAddress,
                            oppositeTokenAddress,
                            baseTokenCount: baseToken.decimals
                                ? Math.pow(10, baseToken.decimals) *
                                  baseTokenCount
                                : baseTokenCount,
                            oppositeTokenCount: oppositeToken.decimals
                                ? Math.pow(10, oppositeToken.decimals) *
                                  oppositeTokenCount
                                : oppositeTokenCount,
                        },
                    },
                    1
                )
            );
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.IMPORT_CONTRACT, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid contract identifier');
            }
            const { contractId, did, description } = msg;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(did);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                did
            );

            const contractOwner = await workers.addNonRetryableTask(
                {
                    type: WorkerTaskType.GET_CONTRACT_INFO,
                    data: {
                        contractId,
                        hederaAccountId: root.hederaAccountId,
                        hederaAccountKey: rootKey,
                    },
                },
                1
            );

            return new MessageResponse(
                await contractRepository.save(
                    {
                        contractId,
                        owner: did,
                        isOwnerCreator: contractOwner === root.hederaAccountId,
                        description,
                        status:
                            contractOwner === root.hederaAccountId
                                ? ContractStatus.APPROVED
                                : ContractStatus.WAIT,
                    },
                    {
                        contractId,
                        owner: did,
                    }
                )
            );
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.GET_CONTRACT_PAIR, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid add contract pair parameters');
            }

            const { baseTokenId, oppositeTokenId, did, owner } = msg;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(did);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                did
            );
            const baseToken = await new DatabaseServer().getTokenById(
                baseTokenId
            );
            const oppositeToken = await new DatabaseServer().getTokenById(
                oppositeTokenId
            );
            const contracts = await contractRepository.find({
                owner,
            });
            const contractPairs = [];
            for (const contract of contracts) {
                const contractPair = await workers.addNonRetryableTask(
                    {
                        type: WorkerTaskType.GET_CONTRACT_PAIR,
                        data: {
                            contractId: contract.contractId,
                            hederaAccountId: root.hederaAccountId,
                            hederaAccountKey: rootKey,
                            baseTokenId,
                            oppositeTokenId,
                        },
                    },
                    1
                );
                contractPairs.push({
                    baseTokenRate: baseToken.decimals
                        ? contractPair.baseTokenRate /
                          Math.pow(10, baseToken.decimals)
                        : contractPair.baseTokenRate,
                    oppositeTokenRate: oppositeToken.decimals
                        ? contractPair.oppositeTokenRate /
                          Math.pow(10, oppositeToken.decimals)
                        : contractPair.oppositeTokenRate,
                    contractId: contractPair.contractId,
                    description: contract.description,
                });
            }

            return new MessageResponse(contractPairs);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.ADD_RETIRE_REQUEST, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid add contract pair parameters');
            }

            const {
                baseTokenId,
                oppositeTokenId,
                baseTokenCount,
                oppositeTokenCount,
                baseTokenSerials,
                oppositeTokenSerials,
                contractId,
                did,
            } = msg;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(did);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                did
            );

            const baseToken = await new DatabaseServer().getTokenById(
                baseTokenId
            );
            const oppositeToken = await new DatabaseServer().getTokenById(
                oppositeTokenId
            );

            const addRequestResult = await workers.addNonRetryableTask(
                {
                    type: WorkerTaskType.ADD_RETIRE_REQUEST,
                    data: {
                        contractId,
                        hederaAccountId: root.hederaAccountId,
                        hederaAccountKey: rootKey,
                        baseTokenId,
                        oppositeTokenId,
                        baseTokenCount: baseToken.decimals
                            ? Math.pow(10, baseToken.decimals) * baseTokenCount
                            : baseTokenCount,
                        oppositeTokenCount: oppositeToken.decimals
                            ? Math.pow(10, oppositeToken.decimals) *
                              oppositeTokenCount
                            : oppositeTokenCount,
                        baseTokenSerials,
                        oppositeTokenSerials,
                    },
                },
                1
            );

            const contractRequest = await workers.addNonRetryableTask(
                {
                    type: WorkerTaskType.GET_RETIRE_REQUEST,
                    data: {
                        contractId,
                        hederaAccountId: root.hederaAccountId,
                        hederaAccountKey: rootKey,
                        baseTokenId,
                        oppositeTokenId,
                        userId: root.hederaAccountId,
                    },
                },
                1
            );

            await retireRequestRepository.save(
                {
                    contractId,
                    baseTokenId,
                    oppositeTokenId,
                    owner: did,
                    baseTokenCount: baseToken.decimals
                        ? contractRequest.baseTokenCount /
                          Math.pow(10, baseToken.decimals)
                        : contractRequest.baseTokenCount,
                    oppositeTokenCount: oppositeToken.decimals
                        ? contractRequest.oppositeTokenCount /
                          Math.pow(10, oppositeToken.decimals)
                        : contractRequest.oppositeTokenCount,
                    baseTokenSerials,
                    oppositeTokenSerials,
                },
                {
                    contractId,
                    baseTokenId,
                    oppositeTokenId,
                    owner: did,
                    vcDocumentHash: null
                }
            );

            return new MessageResponse(addRequestResult);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.CANCEL_RETIRE_REQUEST, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid add contract pair parameters');
            }

            const { requestId, did } = msg;

            const retireRequest = await retireRequestRepository.findOne({
                id: requestId,
            });

            if (did !== retireRequest.owner) {
                throw new Error('You are not owner of retire request');
            }

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(did);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                did
            );

            const cancelResult = await workers.addNonRetryableTask(
                {
                    type: WorkerTaskType.CANCEL_RETIRE_REQUEST,
                    data: {
                        contractId: retireRequest.contractId,
                        hederaAccountId: root.hederaAccountId,
                        hederaAccountKey: rootKey,
                        baseTokenId: retireRequest.baseTokenId,
                        oppositeTokenId: retireRequest.oppositeTokenId,
                    },
                },
                1
            );

            if (cancelResult) {
                await retireRequestRepository.remove(retireRequest);
            }

            return new MessageResponse(cancelResult);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.RETIRE_TOKENS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid add contract pair parameters');
            }

            const { requestId, did } = msg;

            const retireRequest = await retireRequestRepository.findOne({
                id: requestId,
            });

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(did);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                did
            );
            const retireRequestUser = await users.getUserById(
                retireRequest.owner
            );
            const retireRequestOwner = await users.getUserById(
                retireRequest.owner
            );
            const wipeKeys = [];
            wipeKeys.push(
                await wallet.getUserKey(
                    did,
                    KeyType.TOKEN_WIPE_KEY,
                    retireRequest.baseTokenId
                )
            );
            wipeKeys.push(
                await wallet.getUserKey(
                    did,
                    KeyType.TOKEN_WIPE_KEY,
                    retireRequest.oppositeTokenId
                )
            );

            const retireResult = await workers.addNonRetryableTask(
                {
                    type: WorkerTaskType.RETIRE_TOKENS,
                    data: {
                        contractId: retireRequest.contractId,
                        hederaAccountId: root.hederaAccountId,
                        hederaAccountKey: rootKey,
                        baseTokenId: retireRequest.baseTokenId,
                        oppositeTokenId: retireRequest.oppositeTokenId,
                        userId: retireRequestUser.hederaAccountId,
                        wipeKeys,
                    },
                },
                1
            );

            let topicConfig = await TopicConfig.fromObject(
                await new DataBaseHelper(Topic).findOne({
                    owner: did,
                    type: TopicType.RetireTopic,
                }),
                true
            );
            const parent = await TopicConfig.fromObject(
                await DatabaseServer.getTopicByType(did, TopicType.UserTopic),
                true
            );
            if (!topicConfig) {
                const topicHelper = new TopicHelper(
                    root.hederaAccountId,
                    rootKey
                );
                topicConfig = await topicHelper.create(
                    {
                        type: TopicType.RetireTopic,
                        name: TopicType.RetireTopic,
                        description: TopicType.RetireTopic,
                        owner: did,
                    },
                    {
                        admin: false,
                        submit: true,
                    }
                );
                await topicConfig.saveKeys();
                await topicHelper.twoWayLink(topicConfig, parent, null);
                await new DataBaseHelper(Topic).save(topicConfig.toObject());
            }

            let schema: SchemaCollection = null;

            schema = await new DataBaseHelper(SchemaCollection).findOne({
                entity: SchemaEntity.RETIRE_TOKEN,
                readonly: true,
                topicId: topicConfig.topicId,
            });
            const messageServer = new MessageServer(
                root.hederaAccountId,
                rootKey
            );
            messageServer.setTopicObject(parent);
            if (!schema) {
                schema = await new DataBaseHelper(SchemaCollection).findOne({
                    entity: SchemaEntity.RETIRE_TOKEN,
                    system: true,
                    active: true,
                });
                if (schema) {
                    schema.creator = did;
                    schema.owner = did;
                    const item = await publishSystemSchema(
                        schema,
                        messageServer,
                        MessageAction.PublishSystemSchema
                    );
                    await new DataBaseHelper(SchemaCollection).save(item);
                }
            }

            const schemaObject = new Schema(schema);
            const vcHelper = new VcHelper();

            let credentialSubject: any = {
                baseTokenId: retireRequest.baseTokenId,
                oppositeTokenId: retireRequest.oppositeTokenId,
                baseTokenCount: retireRequest.baseTokenCount,
                oppositeTokenCount: retireRequest.oppositeTokenCount,
                userId: retireRequestOwner.hederaAccountId,
                baseTokenSerials: retireRequest.baseTokenSerials,
                oppositeTokenSerials: retireRequest.oppositeTokenSerials,
            };
            credentialSubject.id = did;

            if (schemaObject) {
                credentialSubject = SchemaHelper.updateObjectContext(
                    schemaObject,
                    credentialSubject
                );
            }

            const vcObject = await vcHelper.createVC(
                did,
                rootKey,
                credentialSubject
            );
            const vcMessage = new VCMessage(MessageAction.CreateVC);
            vcMessage.setDocument(vcObject);
            await messageServer
                .setTopicObject(topicConfig)
                .sendMessage(vcMessage);

            const vcDoc = await new DataBaseHelper(VcDocumentCollection).save({
                hash: vcMessage.hash,
                owner: did,
                document: vcMessage.document,
                type: schemaObject?.entity,
            });

            await retireRequestRepository.update(
                {
                    vcDocumentHash: vcDoc.hash,
                },
                {
                    id: retireRequest.id,
                }
            );

            return new MessageResponse(retireResult);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });
}