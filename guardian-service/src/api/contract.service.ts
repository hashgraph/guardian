import { ApiResponse } from '../api/helpers/api-response.js';
import {
    Contract,
    ContractMessage,
    DatabaseServer,
    KeyType,
    MessageAction,
    MessageError,
    MessageResponse,
    MessageServer,
    NotificationHelper,
    PinoLogger,
    RetirePool,
    RetireRequest,
    Schema as SchemaCollection,
    Topic,
    TopicConfig,
    TopicHelper,
    Users,
    VcDocument,
    VcDocument as VcDocumentCollection,
    VcHelper,
    VCMessage,
    Wallet,
    WiperRequest,
    Workers,
} from '@guardian/common';
import { ContractAPI, ContractParamType, ContractType, EntityOwner, IOwner, RetireTokenPool, RetireTokenRequest, Schema, SchemaEntity, SchemaHelper, TokenType, TopicType, UserRole, WorkerTaskType, } from '@guardian/interfaces';
import { AccountId, TokenId } from '@hashgraph/sdk';
import { proto } from '@hashgraph/proto';
import * as ethers from 'ethers';
import { contractCall, contractQuery, createContract, customContractCall, publishSystemSchema } from './helpers/index.js';
import { emptyNotifier } from '../helpers/notifier.js';
import { FilterObject } from '@mikro-orm/core';

const retireAbi = new ethers.Interface([
    'function retire(tuple(address, int64, int64[])[])',
    'function setRequest(address, tuple(address, int64, int64[])[])',
    'function setPool(tuple(address, int64)[], bool)',
]);

const wipeEventsAbi = new ethers.Interface([
    'event OwnerAdded(address)',
    'event AdminAdded(address account)',
    'event AdminRemoved(address account)',
    'event ManagerAdded(address account)',
    'event ManagerRemoved(address account)',
    'event WiperAdded(address account)',
    'event WiperRemoved(address account)',
    'event WipeRequestAdded(address)',
    'event WipeRequestRemoved(address)',
    'event WipeRequestsCleared()',
]);

const retireEventsAbi = new ethers.Interface([
    'event OwnerAdded(address)',
    'event AdminAdded(address)',
    'event AdminRemoved(address)',
    'event Retire(address, tuple(address, int64, int64[])[])',
    'event PoolAdded(tuple(address, int64)[], bool)',
    'event PoolRemoved(address[])',
    'event RetireRequestAdded(address, tuple(address, int64, int64[])[])',
    'event RetireRequestRemoved(address, address[])',
    'event PoolsCleared(uint8)',
    'event RequestsCleared(uint8)',
]);

export function getTokenContractId(wipeKey: { _type: string; key: string }) {
    if (wipeKey._type !== 'ProtobufEncoded') {
        return '';
    }
    const key = wipeKey.key;
    const normalizedInput = key.replace(/\s/g, '');
    const normalizedHexInput = normalizedInput.replace(/0x/g, '').toLowerCase();
    const keyProto = Buffer.from(normalizedHexInput, 'hex');
    const out = proto.Key.decode(keyProto);
    const id =
        out?.contractID?.contractNum || out?.delegatableContractId?.contractNum;
    if (!id) {
        return '';
    }
    return '0.0.' + id.toString();
}

async function setPool(
    workers: Workers,
    dataBaseServer: DatabaseServer,
    contractId: string,
    options: { tokens: RetireTokenPool[]; immediately: boolean }
) {
    const pool = JSON.parse(JSON.stringify(options));
    pool.contractId = contractId;
    pool.tokens = await Promise.all(
        options.tokens.map(async (item) => {
            const tokenInfo = await workers.addRetryableTask(
                {
                    type: WorkerTaskType.GET_TOKEN_INFO,
                    data: { tokenId: item.token },
                },
                10
            );
            const wipeContractId = getTokenContractId(tokenInfo.wipe_key);

            let isWiper = false;
            try {
                isWiper = await isContractWiper(
                    workers,
                    wipeContractId,
                    contractId
                );
                // tslint:disable-next-line:no-empty
            } catch { }
            await setContractWiperPermissions(
                dataBaseServer,
                contractId,
                wipeContractId,
                isWiper
            );

            return {
                token: item.token,
                count: item.count,
                type:
                    tokenInfo.type?.toLowerCase() === 'fungible_common'
                        ? TokenType.FUNGIBLE
                        : TokenType.NON_FUNGIBLE,
                tokenSymbol: tokenInfo.symbol,
                decimals: tokenInfo.decimals,
                contract: wipeContractId,
            };
        })
    );

    const contract = await dataBaseServer.findOne(Contract,{
        contractId,
    });

    pool.enabled =
        pool.tokens.findIndex(
            (token) => !contract.wipeContractIds.includes(token.contract)
        ) < 0;

    const tokenIds = options.tokens.map((item) => item.token);

    const filters: any = {
        $and: [
            {
                contractId,
            },
            {
                $or: [
                    {
                        tokenIds: { $eq: [...tokenIds] },
                    },
                    {
                        tokenIds: { $eq: tokenIds.reverse() },
                    },
                ],
            },
        ],
    };
    await dataBaseServer.save(RetirePool, pool, filters);
}

async function setContractWiperPermissions(
    dataBaseServer: DatabaseServer,
    contractId: string,
    wipeContractId: string,
    isWiper: boolean
) {
    const contracts = await dataBaseServer.find(Contract, {
        contractId,
    });
    if (contracts.length === 0) {
        return;
    }

    await dataBaseServer.update(
        Contract,
        {
            contractId,
        },
        await Promise.all(
            contracts.map(async (contract) => {
                contract.wipeContractIds = contract.wipeContractIds.filter(
                    (contractWipeContractId) =>
                        contractWipeContractId !== wipeContractId
                );
                if (isWiper) {
                    contract.wipeContractIds.push(wipeContractId);
                }
                return contract;
            })
        ),
    );
    const pools = await dataBaseServer.find(RetirePool, {
        contractId,
    });

    await dataBaseServer.save(
        RetirePool,
        await Promise.all(
            pools.map(async (pool) => {
                const contract = await dataBaseServer.findOne(Contract, {
                    contractId,
                });

                pool.enabled =
                    pool.tokens.findIndex(
                        (token) =>
                            !contract.wipeContractIds.includes(token.contract)
                    ) < 0;
                return pool;
            })
        )
    );
}

export async function setPoolContract(
    workers: Workers,
    contractId: string,
    hederaAccountId: string,
    hederaAccountKey: string,
    tokens: RetireTokenPool[],
    immediately: boolean = false
) {
    return await customContractCall(
        ContractAPI.SET_RETIRE_POOLS,
        workers,
        contractId,
        hederaAccountId,
        hederaAccountKey,
        retireAbi.encodeFunctionData('setPool', [
            tokens.map((token) => [
                TokenId.fromString(token.token).toSolidityAddress(),
                token.count,
            ]),
            immediately,
        ])
    );
}

async function setRetireRequest(
    workers: Workers,
    dataBaseServer: DatabaseServer,
    contractId: string,
    user: string,
    tokens: RetireTokenRequest[]
) {
    const newTokens = await Promise.all(
        tokens.map(async (token) => {
            const fullTokenInfo = await workers.addRetryableTask(
                {
                    type: WorkerTaskType.GET_TOKEN_INFO,
                    data: { tokenId: token.token },
                },
                10
            );
            const tokenInfo = {
                type:
                    fullTokenInfo.type?.toLowerCase() === 'fungible_common'
                        ? TokenType.FUNGIBLE
                        : TokenType.NON_FUNGIBLE,
                tokenSymbol: fullTokenInfo.symbol,
                decimals: fullTokenInfo.decimals,
            };
            return Object.assign(token, tokenInfo);
        })
    );

    const tokenIds = tokens.map((token) => token.token);

    await dataBaseServer.save(
        RetireRequest,
        {
            user,
            tokens: newTokens,
            contractId,
        },
        {
            $and: [
                {
                    user,
                },
                {
                    $or: [
                        {
                            tokenIds: { $eq: [...tokenIds] },
                        },
                        {
                            tokenIds: { $eq: tokenIds.reverse() },
                        },
                    ],
                },
            ],
        } as FilterObject<RetireRequest>
    );
}

export async function syncWipeContracts(
    dataBaseServer: DatabaseServer,
    workers: Workers,
    users: Users
) {
    const contractIds = new Map<string, string>();
    const contracts = await dataBaseServer.find(
        Contract,
        {
            type: ContractType.WIPE,
            syncDisabled: { $ne: true },
        },
        {
            fields: ['contractId', 'lastSyncEventTimeStamp'],
        }
    );
    const maxTimestamps = new Map<string, string>();
    contracts.forEach((contract) => {
        const maxTimestamp = maxTimestamps.get(contract.contractId) || '';
        const timestamp = contract.lastSyncEventTimeStamp || '';
        if (timestamp > maxTimestamp) {
            contractIds.set(
                contract.contractId,
                contract.lastSyncEventTimeStamp
            );
            maxTimestamps.set(
                contract.contractId,
                contract.lastSyncEventTimeStamp
            );
        } else if (!contractIds.has(contract.contractId)) {
            contractIds.set(
                contract.contractId,
                contract.lastSyncEventTimeStamp
            );
        }
    });

    for (const [contractId, lastSyncEventTimeStamp] of contractIds) {
        await syncWipeContract(
            dataBaseServer,
            workers,
            users,
            contractId,
            lastSyncEventTimeStamp
        );
    }
}

export async function syncWipeContract(
    dataBaseServer: DatabaseServer,
    workers: Workers,
    users: Users,
    contractId: string,
    timestamp?: string,
    sendNotifications: boolean = true
) {
    const timestamps = [timestamp];
    let lastTimeStamp;
    while (timestamps.length) {
        // tslint:disable-next-line:no-shadowed-variable
        const timestamp = timestamps.pop();
        const result = await workers.addNonRetryableTask(
            {
                type: WorkerTaskType.GET_CONTRACT_EVENTS,
                data: {
                    contractId,
                    timestamp: timestamp ? `gt:${timestamp}` : null,
                },
            },
            20,
            null
        );

        if (!result || !result.length) {
            break;
        }

        for (const log of result) {
            const eventName = wipeEventsAbi.getEventName(log.topics[0]);
            const data = wipeEventsAbi.decodeEventLog(eventName, log.data);
            // tslint:disable-next-line:no-shadowed-variable
            const contracts = await dataBaseServer.find(
                Contract,
                {
                    contractId,
                },
                {
                    fields: ['owner'],
                }
            );
            const contractOwnerDids = contracts.map(
                (contractOwnerDid) => contractOwnerDid.owner
            );
            const contractOwners = await users.getUsersByIds(contractOwnerDids);
            const contractOwnerIds = contractOwners.map(
                (contractOwner) => contractOwner.id
            );

            switch (eventName) {
                case 'WiperAdded': {
                    const retireContractId = AccountId.fromSolidityAddress(
                        data[0]
                    ).toString();
                    await setContractWiperPermissions(
                        dataBaseServer,
                        retireContractId,
                        contractId,
                        true
                    );
                    break;
                }
                case 'WiperRemoved': {
                    const retireContractId = AccountId.fromSolidityAddress(
                        data[0]
                    ).toString();
                    await setContractWiperPermissions(
                        dataBaseServer,
                        retireContractId,
                        contractId,
                        false
                    );
                    break;
                }
                case 'WipeRequestAdded': {
                    const user: string = AccountId.fromSolidityAddress(
                        data[0]
                    ).toString();
                    await dataBaseServer.save(
                        WiperRequest,
                        {
                            user,
                            contractId,
                        },
                        {
                            user,
                            contractId,
                        }
                    );
                    if (!sendNotifications) {
                        break;
                    }
                    Promise.all(
                        contractOwnerIds.map((contractOwnerId) =>
                            NotificationHelper.info(
                                `Wiper requsted in contract: ${contractId}`,
                                `${user} requested wiper role`,
                                contractOwnerId
                            )
                        )
                    );
                    break;
                }
                case 'WipeRequestRemoved': {
                    const user: string = AccountId.fromSolidityAddress(
                        data[0]
                    ).toString();
                    await dataBaseServer.deleteEntity(WiperRequest, {
                        contractId,
                        user,
                    });
                    break;
                }
                case 'WipeRequestsCleared': {
                    await dataBaseServer.deleteEntity(WiperRequest, {
                        contractId,
                    });
                    break;
                }
                default:
                    break;
            }
        }

        lastTimeStamp = result[result.length - 1].timestamp;
        timestamps.push(lastTimeStamp);
    }

    if (!lastTimeStamp) {
        return;
    }
    const contracts = await dataBaseServer.find(Contract, {
        contractId,
    });
    await dataBaseServer.update(Contract,
       null,
        contracts.map((contract) => {
            contract.lastSyncEventTimeStamp = lastTimeStamp;
            contract.syncDisabled = false;
            return contract;
        })
    );
}

export async function syncRetireContracts(
    dataBaseServer: DatabaseServer,
    workers: Workers,
    users: Users
) {
    const contractIds = new Map<string, string>();
    const contracts = await dataBaseServer.find(
        Contract,
        {
            type: ContractType.RETIRE,
            syncDisabled: { $ne: true },
        },
        {
            fields: ['contractId', 'lastSyncEventTimeStamp'],
        }
    );
    const maxTimestamps = new Map<string, string>();
    contracts.forEach((contract) => {
        const maxTimestamp = maxTimestamps.get(contract.contractId) || '';
        const timestamp = contract.lastSyncEventTimeStamp || '';
        if (timestamp > maxTimestamp) {
            contractIds.set(
                contract.contractId,
                contract.lastSyncEventTimeStamp
            );
            maxTimestamps.set(
                contract.contractId,
                contract.lastSyncEventTimeStamp
            );
        } else if (!contractIds.has(contract.contractId)) {
            contractIds.set(
                contract.contractId,
                contract.lastSyncEventTimeStamp
            );
        }
    });
    for (const [contractId, lastSyncEventTimeStamp] of contractIds) {
        await syncRetireContract(
            dataBaseServer,
            workers,
            users,
            contractId,
            lastSyncEventTimeStamp
        );
    }
}

export async function syncRetireContract(
    dataBaseServer: DatabaseServer,
    workers: Workers,
    users: Users,
    contractId: string,
    timestamp?: string,
    sendNotifications: boolean = true
) {
    const timestamps = [timestamp];
    let lastTimeStamp;
    while (timestamps.length) {
        // tslint:disable-next-line:no-shadowed-variable
        const timestamp = timestamps.pop();
        const result = await workers.addNonRetryableTask(
            {
                type: WorkerTaskType.GET_CONTRACT_EVENTS,
                data: {
                    contractId,
                    timestamp: timestamp ? `gt:${timestamp}` : null,
                },
            },
            20,
            null
        );

        if (!result || !result.length) {
            break;
        }

        for (const log of result) {
            const eventName = retireEventsAbi.getEventName(log.topics[0]);
            const data = retireEventsAbi.decodeEventLog(eventName, log.data);

            // tslint:disable-next-line:no-shadowed-variable
            const contracts = await dataBaseServer.find(
                Contract,
                {
                    contractId,
                },
                {
                    fields: ['owner'],
                }
            );
            const contractOwnerDids = contracts.map(
                (contract) => contract.owner
            );
            const contractOwners = await users.getUsersByIds(contractOwnerDids);
            const contractOwnerIds = contractOwners.map(
                (contractOwner) => contractOwner.id
            );
            const allOwnersUsers = await Promise.all(
                contractOwnerDids.map(
                    async (contractOwnerDid) =>
                        await users.getUsersBySrId(contractOwnerDid)
                )
            );
            const allOwnersUsersIds = []
                .concat(...allOwnersUsers)
                .map((item) => item.id);

            switch (eventName) {
                case 'Retire': {
                    const retireUser = AccountId.fromSolidityAddress(
                        data[0]
                    ).toString();
                    const tokens = data[1].map((item) =>
                        TokenId.fromSolidityAddress(item[0]).toString()
                    );
                    const user = await users.getUserByAccount(retireUser);
                    if (!sendNotifications || !user?.id) {
                        break;
                    }
                    NotificationHelper.success(
                        `Tokens ${tokens.join(', ')} are retired`,
                        `Retire tokens completed`,
                        user.id
                    );
                    break;
                }
                case 'PoolAdded': {
                    const tokens: RetireTokenPool[] = data[0].map((item) => ({
                        token: TokenId.fromSolidityAddress(item[0]).toString(),
                        count: Number(item[1]),
                    }));
                    await setPool(
                        workers,
                        dataBaseServer,
                        contractId,
                        {
                            tokens,
                            immediately: data[1],
                        }
                    );
                    if (!sendNotifications) {
                        break;
                    }
                    Promise.all(
                        contractOwnerIds.map((user) =>
                            NotificationHelper.info(
                                `Pool added in contract: ${contractId}`,
                                `New retire pool added: ${tokens
                                    .map((token) => token.token)
                                    .join(', ')}`,
                                user
                            )
                        )
                    );
                    Promise.all(
                        allOwnersUsersIds.map((user) =>
                            NotificationHelper.info(
                                `Pool added in contract: ${contractId}`,
                                `New retire pool added: ${tokens
                                    .map((token) => token.token)
                                    .join(', ')}`,
                                user
                            )
                        )
                    );
                    break;
                }
                case 'PoolRemoved': {
                    const tokenIds = data[0].map((item) =>
                        TokenId.fromSolidityAddress(item).toString()
                    );
                    await dataBaseServer.deleteEntity(RetirePool, {
                        $and: [
                            {
                                contractId,
                            },
                            {
                                $or: [
                                    {
                                        tokenIds: { $eq: [...tokenIds] },
                                    },
                                    {
                                        tokenIds: { $eq: tokenIds.reverse() },
                                    },
                                ],
                            },
                        ],
                    } as FilterObject<RetirePool>);
                    if (!sendNotifications) {
                        break;
                    }
                    Promise.all(
                        contractOwnerIds.map((user) =>
                            NotificationHelper.info(
                                `Pool removed in contract: ${contractId}`,
                                `Retire pool removed: ${tokenIds.join(', ')}`,
                                user
                            )
                        )
                    );
                    Promise.all(
                        allOwnersUsersIds.map((user) =>
                            NotificationHelper.info(
                                `Pool removed in contract: ${contractId}`,
                                `Retire pool removed: ${tokenIds.join(', ')}`,
                                user
                            )
                        )
                    );
                    break;
                }
                case 'RetireRequestAdded': {
                    const retireUser = AccountId.fromSolidityAddress(
                        data[0]
                    ).toString();
                    await setRetireRequest(
                        workers,
                        dataBaseServer,
                        contractId,
                        retireUser,
                        data[1].map((item) => ({
                            token: TokenId.fromSolidityAddress(
                                item[0]
                            ).toString(),
                            count: Number(item[1]),
                            serials: item[2].map((serial) => Number(serial)),
                        }))
                    );
                    if (!sendNotifications) {
                        break;
                    }
                    Promise.all(
                        contractOwnerIds.map((user) =>
                            NotificationHelper.info(
                                `Retire requested in contract: ${contractId}`,
                                `Retire requsted from: ${retireUser}`,
                                user
                            )
                        )
                    );
                    break;
                }
                case 'RetireRequestRemoved': {
                    const user = AccountId.fromSolidityAddress(
                        data[0]
                    ).toString();
                    const tokenIds = data[1].map((item) =>
                        TokenId.fromSolidityAddress(item).toString()
                    );
                    await dataBaseServer.deleteEntity(RetireRequest, {
                        $and: [
                            {
                                contractId,
                                user,
                            },
                            {
                                $or: [
                                    {
                                        tokenIds: { $eq: [...tokenIds] },
                                    },
                                    {
                                        tokenIds: { $eq: tokenIds.reverse() },
                                    },
                                ],
                            },
                        ],
                    } as FilterObject<RetireRequest>);
                    break;
                }
                case 'PoolsCleared': {
                    const count = Number(data[0]);
                    await dataBaseServer.deleteEntity(RetirePool, {
                        tokens: { $size: count },
                    } as FilterObject<RetirePool>);
                    if (!sendNotifications) {
                        break;
                    }
                    Promise.all(
                        contractOwnerIds.map((user) =>
                            NotificationHelper.info(
                                `Pools cleared in contract: ${contractId}`,
                                `All ${count === 1 ? 'single' : 'double'
                                } pools cleared`,
                                user
                            )
                        )
                    );
                    break;
                }
                case 'RequestsCleared': {
                    const count = Number(data[0]);
                    await dataBaseServer.deleteEntity(RetireRequest, {
                        tokens: { $size: count },
                    } as FilterObject<RetireRequest>);
                    if (!sendNotifications) {
                        break;
                    }
                    Promise.all(
                        contractOwnerIds.map((user) =>
                            NotificationHelper.info(
                                `Requests cleared in contract: ${contractId}`,
                                `All ${count === 1 ? 'single' : 'double'
                                } requests cleared`,
                                user
                            )
                        )
                    );
                    break;
                }
                default:
                    break;
            }
        }
        lastTimeStamp = result[result.length - 1].timestamp;
        timestamps.push(lastTimeStamp);
    }

    if (!lastTimeStamp) {
        return;
    }

    const contracts = await dataBaseServer.find(Contract, {
        contractId,
    });
    await dataBaseServer.update(
        Contract,
        null,
        contracts.map((contract) => {
            contract.lastSyncEventTimeStamp = lastTimeStamp;
            contract.syncDisabled = false;
            return contract;
        })
    );
}

async function isContractWiper(
    workers: Workers,
    contractId: string,
    retireContractId: string
): Promise<boolean> {
    if (!contractId || !retireContractId) {
        return false;
    }
    const timestamps = [undefined];
    while (timestamps.length) {
        const timestamp = timestamps.pop();
        const result = await workers.addNonRetryableTask(
            {
                type: WorkerTaskType.GET_CONTRACT_EVENTS,
                data: {
                    contractId,
                    timestamp: timestamp ? `lt:${timestamp}` : null,
                    order: 'desc',
                },
            },
            20,
            null
        );

        if (!result || !result.length) {
            break;
        }

        for (const log of result) {
            const eventName = wipeEventsAbi.getEventName(log.topics[0]);
            const data = wipeEventsAbi.decodeEventLog(eventName, log.data);

            switch (eventName) {
                case 'WiperAdded': {
                    if (
                        AccountId.fromSolidityAddress(data[0]).toString() ===
                        retireContractId
                    ) {
                        return true;
                    }
                    break;
                }
                case 'WiperRemoved': {
                    if (
                        AccountId.fromSolidityAddress(data[0]).toString() ===
                        retireContractId
                    ) {
                        return false;
                    }
                    break;
                }
                default:
                    break;
            }
        }

        timestamps.push(result[result.length - 1].timestamp);
    }
}

async function getContractPermissions(
    workers: Workers,
    contractId: string,
    hederaAccountId: string,
    hederaAccountKey: string
) {
    const result = Buffer.from(
        await contractQuery(
            ContractAPI.CONTRACT_PERMISSIONS,
            workers,
            contractId,
            hederaAccountId,
            hederaAccountKey,
            'permissions'
        )
    );
    return Number(new ethers.AbiCoder().decode(['uint8'], result)[0]);
}

async function saveRetireVC(
    dataBaseServer: DatabaseServer,
    contractId: string,
    owner: IOwner,
    hederaAccountId: string,
    hederaAccountKey: string,
    userHederaAccountId: string,
    tokens: (RetireTokenRequest & { decimals: number })[]
) {
    const contract = await dataBaseServer.findOne(Contract, {
        contractId,
        owner: owner.creator,
    });

    const topicConfig = await TopicConfig.fromObject({
        topicId: contract.topicId,
        type: TopicType.RetireTopic,
    } as any);

    const messageServer = new MessageServer(hederaAccountId, hederaAccountKey);
    messageServer.setTopicObject(topicConfig);

    const userTopic = await TopicConfig.fromObject(
        await dataBaseServer.findOne(Topic, {
            owner: owner.creator,
            type: TopicType.UserTopic,
        }),
        true
    );

    let schema = await dataBaseServer.findOne(SchemaCollection, {
        entity: SchemaEntity.RETIRE_TOKEN,
        readonly: true,
        topicId: userTopic.topicId,
    });
    if (!schema) {
        schema = await dataBaseServer.findOne(SchemaCollection, {
            entity: SchemaEntity.RETIRE_TOKEN,
            system: true,
            active: true,
        });
        if (schema) {
            schema.creator = owner.creator;
            schema.owner = owner.owner;
            const item = await publishSystemSchema(
                schema,
                owner,
                messageServer,
                MessageAction.PublishSystemSchema,
                emptyNotifier()
            );
            await dataBaseServer.save(SchemaCollection, item);
        }
    }

    const schemaObject = new Schema(schema);
    const vcHelper = new VcHelper();

    let credentialSubject: any = {
        user: userHederaAccountId,
        contractId,
        tokens: tokens.map((token) => ({
            tokenId: token.token,
            count: Math.floor(token.count / Math.pow(10, token.decimals)),
            serials: token.serials,
        })),
    };
    credentialSubject.id = owner.creator;

    if (schemaObject) {
        credentialSubject = SchemaHelper.updateObjectContext(
            schemaObject,
            credentialSubject
        );
    }

    const didDocument = await vcHelper.loadDidDocument(owner.creator);
    const vcObject = await vcHelper.createVerifiableCredential(credentialSubject, didDocument, null, null);

    const vcMessage = new VCMessage(MessageAction.CreateVC);
    vcMessage.setDocument(vcObject);
    await messageServer.sendMessage(vcMessage);

    await dataBaseServer.save(VcDocumentCollection, {
        hash: vcMessage.hash,
        owner: owner.creator,
        document: vcMessage.document,
        type: schemaObject?.entity,
        documentFields: ['credentialSubject.0.user'],
    });
}

/**
 * Connect to the message broker methods of working with contracts.
 */
export async function contractAPI(
    dataBaseServer: DatabaseServer,
    logger: PinoLogger,
): Promise<void> {
    ApiResponse(ContractAPI.GET_CONTRACTS, async (msg: {
        owner: IOwner,
        type: ContractType,
        pageIndex?: any,
        pageSize?: any
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { pageIndex, pageSize, owner, type } = msg;

            if (!type) {
                return new MessageError('Type is required');
            }
            if (!owner.owner) {
                return new MessageError('User is required');
            }

            const otherOptions: any = {};
            const _pageSize = parseInt(pageSize, 10);
            const _pageIndex = parseInt(pageIndex, 10);
            if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = Math.min(100, _pageSize);
                otherOptions.offset = _pageIndex * _pageSize;
            } else {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = 100;
            }

            return new MessageResponse(
                await dataBaseServer.findAndCount(
                    Contract,
                    {
                        owner: owner.owner,
                        type,
                    },
                    otherOptions
                )
            );
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.CREATE_CONTRACT, async (msg: {
        owner: IOwner,
        description: string,
        type: ContractType
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { description, owner, type } = msg;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner.creator);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner.creator
            );
            const signOptions = await wallet.getUserSignOptions(root);

            const topicHelper = new TopicHelper(root.hederaAccountId, rootKey, signOptions);
            const topic = await topicHelper.create(
                {
                    type: TopicType.ContractTopic,
                    name: TopicType.ContractTopic,
                    description: TopicType.ContractTopic,
                    owner: owner.creator,
                    policyId: null,
                    policyUUID: null,
                },
                {
                    admin: true,
                    submit: false,
                }
            );

            const contractId = await createContract(
                ContractAPI.CREATE_CONTRACT,
                workers,
                type,
                root.hederaAccountId,
                rootKey,
                topic.topicId
            );

            await topic.saveKeys();
            await DatabaseServer.saveTopic(topic.toObject());

            const contract = await dataBaseServer.save(Contract, {
                contractId,
                owner: owner.creator,
                description,
                permissions: type === ContractType.WIPE ? 15 : 3,
                type,
                topicId: topic.topicId,
                wipeContractIds: [],
            });

            const contractMessage = new ContractMessage(
                MessageAction.CreateContract
            );
            contractMessage.setDocument(contract);
            const messageServer = new MessageServer(
                root.hederaAccountId,
                rootKey,
                signOptions
            );
            const contractMessageResult = await messageServer
                .setTopicObject(topic)
                .sendMessage(contractMessage);
            const userTopic = await TopicConfig.fromObject(
                await DatabaseServer.getTopicByType(owner.creator, TopicType.UserTopic),
                true
            );
            await topicHelper.twoWayLink(topic, userTopic, contractMessageResult.getId());
            return new MessageResponse(contract);
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.IMPORT_CONTRACT, async (msg: {
        owner: IOwner,
        contractId: string,
        description: string
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid contract identifier');
            }
            const { contractId, owner, description } = msg;

            if (!contractId) {
                throw new Error('Contract identifier is required');
            }
            if (!owner.creator) {
                throw new Error('DID is required');
            }

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner.creator);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner.creator
            );

            const permissions = await getContractPermissions(
                workers,
                contractId,
                root.hederaAccountId,
                rootKey
            );

            const { memo } = await workers.addNonRetryableTask(
                {
                    type: WorkerTaskType.GET_CONTRACT_INFO,
                    data: {
                        contractId,
                        hederaAccountId: root.hederaAccountId,
                        hederaAccountKey: rootKey,
                    },
                },
                20,
                null
            );

            const message = await workers.addRetryableTask(
                {
                    type: WorkerTaskType.GET_TOPIC_MESSAGE_BY_INDEX,
                    data: {
                        topic: memo,
                        index: 1,
                    },
                },
                10
            );

            const contractMessage = ContractMessage.fromMessage(
                message?.message
            );

            const existingContract = await dataBaseServer.findOne(Contract, {
                contractId,
            });

            const contract = await dataBaseServer.save(
                Contract,
                {
                    contractId,
                    owner: owner.creator,
                    description,
                    permissions,
                    topicId: memo,
                    type: contractMessage.contractType,
                    wipeContractIds: [],
                    lastSyncEventTimeStamp:
                        existingContract?.lastSyncEventTimeStamp,
                    syncPoolsDate: existingContract?.syncPoolsDate,
                    syncRequestsDate: existingContract?.syncRequestsDate,
                    syncDisabled: existingContract
                        ? existingContract?.syncDisabled
                        : true,
                },
                {
                    contractId,
                    owner: owner.creator,
                }
            );
            if (
                !existingContract &&
                contractMessage.contractType === ContractType.RETIRE
            ) {
                await syncRetireContract(
                    dataBaseServer,
                    workers,
                    users,
                    contractId,
                    existingContract?.lastSyncEventTimeStamp,
                    false
                );
            } else if (
                !existingContract &&
                contractMessage.contractType === ContractType.WIPE
            ) {
                await syncWipeContract(
                    dataBaseServer,
                    workers,
                    users,
                    contractId,
                    existingContract?.lastSyncEventTimeStamp,
                    false
                );
            }

            return new MessageResponse(contract);
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.CONTRACT_PERMISSIONS, async (msg: {
        owner: IOwner,
        id: string
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }

            const contract = await  dataBaseServer.findOne(Contract, id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner.creator);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner.creator
            );

            const permissions = await getContractPermissions(
                workers,
                contractId,
                root.hederaAccountId,
                rootKey
            );

            await dataBaseServer.update(
                Contract,
                {
                    contractId,
                    owner: owner.creator,
                },
                {
                    permissions,
                }
            );
            return new MessageResponse(permissions);
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.REMOVE_CONTRACT,
        async (msg: { owner: IOwner, id: string }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid get contract parameters');
                }

                const { owner, id } = msg;

                if (!id) {
                    throw new Error('Invalid contract identifier');
                }
                if (!owner.creator) {
                    throw new Error('Invalid contract owner');
                }

                const contract = await dataBaseServer.findOne(Contract, id, {
                    fields: ['contractId'],
                });
                if (!contract) {
                    throw new Error('Contract not found');
                }
                const contractId = contract.contractId;

                await dataBaseServer.deleteEntity(Contract, {
                    contractId,
                    owner: owner.creator,
                });

                const existingContracts = await dataBaseServer.count(Contract, {
                    contractId,
                });
                if (existingContracts < 1) {
                    await dataBaseServer.deleteEntity(RetirePool, {
                        contractId,
                    });
                    await dataBaseServer.deleteEntity(RetireRequest, {
                        contractId,
                    });
                }
                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(ContractAPI.GET_WIPE_REQUESTS, async (msg: {
        owner: IOwner,
        contractId?: string,
        pageIndex?: any,
        pageSize?: any
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { pageIndex, pageSize, owner, contractId } = msg;

            if (!owner.owner) {
                return new MessageError('User is required');
            }

            const otherOptions: any = {};
            const _pageSize = parseInt(pageSize, 10);
            const _pageIndex = parseInt(pageIndex, 10);
            if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = Math.min(100, _pageSize);
                otherOptions.offset = _pageIndex * _pageSize;
            } else {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = 100;
            }

            const contractFilters: any = {
                owner: owner.owner,
            };
            if (contractId) {
                contractFilters.contractId = contractId;
            }
            const contracts = await dataBaseServer.find(Contract, contractFilters);

            return new MessageResponse(
                await dataBaseServer.findAndCount(
                    WiperRequest,
                    {
                        contractId: {
                            $in: contracts.map((item) => item.contractId),
                        },
                    },
                    otherOptions
                )
            );
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.ENABLE_WIPE_REQUESTS,
        async (msg: { owner: IOwner, id: string }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid get contract parameters');
                }

                const { owner, id } = msg;

                if (!id) {
                    throw new Error('Invalid contract identifier');
                }
                if (!owner.creator) {
                    throw new Error('Invalid contract owner');
                }

                const contract = await dataBaseServer.findOne(Contract, id, {
                    fields: ['contractId'],
                });
                if (!contract) {
                    throw new Error('Contract not found');
                }
                const contractId = contract.contractId;

                const users = new Users();
                const wallet = new Wallet();
                const workers = new Workers();
                const root = await users.getUserById(owner.creator);
                const rootKey = await wallet.getKey(
                    root.walletToken,
                    KeyType.KEY,
                    owner.creator
                );

                await contractCall(
                    ContractAPI.ENABLE_WIPE_REQUESTS,
                    workers,
                    contractId,
                    root.hederaAccountId,
                    rootKey,
                    'enableRequests'
                );

                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(ContractAPI.DISABLE_WIPE_REQUESTS,
        async (msg: { owner: IOwner, id: string }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid get contract parameters');
                }

                const { owner, id } = msg;

                if (!id) {
                    throw new Error('Invalid contract identifier');
                }
                if (!owner.creator) {
                    throw new Error('Invalid contract owner');
                }

                const contract = await dataBaseServer.findOne(Contract, id, {
                    fields: ['contractId'],
                });
                if (!contract) {
                    throw new Error('Contract not found');
                }
                const contractId = contract.contractId;

                const users = new Users();
                const wallet = new Wallet();
                const workers = new Workers();
                const root = await users.getUserById(owner.creator);
                const rootKey = await wallet.getKey(
                    root.walletToken,
                    KeyType.KEY,
                    owner.creator
                );

                await contractCall(
                    ContractAPI.DISABLE_WIPE_REQUESTS,
                    workers,
                    contractId,
                    root.hederaAccountId,
                    rootKey,
                    'disableRequests'
                );

                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(ContractAPI.APPROVE_WIPE_REQUEST,
        async (msg: { owner: IOwner, requestId: string }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid get contract parameters');
                }

                const { owner, requestId } = msg;

                if (!owner.creator) {
                    throw new Error('Invalid contract owner');
                }
                if (!requestId) {
                    throw new Error('Invalid request identifier');
                }

                const request = await dataBaseServer.findOne(WiperRequest, {
                    id: requestId,
                });
                if (!request) {
                    throw new Error('Request is not found');
                }

                const users = new Users();
                const wallet = new Wallet();
                const workers = new Workers();
                const root = await users.getUserById(owner.creator);
                const rootKey = await wallet.getKey(
                    root.walletToken,
                    KeyType.KEY,
                    owner.creator
                );

                await contractCall(
                    ContractAPI.APPROVE_WIPE_REQUEST,
                    workers,
                    request.contractId,
                    root.hederaAccountId,
                    rootKey,
                    'approve',
                    [
                        {
                            type: ContractParamType.ADDRESS,
                            value: AccountId.fromString(
                                request.user
                            ).toSolidityAddress(),
                        },
                    ]
                );

                await dataBaseServer.remove(WiperRequest, request);

                await setContractWiperPermissions(
                    dataBaseServer,
                    request.user,
                    request.contractId,
                    true
                );

                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(ContractAPI.REJECT_WIPE_REQUEST, async (msg: {
        owner: IOwner,
        requestId: string,
        ban: boolean
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, requestId, ban } = msg;

            if (!owner.creator) {
                throw new Error('Invalid contract owner');
            }
            if (!requestId) {
                throw new Error('Invalid hedera identifier');
            }

            const request = await dataBaseServer.findOne(WiperRequest, {
                id: requestId,
            });
            if (!request) {
                throw new Error('Request is not found');
            }

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner.creator);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner.creator
            );

            await contractCall(
                ContractAPI.REJECT_WIPE_REQUEST,
                workers,
                request.contractId,
                root.hederaAccountId,
                rootKey,
                'reject',
                [
                    {
                        type: ContractParamType.ADDRESS,
                        value: AccountId.fromString(
                            request.user
                        ).toSolidityAddress(),
                    },
                    {
                        type: ContractParamType.BOOL,
                        value: ban,
                    },
                ]
            );

            await dataBaseServer.remove(WiperRequest, request);

            return new MessageResponse(true);
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.CLEAR_WIPE_REQUESTS,
        async (msg: { owner: IOwner, id: string }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid get contract parameters');
                }

                const { owner, id } = msg;

                if (!id) {
                    throw new Error('Invalid contract identifier');
                }
                if (!owner.creator) {
                    throw new Error('Invalid contract owner');
                }

                const contract = await dataBaseServer.findOne(Contract, id, {
                    fields: ['contractId'],
                });
                if (!contract) {
                    throw new Error('Contract not found');
                }
                const contractId = contract.contractId;

                const users = new Users();
                const wallet = new Wallet();
                const workers = new Workers();
                const root = await users.getUserById(owner.creator);
                const rootKey = await wallet.getKey(
                    root.walletToken,
                    KeyType.KEY,
                    owner.creator
                );

                await contractCall(
                    ContractAPI.CLEAR_WIPE_REQUESTS,
                    workers,
                    contractId,
                    root.hederaAccountId,
                    rootKey,
                    'clear'
                );

                await dataBaseServer.deleteEntity(WiperRequest, {
                    contractId,
                });

                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(ContractAPI.ADD_WIPE_ADMIN, async (msg: {
        owner: IOwner,
        id: string,
        hederaId: string
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id, hederaId } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner.creator) {
                throw new Error('Invalid contract owner');
            }
            if (!hederaId) {
                throw new Error('Invalid hedera identifier');
            }

            const contract = await dataBaseServer.findOne(Contract, id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner.creator);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner.creator
            );

            await contractCall(
                ContractAPI.ADD_WIPE_ADMIN,
                workers,
                contractId,
                root.hederaAccountId,
                rootKey,
                'addAdmin',
                [
                    {
                        type: ContractParamType.ADDRESS,
                        value: AccountId.fromString(
                            hederaId
                        ).toSolidityAddress(),
                    },
                ]
            );

            return new MessageResponse(true);
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.REMOVE_WIPE_ADMIN, async (msg: {
        owner: IOwner,
        id: string,
        hederaId: string
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id, hederaId } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner.creator) {
                throw new Error('Invalid contract owner');
            }
            if (!hederaId) {
                throw new Error('Invalid hedera identifier');
            }

            const contract = await dataBaseServer.findOne(Contract, id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner.creator);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner.creator
            );

            await contractCall(
                ContractAPI.REMOVE_WIPE_ADMIN,
                workers,
                contractId,
                root.hederaAccountId,
                rootKey,
                'removeAdmin',
                [
                    {
                        type: ContractParamType.ADDRESS,
                        value: AccountId.fromString(
                            hederaId
                        ).toSolidityAddress(),
                    },
                ]
            );

            return new MessageResponse(true);
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.ADD_WIPE_MANAGER, async (msg: {
        owner: IOwner,
        id: string,
        hederaId: string
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id, hederaId } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner.creator) {
                throw new Error('Invalid contract owner');
            }
            if (!hederaId) {
                throw new Error('Invalid hedera identifier');
            }

            const contract = await dataBaseServer.findOne(Contract, id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner.creator);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner.creator
            );

            await contractCall(
                ContractAPI.ADD_WIPE_MANAGER,
                workers,
                contractId,
                root.hederaAccountId,
                rootKey,
                'addManager',
                [
                    {
                        type: ContractParamType.ADDRESS,
                        value: AccountId.fromString(
                            hederaId
                        ).toSolidityAddress(),
                    },
                ]
            );

            return new MessageResponse(true);
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.REMOVE_WIPE_MANAGER, async (msg: {
        owner: IOwner,
        id: string,
        hederaId: string
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id, hederaId } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner.creator) {
                throw new Error('Invalid contract owner');
            }
            if (!hederaId) {
                throw new Error('Invalid hedera identifier');
            }

            const contract = await dataBaseServer.findOne(Contract, id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner.creator);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner.creator
            );

            await contractCall(
                ContractAPI.REMOVE_WIPE_MANAGER,
                workers,
                contractId,
                root.hederaAccountId,
                rootKey,
                'removeManager',
                [
                    {
                        type: ContractParamType.ADDRESS,
                        value: AccountId.fromString(
                            hederaId
                        ).toSolidityAddress(),
                    },
                ]
            );

            return new MessageResponse(true);
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.ADD_WIPE_WIPER, async (msg: {
        owner: IOwner,
        id: string,
        hederaId: string
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id, hederaId } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner.creator) {
                throw new Error('Invalid contract owner');
            }
            if (!hederaId) {
                throw new Error('Invalid hedera identifier');
            }

            const contract = await dataBaseServer.findOne(Contract, id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner.creator);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner.creator
            );

            await contractCall(
                ContractAPI.ADD_WIPE_WIPER,
                workers,
                contractId,
                root.hederaAccountId,
                rootKey,
                'addWiper',
                [
                    {
                        type: ContractParamType.ADDRESS,
                        value: AccountId.fromString(
                            hederaId
                        ).toSolidityAddress(),
                    },
                ]
            );

            return new MessageResponse(true);
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.REMOVE_WIPE_WIPER, async (msg: {
        owner: IOwner,
        id: string,
        hederaId: string
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id, hederaId } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner.creator) {
                throw new Error('Invalid contract owner');
            }
            if (!hederaId) {
                throw new Error('Invalid hedera identifier');
            }

            const contract = await dataBaseServer.findOne(Contract, id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner.creator);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner.creator
            );

            await contractCall(
                ContractAPI.REMOVE_WIPE_WIPER,
                workers,
                contractId,
                root.hederaAccountId,
                rootKey,
                'removeWiper',
                [
                    {
                        type: ContractParamType.ADDRESS,
                        value: AccountId.fromString(
                            hederaId
                        ).toSolidityAddress(),
                    },
                ]
            );

            return new MessageResponse(true);
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.SYNC_RETIRE_POOLS,
        async (msg: { owner: IOwner, id: string }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid get contract parameters');
                }

                const { owner, id } = msg;

                if (!id) {
                    throw new Error('Invalid contract identifier');
                }
                if (!owner.creator) {
                    throw new Error('Invalid owner');
                }

                const contract = await dataBaseServer.findOne(Contract, id, {
                    fields: ['contractId'],
                });
                if (!contract) {
                    throw new Error('Contract not found');
                }
                const contractId = contract.contractId;
                const workers = new Workers();

                const pools = await dataBaseServer.find(RetirePool, {
                    contractId,
                });

                const handledContracts = new Set<string>();
                //const handledTokens = new Set<string>();
                for (const pool of pools) {
                    for (const token of pool.tokens) {
                        // if (handledTokens.has(token.token)) {
                        //     continue;
                        // }
                        // handledTokens.add(token.token);
                        const tokenInfo = await workers.addRetryableTask(
                            {
                                type: WorkerTaskType.GET_TOKEN_INFO,
                                data: { tokenId: token.token },
                            },
                            10
                        );
                        token.contract = getTokenContractId(tokenInfo.wipe_key);
                        if (handledContracts.has(token.contract)) {
                            continue;
                        }
                        handledContracts.add(token.contract);
                        const isWiper = await isContractWiper(
                            workers,
                            token.contract,
                            contractId
                        );
                        await setContractWiperPermissions(
                            dataBaseServer,
                            contractId,
                            token.contract,
                            isWiper
                        );
                    }
                    // tslint:disable-next-line:no-shadowed-variable
                    const contract = await dataBaseServer.findOne(Contract, {
                        contractId,
                    });

                    pool.enabled =
                        pool.tokens.findIndex(
                            (token) =>
                                !contract.wipeContractIds.includes(token.contract)
                        ) < 0;
                }

                await dataBaseServer.update(RetirePool, null, pools);

                const syncDate = new Date();

                const contracts = await dataBaseServer.find(Contract, {
                    contractId,
                });

                await dataBaseServer.update(
                    Contract,
                    null,
                    // tslint:disable-next-line:no-shadowed-variable
                    contracts.map((contract) => {
                        contract.syncPoolsDate = syncDate;
                        return contract;
                    })
                );

                return new MessageResponse(syncDate);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(ContractAPI.GET_RETIRE_REQUESTS, async (msg: {
        owner: IOwner,
        contractId?: string,
        pageIndex?: any,
        pageSize?: any
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { pageIndex, pageSize, owner, contractId } = msg;

            if (!owner.creator) {
                return new MessageError('User is required');
            }

            const otherOptions: any = {};
            const _pageSize = parseInt(pageSize, 10);
            const _pageIndex = parseInt(pageIndex, 10);
            if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = Math.min(100, _pageSize);
                otherOptions.offset = _pageIndex * _pageSize;
            } else {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = 100;
            }

            const users = new Users();
            const user = await users.getUserById(owner.creator);

            const filters: any = {};
            if (contractId) {
                filters.contractId = contractId;
            }

            let result: any;
            if (user.role === UserRole.STANDARD_REGISTRY) {
                if (!filters.contractId) {
                    const contracts = await dataBaseServer.find(Contract, {
                        owner: owner.creator,
                    });
                    filters.contractId = {
                        $in: contracts.map((item) => item.id),
                    };
                }
                result = await dataBaseServer.findAndCount(RetireRequest, filters, otherOptions);
            } else if (user.role === UserRole.USER) {
                filters.user = user.hederaAccountId;
                result = await dataBaseServer.findAndCount(RetireRequest, filters, otherOptions);
            }
            return new MessageResponse(result);
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.GET_RETIRE_POOLS, async (msg: {
        owner: IOwner,
        tokens?: string[],
        contractId?: string,
        pageIndex?: any,
        pageSize?: any
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { pageIndex, pageSize, owner, contractId, tokens } = msg;

            if (!owner.creator) {
                return new MessageError('User is requred');
            }

            const otherOptions: any = {};
            const _pageSize = parseInt(pageSize, 10);
            const _pageIndex = parseInt(pageIndex, 10);
            if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = Math.min(100, _pageSize);
                otherOptions.offset = _pageIndex * _pageSize;
            } else {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = 100;
            }

            const users = new Users();
            const user = await users.getUserById(owner.creator);

            const filters: any = {
                $and: [],
            };

            if (user.role === UserRole.USER) {
                filters.$and.push({ enabled: true });
            }

            if (contractId) {
                filters.$and.push({ contractId });
            } else {
                const contracts = await dataBaseServer.find(Contract, {
                    type: ContractType.RETIRE,
                    owner: owner.owner,
                });
                filters.$and.push({
                    contractId: {
                        $in: contracts.map((contract) => contract.contractId),
                    },
                });
            }
            if (Array.isArray(tokens) && tokens.length > 0) {
                filters.$and.push(
                    ...tokens.map((token) => ({
                        tokenIds: token,
                    }))
                );
            }

            return new MessageResponse(
                await dataBaseServer.findAndCount(RetirePool, filters, otherOptions)
            );
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.CLEAR_RETIRE_REQUESTS,
        async (msg: { owner: IOwner, id: string }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid get contract parameters');
                }

                const { owner, id } = msg;

                if (!id) {
                    throw new Error('Invalid contract identifier');
                }
                if (!owner.creator) {
                    throw new Error('Invalid contract owner');
                }

                const contract = await dataBaseServer.findOne(Contract, id, {
                    fields: ['contractId'],
                });
                if (!contract) {
                    throw new Error('Contract not found');
                }
                const contractId = contract.contractId;

                const users = new Users();
                const wallet = new Wallet();
                const workers = new Workers();
                const root = await users.getUserById(owner.creator);
                const rootKey = await wallet.getKey(
                    root.walletToken,
                    KeyType.KEY,
                    owner.creator
                );

                await contractCall(
                    ContractAPI.CLEAR_RETIRE_REQUESTS,
                    workers,
                    contractId,
                    root.hederaAccountId,
                    rootKey,
                    'clearRequests',
                    [
                        {
                            type: ContractParamType.UINT8,
                            value: 1,
                        },
                    ]
                );
                await contractCall(
                    ContractAPI.CLEAR_RETIRE_REQUESTS,
                    workers,
                    contractId,
                    root.hederaAccountId,
                    rootKey,
                    'clearRequests',
                    [
                        {
                            type: ContractParamType.UINT8,
                            value: 2,
                        },
                    ]
                );

                await dataBaseServer.deleteEntity(RetireRequest, {
                    contractId,
                });

                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(ContractAPI.CLEAR_RETIRE_POOLS,
        async (msg: { owner: IOwner, id: string }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid get contract parameters');
                }

                const { owner, id } = msg;

                if (!id) {
                    throw new Error('Invalid contract identifier');
                }
                if (!owner.creator) {
                    throw new Error('Invalid contract owner');
                }

                const contract = await dataBaseServer.findOne(Contract, id, {
                    fields: ['contractId'],
                });
                if (!contract) {
                    throw new Error('Contract not found');
                }
                const contractId = contract.contractId;

                const users = new Users();
                const wallet = new Wallet();
                const workers = new Workers();
                const root = await users.getUserById(owner.creator);
                const rootKey = await wallet.getKey(
                    root.walletToken,
                    KeyType.KEY,
                    owner.creator
                );

                await contractCall(
                    ContractAPI.CLEAR_RETIRE_POOLS,
                    workers,
                    contractId,
                    root.hederaAccountId,
                    rootKey,
                    'clearPools',
                    [
                        {
                            type: ContractParamType.UINT8,
                            value: 1,
                        },
                    ]
                );
                await contractCall(
                    ContractAPI.CLEAR_RETIRE_POOLS,
                    workers,
                    contractId,
                    root.hederaAccountId,
                    rootKey,
                    'clearPools',
                    [
                        {
                            type: ContractParamType.UINT8,
                            value: 2,
                        },
                    ]
                );

                await dataBaseServer.deleteEntity(RetirePool, {
                    contractId,
                });

                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(ContractAPI.SET_RETIRE_POOLS, async (msg: {
        owner: IOwner,
        id: string,
        options: { tokens: RetireTokenPool[]; immediately: boolean }
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid add contract pair parameters');
            }

            const { owner, id, options } = msg;

            if (!id) {
                throw new Error('Contract identifier is required');
            }
            if (!owner.creator) {
                throw new Error('Owner is required');
            }
            if (!options) {
                throw new Error('Options are required');
            }

            const contract = await dataBaseServer.findOne(Contract, id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner.creator);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner.creator
            );

            await setPoolContract(
                workers,
                contractId,
                root.hederaAccountId,
                rootKey,
                options.tokens,
                options.immediately
            );

            return new MessageResponse(
                await setPool(
                    workers,
                    // contractRepository,
                    // retirePoolRepository,
                    dataBaseServer,
                    contractId,
                    options
                )
            );
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.UNSET_RETIRE_POOLS,
        async (msg: { owner: IOwner, poolId: string }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid add contract pair parameters');
                }

                const { owner, poolId } = msg;

                if (!owner.creator) {
                    throw new Error('Owner is required');
                }
                if (!poolId) {
                    throw new Error('Pool identifier is required');
                }

                const pool = await dataBaseServer.findOne(RetirePool, {
                    id: poolId,
                });

                if (!pool) {
                    throw new Error('Pool is not found');
                }

                const users = new Users();
                const wallet = new Wallet();
                const workers = new Workers();
                const root = await users.getUserById(owner.creator);
                const rootKey = await wallet.getKey(
                    root.walletToken,
                    KeyType.KEY,
                    owner.creator
                );

                const result = await contractCall(
                    ContractAPI.UNSET_RETIRE_POOLS,
                    workers,
                    pool.contractId,
                    root.hederaAccountId,
                    rootKey,
                    'unsetPool',
                    [
                        {
                            type: ContractParamType.ADDRESS_ARRAY,
                            value: pool.tokens.map((token) =>
                                TokenId.fromString(token.token).toSolidityAddress()
                            ),
                        },
                    ]
                );

                await dataBaseServer.remove(RetirePool, pool);

                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(ContractAPI.UNSET_RETIRE_REQUEST,
        async (msg: { owner: IOwner, requestId: string }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid add contract pair parameters');
                }

                const { owner, requestId } = msg;

                if (!owner.creator) {
                    throw new Error('Owner is required');
                }
                if (!requestId) {
                    throw new Error('Pool identifier is required');
                }

                const request = await dataBaseServer.findOne(RetireRequest, {
                    id: requestId,
                });

                if (!request) {
                    throw new Error('Request is not found');
                }

                const users = new Users();
                const wallet = new Wallet();
                const workers = new Workers();
                const root = await users.getUserById(owner.creator);
                const rootKey = await wallet.getKey(
                    root.walletToken,
                    KeyType.KEY,
                    owner.creator
                );

                const result = await contractCall(
                    ContractAPI.UNSET_RETIRE_REQUEST,
                    workers,
                    request.contractId,
                    root.hederaAccountId,
                    rootKey,
                    'unsetRequest',
                    [
                        {
                            type: ContractParamType.ADDRESS,
                            value: AccountId.fromString(
                                request.user
                            ).toSolidityAddress(),
                        },
                        {
                            type: ContractParamType.ADDRESS_ARRAY,
                            value: request.tokens.map((token) =>
                                TokenId.fromString(token.token).toSolidityAddress()
                            ),
                        },
                    ]
                );
                await dataBaseServer.remove(RetireRequest, request);

                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(ContractAPI.RETIRE, async (msg: {
        owner: IOwner,
        poolId: string,
        tokens: RetireTokenRequest[]
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid add contract pair parameters');
            }

            let {
                // tslint:disable-next-line:prefer-const
                owner,
                // tslint:disable-next-line:prefer-const
                poolId,
                tokens,
            } = msg;

            if (!owner.creator) {
                throw new Error('User is required');
            }
            if (!poolId) {
                throw new Error('Pool identifier is required');
            }

            const pool = await dataBaseServer.findOne(RetirePool, {
                id: poolId,
            });
            if (!pool) {
                throw new Error('Pool is not found');
            }

            tokens = tokens.map((token) => {
                token.count = Math.floor(token.count);
                return token;
            });

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner.creator);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner.creator
            );

            const sr = await users.getUserById(root.parent || root.did);
            const srKey = await wallet.getKey(
                sr.walletToken,
                KeyType.KEY,
                sr.did
            );
            await customContractCall(
                ContractAPI.RETIRE,
                workers,
                pool.contractId,
                root.hederaAccountId,
                rootKey,
                retireAbi.encodeFunctionData('retire', [
                    tokens.map((token) => [
                        TokenId.fromString(token.token).toSolidityAddress(),
                        token.count,
                        token.serials,
                    ]),
                ])
            );

            const srUser = EntityOwner.sr(sr.id, sr.did);
            if (pool.immediately) {
                await saveRetireVC(
                    // contractRepository,
                    dataBaseServer,
                    pool.contractId,
                    srUser,
                    sr.hederaAccountId,
                    srKey,
                    root.hederaAccountId,
                    tokens.map((token) => {
                        const newToken: any = {
                            ...token,
                        };
                        const poolToken = pool.tokens.find(
                            // tslint:disable-next-line:no-shadowed-variable
                            (poolToken) => (poolToken.token = token.token)
                        );
                        newToken.decimals = poolToken.decimals;
                        return newToken;
                    })
                );
            }

            return new MessageResponse(pool.immediately);
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.APPROVE_RETIRE,
        async (msg: { owner: IOwner, requestId: string }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid add contract pair parameters');
                }

                const { owner, requestId } = msg;

                if (!owner.creator) {
                    throw new Error('Owner is required');
                }
                if (!requestId) {
                    throw new Error('Pool identifier is required');
                }

                const request = await dataBaseServer.findOne(RetireRequest, {
                    id: requestId,
                });

                if (!request) {
                    throw new Error('Request is not found');
                }

                const users = new Users();
                const wallet = new Wallet();
                const workers = new Workers();
                const root = await users.getUserById(owner.creator);
                const rootKey = await wallet.getKey(
                    root.walletToken,
                    KeyType.KEY,
                    owner.creator
                );

                const result = await contractCall(
                    ContractAPI.APPROVE_RETIRE,
                    workers,
                    request.contractId,
                    root.hederaAccountId,
                    rootKey,
                    'approveRetire',
                    [
                        {
                            type: ContractParamType.ADDRESS,
                            value: AccountId.fromString(
                                request.user
                            ).toSolidityAddress(),
                        },
                        {
                            type: ContractParamType.ADDRESS_ARRAY,
                            value: request.tokens.map((token) =>
                                TokenId.fromString(token.token).toSolidityAddress()
                            ),
                        },
                    ]
                );

                await saveRetireVC(
                    dataBaseServer,
                    request.contractId,
                    owner,
                    root.hederaAccountId,
                    rootKey,
                    request.user,
                    request.tokens
                );

                await dataBaseServer.remove(RetireRequest, request);

                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(ContractAPI.CANCEL_RETIRE,
        async (msg: { owner: IOwner, requestId: string }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid add contract pair parameters');
                }

                const { owner, requestId } = msg;

                if (!owner.creator) {
                    throw new Error('Owner is required');
                }
                if (!requestId) {
                    throw new Error('Pool identifier is required');
                }

                const request = await dataBaseServer.findOne(RetireRequest, {
                    id: requestId,
                });

                if (!request) {
                    throw new Error('Request is not found');
                }

                const users = new Users();
                const wallet = new Wallet();
                const workers = new Workers();
                const root = await users.getUserById(owner.creator);
                const rootKey = await wallet.getKey(
                    root.walletToken,
                    KeyType.KEY,
                    owner.creator
                );

                const result = await contractCall(
                    ContractAPI.CANCEL_RETIRE,
                    workers,
                    request.contractId,
                    root.hederaAccountId,
                    rootKey,
                    'cancelRetire',
                    [
                        {
                            type: ContractParamType.ADDRESS_ARRAY,
                            value: request.tokens.map((token) =>
                                TokenId.fromString(token.token).toSolidityAddress()
                            ),
                        },
                    ]
                );

                await dataBaseServer.remove(RetireRequest, request);

                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(ContractAPI.ADD_RETIRE_ADMIN, async (msg: {
        owner: IOwner,
        id: string,
        hederaId: string
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id, hederaId } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner.creator) {
                throw new Error('Invalid contract owner');
            }
            if (!hederaId) {
                throw new Error('Invalid hedera identifier');
            }

            const contract = await dataBaseServer.findOne(Contract, id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner.creator);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner.creator
            );

            await contractCall(
                ContractAPI.ADD_RETIRE_ADMIN,
                workers,
                contractId,
                root.hederaAccountId,
                rootKey,
                'addAdmin',
                [
                    {
                        type: ContractParamType.ADDRESS,
                        value: AccountId.fromString(
                            hederaId
                        ).toSolidityAddress(),
                    },
                ]
            );

            return new MessageResponse(true);
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.REMOVE_RETIRE_ADMIN, async (msg: {
        owner: IOwner,
        id: string,
        hederaId: string
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id, hederaId } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner.creator) {
                throw new Error('Invalid contract owner');
            }
            if (!hederaId) {
                throw new Error('Invalid hedera identifier');
            }

            const contract = await dataBaseServer.findOne(Contract, id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner.creator);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner.creator
            );

            await contractCall(
                ContractAPI.REMOVE_RETIRE_ADMIN,
                workers,
                contractId,
                root.hederaAccountId,
                rootKey,
                'removeAdmin',
                [
                    {
                        type: ContractParamType.ADDRESS,
                        value: AccountId.fromString(
                            hederaId
                        ).toSolidityAddress(),
                    },
                ]
            );

            return new MessageResponse(true);
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.GET_RETIRE_VCS, async (msg: {
        owner: IOwner,
        pageIndex?: any,
        pageSize?: any
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { pageIndex, pageSize, owner } = msg;

            if (!owner.creator) {
                throw new Error('Owner is required');
            }

            const otherOptions: any = {};
            const _pageSize = parseInt(pageSize, 10);
            const _pageIndex = parseInt(pageIndex, 10);
            if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = Math.min(100, _pageSize);
                otherOptions.offset = _pageIndex * _pageSize;
            } else {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = 100;
            }

            const users = new Users();
            const user = await users.getUserById(owner.creator);

            const filters: any = {
                owner: owner.owner,
                type: SchemaEntity.RETIRE_TOKEN,
            };
            if (user.role === UserRole.USER) {
                filters['document.credentialSubject.user'] =
                    user.hederaAccountId;
            }

            return new MessageResponse(
                await dataBaseServer.findAndCount(VcDocument, filters, otherOptions)
            );
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });
}
