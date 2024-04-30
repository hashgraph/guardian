import { ApiResponse } from '../api/helpers/api-response.js';
import {
    Contract,
    ContractMessage,
    DataBaseHelper,
    DatabaseServer,
    KeyType,
    Logger,
    MessageAction,
    MessageError,
    MessageResponse,
    MessageServer,
    NotificationHelper,
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
import { ContractAPI, ContractParamType, ContractType, RetireTokenPool, RetireTokenRequest, Schema, SchemaEntity, SchemaHelper, TokenType, TopicType, UserRole, WorkerTaskType, } from '@guardian/interfaces';
import { AccountId, TokenId } from '@hashgraph/sdk';
import { proto } from '@hashgraph/proto';
import * as ethers from 'ethers';
import { contractCall, contractQuery, createContract, customContractCall, publishSystemSchema, } from './helpers/index.js';

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
    contractRepository: DataBaseHelper<Contract>,
    retirePoolRepository: DataBaseHelper<RetirePool>,
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
            } catch {}
            await setContractWiperPermissions(
                contractRepository,
                retirePoolRepository,
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

    const contract = await contractRepository.findOne({
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
    await retirePoolRepository.save(pool, filters);
}

async function setContractWiperPermissions(
    contractRepository: DataBaseHelper<Contract>,
    retirePoolRepository: DataBaseHelper<RetirePool>,
    contractId: string,
    wipeContractId: string,
    isWiper: boolean
) {
    const contracts = await contractRepository.find({
        contractId,
    });
    if (contracts.length === 0) {
        return;
    }

    await contractRepository.update(
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
        {
            contractId,
        }
    );
    const pools = await retirePoolRepository.find({
        contractId,
    });

    await retirePoolRepository.save(
        await Promise.all(
            pools.map(async (pool) => {
                const contract = await contractRepository.findOne({
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
    retireRequestRepository: DataBaseHelper<RetireRequest>,
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

    await retireRequestRepository.save(
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
        }
    );
}

export async function syncWipeContracts(
    contractRepository: DataBaseHelper<Contract>,
    wipeRequestRepository: DataBaseHelper<WiperRequest>,
    retirePoolRepository: DataBaseHelper<RetirePool>,
    workers: Workers,
    users: Users
) {
    const contractIds = new Map<string, string>();
    const contracts = await contractRepository.find(
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
            contractRepository,
            wipeRequestRepository,
            retirePoolRepository,
            workers,
            users,
            contractId,
            lastSyncEventTimeStamp
        );
    }
}

export async function syncWipeContract(
    contractRepository: DataBaseHelper<Contract>,
    wipeRequestRepository: DataBaseHelper<WiperRequest>,
    retirePoolRepository: DataBaseHelper<RetirePool>,
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
            20
        );

        if (!result || !result.length) {
            break;
        }

        for (const log of result) {
            const eventName = wipeEventsAbi.getEventName(log.topics[0]);
            const data = wipeEventsAbi.decodeEventLog(eventName, log.data);
            // tslint:disable-next-line:no-shadowed-variable
            const contracts = await contractRepository.find(
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
                        contractRepository,
                        retirePoolRepository,
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
                        contractRepository,
                        retirePoolRepository,
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
                    await wipeRequestRepository.save(
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
                    await wipeRequestRepository.delete({
                        contractId,
                        user,
                    });
                    break;
                }
                case 'WipeRequestsCleared': {
                    await wipeRequestRepository.delete({
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
    const contracts = await contractRepository.find({
        contractId,
    });
    await contractRepository.update(
        contracts.map((contract) => {
            contract.lastSyncEventTimeStamp = lastTimeStamp;
            contract.syncDisabled = false;
            return contract;
        })
    );
}

export async function syncRetireContracts(
    contractRepository: DataBaseHelper<Contract>,
    retirePoolRepository: DataBaseHelper<RetirePool>,
    retireRequestRepository: DataBaseHelper<RetireRequest>,
    workers: Workers,
    users: Users
) {
    const contractIds = new Map<string, string>();
    const contracts = await contractRepository.find(
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
            contractRepository,
            retirePoolRepository,
            retireRequestRepository,
            workers,
            users,
            contractId,
            lastSyncEventTimeStamp
        );
    }
}

export async function syncRetireContract(
    contractRepository: DataBaseHelper<Contract>,
    retirePoolRepository: DataBaseHelper<RetirePool>,
    retireRequestRepository: DataBaseHelper<RetireRequest>,
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
            20
        );

        if (!result || !result.length) {
            break;
        }

        for (const log of result) {
            const eventName = retireEventsAbi.getEventName(log.topics[0]);
            const data = retireEventsAbi.decodeEventLog(eventName, log.data);

            // tslint:disable-next-line:no-shadowed-variable
            const contracts = await contractRepository.find(
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
                        contractRepository,
                        retirePoolRepository,
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
                    await retirePoolRepository.delete({
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
                    });
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
                        retireRequestRepository,
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
                    await retireRequestRepository.delete({
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
                    });
                    break;
                }
                case 'PoolsCleared': {
                    const count = Number(data[0]);
                    await retirePoolRepository.delete({
                        tokens: { $size: count },
                    });
                    if (!sendNotifications) {
                        break;
                    }
                    Promise.all(
                        contractOwnerIds.map((user) =>
                            NotificationHelper.info(
                                `Pools cleared in contract: ${contractId}`,
                                `All ${
                                    count === 1 ? 'single' : 'double'
                                } pools cleared`,
                                user
                            )
                        )
                    );
                    break;
                }
                case 'RequestsCleared': {
                    const count = Number(data[0]);
                    await retireRequestRepository.delete({
                        tokens: { $size: count },
                    });
                    if (!sendNotifications) {
                        break;
                    }
                    Promise.all(
                        contractOwnerIds.map((user) =>
                            NotificationHelper.info(
                                `Requests cleared in contract: ${contractId}`,
                                `All ${
                                    count === 1 ? 'single' : 'double'
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

    const contracts = await contractRepository.find({
        contractId,
    });
    await contractRepository.update(
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
            20
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
    contractRepository: DataBaseHelper<Contract>,
    contractId: string,
    did: string,
    hederaAccountId: string,
    hederaAccountKey: string,
    userHederaAccountId: string,
    tokens: (RetireTokenRequest & { decimals: number })[]
) {
    const contract = await contractRepository.findOne({
        contractId,
        owner: did,
    });

    const topicConfig = await TopicConfig.fromObject({
        topicId: contract.topicId,
        type: TopicType.RetireTopic,
    } as any);

    const messageServer = new MessageServer(hederaAccountId, hederaAccountKey);
    messageServer.setTopicObject(topicConfig);

    const userTopic = await TopicConfig.fromObject(
        await new DataBaseHelper(Topic).findOne({
            owner: did,
            type: TopicType.UserTopic,
        }),
        true
    );

    let schema = await new DataBaseHelper(SchemaCollection).findOne({
        entity: SchemaEntity.RETIRE_TOKEN,
        readonly: true,
        topicId: userTopic.topicId,
    });
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
        user: userHederaAccountId,
        contractId,
        tokens: tokens.map((token) => ({
            tokenId: token.token,
            count: Math.floor(token.count / Math.pow(10, token.decimals)),
            serials: token.serials,
        })),
    };
    credentialSubject.id = did;

    if (schemaObject) {
        credentialSubject = SchemaHelper.updateObjectContext(
            schemaObject,
            credentialSubject
        );
    }

    const didDocument = await vcHelper.loadDidDocument(did);
    const vcObject = await vcHelper.createVerifiableCredential(credentialSubject, didDocument, null, null);

    const vcMessage = new VCMessage(MessageAction.CreateVC);
    vcMessage.setDocument(vcObject);
    await messageServer.sendMessage(vcMessage);

    await new DataBaseHelper(VcDocumentCollection).save({
        hash: vcMessage.hash,
        owner: did,
        document: vcMessage.document,
        type: schemaObject?.entity,
        documentFields: ['credentialSubject.0.user'],
    });
}

/**
 * Connect to the message broker methods of working with contracts.
 */
export async function contractAPI(
    contractRepository: DataBaseHelper<Contract>,
    wipeRequestRepository: DataBaseHelper<WiperRequest>,
    retirePoolRepository: DataBaseHelper<RetirePool>,
    retireRequestRepository: DataBaseHelper<RetireRequest>,
    vcRepostitory: DataBaseHelper<VcDocument>
): Promise<void> {
    ApiResponse(ContractAPI.GET_CONTRACTS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { pageIndex, pageSize, owner, type } = msg;

            if (!type) {
                return new MessageError('Type is required');
            }
            if (!owner) {
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

            return new MessageResponse(
                await contractRepository.findAndCount(
                    {
                        owner,
                        type,
                    },
                    otherOptions
                )
            );
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.CREATE_CONTRACT, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { description, did, type } = msg;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(did);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                did
            );
            const signOptions = await wallet.getUserSignOptions(root);

            const topicHelper = new TopicHelper(root.hederaAccountId, rootKey, signOptions);
            const topic = await topicHelper.create(
                {
                    type: TopicType.ContractTopic,
                    name: TopicType.ContractTopic,
                    description: TopicType.ContractTopic,
                    owner: did,
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

            const contract = await contractRepository.save({
                contractId,
                owner: did,
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
            await messageServer
                .setTopicObject(topic)
                .sendMessage(contractMessage);
            return new MessageResponse(contract);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.IMPORT_CONTRACT, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid contract identifier');
            }
            const { contractId, did, description } = msg;

            if (!contractId) {
                throw new Error('Contract identifier is required');
            }
            if (!did) {
                throw new Error('DID is required');
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
                20
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

            const existingContract = await contractRepository.findOne({
                contractId,
            });

            const contract = await contractRepository.save(
                {
                    contractId,
                    owner: did,
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
                    owner: did,
                }
            );
            if (
                !existingContract &&
                contractMessage.contractType === ContractType.RETIRE
            ) {
                await syncRetireContract(
                    contractRepository,
                    retirePoolRepository,
                    retireRequestRepository,
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
                    contractRepository,
                    wipeRequestRepository,
                    retirePoolRepository,
                    workers,
                    users,
                    contractId,
                    existingContract?.lastSyncEventTimeStamp,
                    false
                );
            }

            return new MessageResponse(contract);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.CONTRACT_PERMISSIONS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { did, id } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }

            const contract = await contractRepository.findOne(id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(did);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                did
            );

            const permissions = await getContractPermissions(
                workers,
                contractId,
                root.hederaAccountId,
                rootKey
            );

            await contractRepository.update(
                {
                    permissions,
                },
                {
                    contractId,
                    owner: did,
                }
            );
            return new MessageResponse(permissions);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.REMOVE_CONTRACT, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner) {
                throw new Error('Invalid contract owner');
            }

            const contract = await contractRepository.findOne(id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            await contractRepository.delete({
                contractId,
                owner,
            });

            const existingContracts = await contractRepository.count({
                contractId,
            });
            if (existingContracts < 1) {
                await retirePoolRepository.delete({
                    contractId,
                });
                await retireRequestRepository.delete({
                    contractId,
                });
            }
            return new MessageResponse(true);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.GET_WIPE_REQUESTS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { pageIndex, pageSize, did, contractId } = msg;

            if (!did) {
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

            const contractFilters: any = {
                owner: did,
            };
            if (contractId) {
                contractFilters.contractId = contractId;
            }
            const contracts = await contractRepository.find(contractFilters);

            return new MessageResponse(
                await wipeRequestRepository.findAndCount(
                    {
                        contractId: {
                            $in: contracts.map((item) => item.contractId),
                        },
                    },
                    otherOptions
                )
            );
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.ENABLE_WIPE_REQUESTS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner) {
                throw new Error('Invalid contract owner');
            }

            const contract = await contractRepository.findOne(id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
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
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.DISABLE_WIPE_REQUESTS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner) {
                throw new Error('Invalid contract owner');
            }

            const contract = await contractRepository.findOne(id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
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
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.APPROVE_WIPE_REQUEST, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, requestId } = msg;

            if (!owner) {
                throw new Error('Invalid contract owner');
            }
            if (!requestId) {
                throw new Error('Invalid request identifier');
            }

            const request = await wipeRequestRepository.findOne({
                id: requestId,
            });
            if (!request) {
                throw new Error('Request is not found');
            }

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
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

            await wipeRequestRepository.remove(request);

            await setContractWiperPermissions(
                contractRepository,
                retirePoolRepository,
                request.user,
                request.contractId,
                true
            );

            return new MessageResponse(true);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.REJECT_WIPE_REQUEST, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, requestId, ban } = msg;

            if (!owner) {
                throw new Error('Invalid contract owner');
            }
            if (!requestId) {
                throw new Error('Invalid hedera identifier');
            }

            const request = await wipeRequestRepository.findOne({
                id: requestId,
            });
            if (!request) {
                throw new Error('Request is not found');
            }

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
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

            await wipeRequestRepository.remove(request);

            return new MessageResponse(true);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.CLEAR_WIPE_REQUESTS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner) {
                throw new Error('Invalid contract owner');
            }

            const contract = await contractRepository.findOne(id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
            );

            await contractCall(
                ContractAPI.CLEAR_WIPE_REQUESTS,
                workers,
                contractId,
                root.hederaAccountId,
                rootKey,
                'clear'
            );

            await wipeRequestRepository.delete({
                contractId,
            });

            return new MessageResponse(true);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.ADD_WIPE_ADMIN, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id, hederaId } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner) {
                throw new Error('Invalid contract owner');
            }
            if (!hederaId) {
                throw new Error('Invalid hedera identifier');
            }

            const contract = await contractRepository.findOne(id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
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
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.REMOVE_WIPE_ADMIN, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id, hederaId } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner) {
                throw new Error('Invalid contract owner');
            }
            if (!hederaId) {
                throw new Error('Invalid hedera identifier');
            }

            const contract = await contractRepository.findOne(id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
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
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.ADD_WIPE_MANAGER, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id, hederaId } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner) {
                throw new Error('Invalid contract owner');
            }
            if (!hederaId) {
                throw new Error('Invalid hedera identifier');
            }

            const contract = await contractRepository.findOne(id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
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
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.REMOVE_WIPE_MANAGER, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id, hederaId } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner) {
                throw new Error('Invalid contract owner');
            }
            if (!hederaId) {
                throw new Error('Invalid hedera identifier');
            }

            const contract = await contractRepository.findOne(id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
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
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.ADD_WIPE_WIPER, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id, hederaId } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner) {
                throw new Error('Invalid contract owner');
            }
            if (!hederaId) {
                throw new Error('Invalid hedera identifier');
            }

            const contract = await contractRepository.findOne(id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
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
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.REMOVE_WIPE_WIPER, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id, hederaId } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner) {
                throw new Error('Invalid contract owner');
            }
            if (!hederaId) {
                throw new Error('Invalid hedera identifier');
            }

            const contract = await contractRepository.findOne(id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
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
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.SYNC_RETIRE_POOLS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner) {
                throw new Error('Invalid owner');
            }

            const contract = await contractRepository.findOne(id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;
            const workers = new Workers();

            const pools = await retirePoolRepository.find({
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
                        contractRepository,
                        retirePoolRepository,
                        contractId,
                        token.contract,
                        isWiper
                    );
                }
                // tslint:disable-next-line:no-shadowed-variable
                const contract = await contractRepository.findOne({
                    contractId,
                });

                pool.enabled =
                    pool.tokens.findIndex(
                        (token) =>
                            !contract.wipeContractIds.includes(token.contract)
                    ) < 0;
            }

            await retirePoolRepository.update(pools);

            const syncDate = new Date();

            const contracts = await contractRepository.find({
                contractId,
            });

            await contractRepository.update(
                // tslint:disable-next-line:no-shadowed-variable
                contracts.map((contract) => {
                    contract.syncPoolsDate = syncDate;
                    return contract;
                })
            );

            return new MessageResponse(syncDate);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.GET_RETIRE_REQUESTS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { pageIndex, pageSize, did, contractId } = msg;

            if (!did) {
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
            const user = await users.getUserById(did);

            const filters: any = {};
            if (contractId) {
                filters.contractId = contractId;
            }

            if (user.role === UserRole.STANDARD_REGISTRY) {
                if (!filters.contractId) {
                    const contracts = await contractRepository.find({
                        owner: did,
                    });
                    filters.contractId = {
                        $in: contracts.map((item) => item.id),
                    };
                }
                return new MessageResponse(
                    await retireRequestRepository.findAndCount(
                        filters,
                        otherOptions
                    )
                );
            } else if (user.role === UserRole.USER) {
                filters.user = user.hederaAccountId;
                return new MessageResponse(
                    await retireRequestRepository.findAndCount(
                        filters,
                        otherOptions
                    )
                );
            }
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.GET_RETIRE_POOLS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { pageIndex, pageSize, owner, contractId, tokens } = msg;

            if (!owner) {
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
            const user = await users.getUserById(owner);

            const filters: any = {
                $and: [],
            };

            if (user.role === UserRole.USER) {
                filters.$and.push({ enabled: true });
            }

            if (contractId) {
                filters.$and.push({ contractId });
            } else {
                const contracts = await contractRepository.find({
                    type: ContractType.RETIRE,
                    owner: user.role === UserRole.USER ? user.parent : owner,
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
                await retirePoolRepository.findAndCount(filters, otherOptions)
            );
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.CLEAR_RETIRE_REQUESTS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner) {
                throw new Error('Invalid contract owner');
            }

            const contract = await contractRepository.findOne(id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
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

            await retireRequestRepository.delete({
                contractId,
            });

            return new MessageResponse(true);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.CLEAR_RETIRE_POOLS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner) {
                throw new Error('Invalid contract owner');
            }

            const contract = await contractRepository.findOne(id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
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

            await retirePoolRepository.delete({
                contractId,
            });

            return new MessageResponse(true);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.SET_RETIRE_POOLS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid add contract pair parameters');
            }

            const { owner, id, options } = msg;

            if (!id) {
                throw new Error('Contract identifier is required');
            }
            if (!owner) {
                throw new Error('Owner is required');
            }
            if (!options) {
                throw new Error('Options are required');
            }

            const contract = await contractRepository.findOne(id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
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
                    contractRepository,
                    retirePoolRepository,
                    contractId,
                    options
                )
            );
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.UNSET_RETIRE_POOLS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid add contract pair parameters');
            }

            const { owner, poolId } = msg;

            if (!owner) {
                throw new Error('Owner is required');
            }
            if (!poolId) {
                throw new Error('Pool identifier is required');
            }

            const pool = await retirePoolRepository.findOne({
                id: poolId,
            });

            if (!pool) {
                throw new Error('Pool is not found');
            }

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
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

            await retirePoolRepository.remove(pool);

            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.UNSET_RETIRE_REQUEST, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid add contract pair parameters');
            }

            const { owner, requestId } = msg;

            if (!owner) {
                throw new Error('Owner is required');
            }
            if (!requestId) {
                throw new Error('Pool identifier is required');
            }

            const request = await retireRequestRepository.findOne({
                id: requestId,
            });

            if (!request) {
                throw new Error('Request is not found');
            }

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
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
            await retireRequestRepository.remove(request);

            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.RETIRE, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid add contract pair parameters');
            }

            let {
                // tslint:disable-next-line:prefer-const
                did,
                // tslint:disable-next-line:prefer-const
                poolId,
                tokens,
            }: { did: string; poolId: string; tokens: RetireTokenRequest[] } =
                msg;

            if (!did) {
                throw new Error('User is required');
            }
            if (!poolId) {
                throw new Error('Pool identifier is required');
            }

            const pool = await retirePoolRepository.findOne({
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
            const root = await users.getUserById(did);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                did
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

            if (pool.immediately) {
                await saveRetireVC(
                    contractRepository,
                    pool.contractId,
                    sr.did,
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
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.APPROVE_RETIRE, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid add contract pair parameters');
            }

            const { owner, requestId } = msg;

            if (!owner) {
                throw new Error('Owner is required');
            }
            if (!requestId) {
                throw new Error('Pool identifier is required');
            }

            const request = await retireRequestRepository.findOne({
                id: requestId,
            });

            if (!request) {
                throw new Error('Request is not found');
            }

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
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
                contractRepository,
                request.contractId,
                owner,
                root.hederaAccountId,
                rootKey,
                request.user,
                request.tokens
            );

            await retireRequestRepository.remove(request);

            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.CANCEL_RETIRE, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid add contract pair parameters');
            }

            const { owner, requestId } = msg;

            if (!owner) {
                throw new Error('Owner is required');
            }
            if (!requestId) {
                throw new Error('Pool identifier is required');
            }

            const request = await retireRequestRepository.findOne({
                id: requestId,
            });

            if (!request) {
                throw new Error('Request is not found');
            }

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
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

            await retireRequestRepository.remove(request);

            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.ADD_RETIRE_ADMIN, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id, hederaId } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner) {
                throw new Error('Invalid contract owner');
            }
            if (!hederaId) {
                throw new Error('Invalid hedera identifier');
            }

            const contract = await contractRepository.findOne(id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
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
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.REMOVE_RETIRE_ADMIN, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { owner, id, hederaId } = msg;

            if (!id) {
                throw new Error('Invalid contract identifier');
            }
            if (!owner) {
                throw new Error('Invalid contract owner');
            }
            if (!hederaId) {
                throw new Error('Invalid hedera identifier');
            }

            const contract = await contractRepository.findOne(id, {
                fields: ['contractId'],
            });
            if (!contract) {
                throw new Error('Contract not found');
            }
            const contractId = contract.contractId;

            const users = new Users();
            const wallet = new Wallet();
            const workers = new Workers();
            const root = await users.getUserById(owner);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
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
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(ContractAPI.GET_RETIRE_VCS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get contract parameters');
            }

            const { pageIndex, pageSize, owner } = msg;

            if (!owner) {
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
            const user = await users.getUserById(owner);

            const filters: any = {
                owner: user.parent || owner,
                type: SchemaEntity.RETIRE_TOKEN,
            };
            if (user.role === UserRole.USER) {
                filters['document.credentialSubject.user'] =
                    user.hederaAccountId;
            }

            return new MessageResponse(
                await vcRepostitory.findAndCount(filters, otherOptions)
            );
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });
}
