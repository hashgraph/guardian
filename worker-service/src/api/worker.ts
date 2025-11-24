import {
    MessageBrokerChannel,
    MessageResponse,
    NatsService,
    NotificationHelper,
    PinoLogger,
    SecretManager,
    Users
} from '@guardian/common';
import {
    ContractParamType,
    ExternalMessageEvents,
    GenerateUUIDv4,
    ISignOptions,
    ITask,
    ITaskResult,
    WorkerEvents,
    WorkerTaskType
} from '@guardian/interfaces';
import {HederaSDKHelper, NetworkOptions} from './helpers/hedera-sdk-helper.js';
import {IpfsClientClass} from './ipfs-client-class.js';
import {
    AccountId,
    ContractFunctionParameters,
    ContractId,
    PrivateKey,
    TokenId
} from '@hiero-ledger/sdk';
import {HederaUtils} from './helpers/utils.js';
import axios from 'axios';
import process from 'process';
import {MAX_REDIRECTS} from '../constants/index.js';

/**
 * Sleep helper
 * @param t
 */
function rejectTimeout(t: number): Promise<void> {
    return new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error('Timeout error'));
        }, t);
    })
}

function getAnalytycsHeaders() {
    const headers: any = {};
    const token = process.env.ANALYTICS_SERVICE_TOKEN;
    if (token) {
        headers.Authorization = `Bearer ${token}`
    }
    return headers;
}

/**
 * Worker class
 */
export class Worker extends NatsService {
    /**
     * Message queue name
     */
    public messageQueueName = 'workers-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'workers-queue-reply-' + GenerateUUIDv4();

    /**
     * Old channel
     * @private
     */
    private channel: MessageBrokerChannel;

    /**
     * Ipfs client
     */
    private ipfsClient: IpfsClientClass;

    /**
     * Current task ID
     */
    private currentTaskId: string;

    /**
     * Worker in use
     * @private
     */
    private _isInUse: boolean = false;

    /**
     * Worker in use getter
     * @private
     */
    private get isInUse(): boolean {
        return this._isInUse;
    }

    /**
     * Worker in use setter
     * @private
     */
    private set isInUse(v: boolean) {
        this._isInUse = v;
    }

    /**
     * Minimum priority
     * @private
     */
    private readonly minPriority: number;

    /**
     * Maximum priority
     * @private
     */
    private readonly maxPriority: number;

    /**
     * Task timeout
     * @private
     */
    private readonly taskTimeout: number;

    /**
     * Worker ID
     * @private
     */
    //private readonly workerID: string;

    /**
     * Analytics Service
     * @private
     */
    private readonly analyticsService: string;

    constructor(
        private w3cKey: string,
        private w3cProof: string,
        private readonly filebaseKey: string,
        private readonly workerID: string,
        private readonly logger: PinoLogger
    ) {
        super();
        //this.workerID = this._workerID;
        this.ipfsClient = new IpfsClientClass(
            this.w3cKey,
            this.w3cProof,
            this.filebaseKey
        );

        this.analyticsService = process.env.ANALYTICS_SERVICE;
        this.minPriority = parseInt(process.env.MIN_PRIORITY, 10);
        this.maxPriority = parseInt(process.env.MAX_PRIORITY, 10);
        this.taskTimeout = parseInt(process.env.TASK_TIMEOUT, 10) * 1000; // env in seconds
    }

    /**
     * Initialize worker
     */
    public async init(): Promise<void> {
        await super.init();
        this.channel = new MessageBrokerChannel(this.connection, 'worker');
        try {
            await this.ipfsClient.createClient();
        } catch (e) {
            this.logger.error(`Could not create IPFS client instance. ${e.message}`, [this.workerID, 'WORKER'], null);
        }

        this.subscribe(WorkerEvents.GET_FREE_WORKERS, async (msg) => {
            if (!this.isInUse) {
                this.publish(msg.replySubject, {
                    subject: [this.replySubject, WorkerEvents.SEND_TASK_TO_WORKER].join('.'),
                    minPriority: this.minPriority,
                    maxPriority: this.maxPriority
                })
            }
        });

        const runTask = async (task) => {
            this.isInUse = true;
            this.currentTaskId = task.id;
            const userId = task.data?.payload?.userId;

            this.logger.info(`Task started: ${task.id}, ${task.type}`, [this.workerID, 'WORKER'], userId);

            const result = await this.processTaskWithTimeout(task);

            try {
                // await this.publish([task.reply, WorkerEvents.TASK_COMPLETE].join('-'), result);
                if (result?.error) {
                    this.logger.error(`Task error: ${this.currentTaskId}, ${result?.error}`, [this.workerID, 'WORKER'], userId);
                } else {
                    this.logger.info(`Task completed: ${this.currentTaskId}`, [this.workerID, 'WORKER'], userId);
                }
            } catch (error) {
                this.logger.error(error.message, [this.workerID, 'WORKER'], userId);
                this.clearState();

            }

            const completeTask = async (data: any) => {
                await this.publish(WorkerEvents.TASK_COMPLETE, data);
            }
            await completeTask(result);
            await this.publish(WorkerEvents.WORKER_READY);
            this.isInUse = false;
        }

        this.getMessages([this.replySubject, WorkerEvents.SEND_TASK_TO_WORKER].join('.'), async (task) => {
            if (!this.isInUse) {
                runTask(task);

                return new MessageResponse({
                    result: true
                })
            }
            return new MessageResponse({
                result: false
            })
        })

        this.subscribe(WorkerEvents.UPDATE_SETTINGS, async (msg: any) => {
            try {
                const ipfsStorageApiKey = msg?.ipfsStorageApiKey;
                if (!ipfsStorageApiKey) {
                    throw new Error('Ipfs storage api key setting is empty');
                }
                const [w3cKey, w3cProof] = ipfsStorageApiKey.split(';');
                const ipfsClient = new IpfsClientClass(
                    w3cKey,
                    w3cProof
                );
                await ipfsClient.createClient();
                this.w3cKey = w3cKey;
                this.w3cProof = w3cProof;
                this.ipfsClient = ipfsClient;
                const secretManager = SecretManager.New();
                await secretManager.setSecrets('apikey/ipfs', {IPFS_STORAGE_API_KEY: ipfsStorageApiKey});
            } catch (error) {
                this.logger.error(`Update settings error, ${error.message}`, ['WORKER'], msg?.userId);
            }
        });

        HederaSDKHelper.setTransactionResponseCallback(async (operatorAccountId: string) => {
            try {
                const balance = await HederaSDKHelper.balanceRest(operatorAccountId);
                await this.sendMessage('update-user-balance', {
                    balance,
                    unit: 'Hbar',
                    operatorAccountId
                }, false);
            } catch (error) {
                throw new Error(`Worker (${['api-gateway', 'update-user-balance'].join('.')}) send: ` + error);
            }
        })
    }

    /**
     * Clear states
     * @private
     */
    private clearState(): void {
        this.isInUse = false;
        this.currentTaskId = null;
    }

    /**
     * Safe destroy hedera client
     * @param client Hedera client
     */
    private safeDestroyClient(client: HederaSDKHelper): void {
        try {
            client?.destroy();
        } catch (error) {
            console.error(`Error while client destroy : ${error?.message}`);
        }
    }

    /**
     * Task actions
     * @param task
     * @private
     */
    private async processTask(task: ITask): Promise<ITaskResult> {
        const result: ITaskResult = {
            id: this.currentTaskId
        }
        const networkOptions: NetworkOptions = {
            network: task.data.network,
            localNodeAddress: task.data.localNodeAddress,
            localNodeProtocol: task.data.localNodeProtocol,
            nodes: task.data.nodes,
            mirrorNodes: task.data.mirrorNodes
        }
        let client: HederaSDKHelper;
        try {
            switch (task.type) {
                case WorkerTaskType.ADD_FILE: {
                    let fileContent = Buffer.from(task.data.payload.content, 'base64');
                    const data = await this.channel.request<any, any>(ExternalMessageEvents.IPFS_BEFORE_UPLOAD_CONTENT, task.data.payload);
                    if (data && data.body) {
                        fileContent = Buffer.from(data.body, 'base64')
                    }
                    //const blob: any = new Blob([fileContent]);
                    const cid = await this.ipfsClient.addFile(fileContent);
                    if (!cid) {
                        throw new Error('Add File: Invalid response');
                    }
                    this.publish(ExternalMessageEvents.IPFS_ADDED_FILE, cid);
                    result.data = cid;
                    break;
                }

                case WorkerTaskType.DELETE_CID: {
                    const { cid } = task.data.payload || {};
                    try {
                        if (!cid) {
                            throw new Error('Invalid CID');
                        }

                        result.data = await this.ipfsClient.deleteCid(cid);
                        break;;
                    } catch (e) {
                        result.error = e.message;
                    }
                    break;
                }

                case WorkerTaskType.GET_FILE: {
                    if (!task.data.payload || !task.data.payload.cid || !task.data.payload.responseType) {
                        result.error = 'Invalid CID';
                    } else {
                        let fileContent = await this.ipfsClient.getFile(task.data.payload.cid);
                        if (fileContent instanceof Buffer) {
                            const data = await this.channel.request<any, any>(ExternalMessageEvents.IPFS_AFTER_READ_CONTENT, {
                                responseType: !task.data.payload.responseType,
                                content: fileContent.toString('base64'),
                            });
                            if (data && data.body) {
                                fileContent = Buffer.from(data.body, 'base64')
                            }
                        }

                        switch (task.data.payload.responseType) {
                            case 'str':
                                result.data = Buffer.from(fileContent, 'binary').toString();
                                break;

                            case 'json':
                                result.data = Buffer.from(fileContent, 'binary').toJSON();
                                break;

                            default:
                                result.data = fileContent
                        }
                    }
                    break;
                }

                case WorkerTaskType.ANALYTICS_SEARCH_POLICIES: {
                    const {options} = task.data.payload;
                    try {
                        const headers = getAnalytycsHeaders();
                        const response = await axios.post(
                            `${this.analyticsService}/analytics/search/policy`,
                            options,
                            {
                                responseType: 'json',
                                headers
                            }
                        );
                        result.data = response.data;
                    } catch (error) {
                        if (error.code === 'ECONNREFUSED') {
                            result.error = 'Indexer service is not available';
                        } else {
                            result.error = error.message;
                        }
                    }
                    break;
                }

                case WorkerTaskType.ANALYTICS_GET_RETIRE_DOCUMENTS: {
                    const {options} = task.data.payload;
                    try {
                        const headers = getAnalytycsHeaders();
                        const response = await axios.post(
                            `${this.analyticsService}/analytics/search/retire`,
                            options,
                            {
                                responseType: 'json',
                                headers
                            }
                        );
                        result.data = response.data;

                    } catch (error) {
                        if (error.code === 'ECONNREFUSED') {
                            result.error = 'Indexer service is not available';
                        } else {
                            result.error = error.message;
                        }
                    }
                    break;
                }

                case WorkerTaskType.ANALYTICS_GET_INDEXER_AVAILABILITY: {
                    try {
                        const headers = getAnalytycsHeaders();
                        const response = await axios.get(
                            `${this.analyticsService}/analytics/checkAvailability`,
                            {headers}
                        );
                        result.data = response.data;
                    } catch (error) {
                        if (error.code === 'ECONNREFUSED') {
                            result.error = 'Indexer service is not available';
                        } else {
                            result.error = error.message;
                        }
                    }
                    break;
                }

                case WorkerTaskType.HTTP_REQUEST: {
                    const {method, url, headers, body, maxRedirects = MAX_REDIRECTS.DEFAULT} = task.data.payload;
                    const response = await axios({
                        method,
                        url,
                        headers,
                        data: body,
                        maxRedirects
                    });
                    result.data = response.data;
                    break;
                }

                case WorkerTaskType.SEND_HEDERA: {
                    const {operatorId, operatorKey, dryRun} = task.data.clientOptions;

                    const userId = task.data.payload?.userId;

                    const signOptions: ISignOptions = task.data.signOptions;
                    client = new HederaSDKHelper(operatorId, operatorKey, dryRun, networkOptions);
                    const {topicId, buffer, submitKey, memo} = task.data;
                    result.data = await client.submitMessage(topicId, buffer, userId, submitKey, memo, signOptions);
                    break;
                }

                /*
                 * Task represents "Create Account" functionality in Hedera SDK. It is available on every network.
                 */
                case WorkerTaskType.CREATE_ACCOUNT: {
                    const {operatorId, operatorKey, initialBalance, payload: {userId}} = task.data;
                    client = new HederaSDKHelper(operatorId, operatorKey, null, networkOptions);
                    const treasury = await client.newAccount(initialBalance, userId);
                    result.data = {
                        id: treasury.id.toString(),
                        key: treasury.key.toString()
                    };
                    break;
                }

                case WorkerTaskType.GET_USER_BALANCE: {
                    const {hederaAccountId, hederaAccountKey} = task.data;
                    client = new HederaSDKHelper(hederaAccountId, hederaAccountKey, null, networkOptions);
                    result.data = await client.balance(hederaAccountId);

                    break;
                }

                case WorkerTaskType.GET_USER_BALANCE_REST: {
                    const {hederaAccountId} = task.data;
                    result.data = await HederaSDKHelper.balanceRest(hederaAccountId);

                    break;
                }

                case WorkerTaskType.GET_ACCOUNT_INFO: {
                    const {userID, userKey, hederaAccountId} = task.data;
                    client = new HederaSDKHelper(userID, userKey, null, networkOptions);
                    result.data = await client.accountInfo(hederaAccountId);

                    break;
                }

                case WorkerTaskType.GET_ACCOUNT_TOKENS_REST: {
                    const {hederaAccountId} = task.data;
                    result.data = await HederaSDKHelper.accountTokensInfo(hederaAccountId);
                    break;
                }

                case WorkerTaskType.GET_ACCOUNT_INFO_REST: {
                    const {hederaAccountId} = task.data;
                    result.data = await HederaSDKHelper.accountInfo(hederaAccountId);
                    break;
                }

                case WorkerTaskType.CREATE_TOKEN: {
                    const {
                        operatorId,
                        operatorKey,
                        memo,
                        decimals,
                        enableAdmin,
                        enableFreeze,
                        enableKYC,
                        enableWipe,
                        initialSupply,
                        tokenName,
                        tokenSymbol,
                        tokenType,
                        wipeContractId,
                        payload: {userId}
                    } = task.data;
                    client = new HederaSDKHelper(operatorId, operatorKey, null, networkOptions);
                    const nft = tokenType === 'non-fungible';
                    const _decimals = nft ? 0 : decimals;
                    const _initialSupply = nft ? 0 : initialSupply;
                    const treasuryId = AccountId.fromString(operatorId);
                    const treasuryKey = HederaUtils.parsPrivateKey(operatorKey);
                    const supplyKey = PrivateKey.generate();
                    const adminKey = enableAdmin ? PrivateKey.generate() : null;
                    const freezeKey = enableFreeze ? PrivateKey.generate() : null;
                    const kycKey = enableKYC ? PrivateKey.generate() : null;
                    const wipeKey = enableWipe
                        ? wipeContractId
                            ? ContractId.fromString(wipeContractId)
                            : PrivateKey.generate()
                        : null;
                    const tokenMemo = memo || '';
                    const tokenId = await client.newToken(
                        tokenName,
                        tokenSymbol,
                        nft,
                        _decimals,
                        _initialSupply,
                        tokenMemo,
                        treasuryId,
                        treasuryKey,
                        supplyKey,
                        adminKey,
                        kycKey,
                        freezeKey,
                        wipeKey,
                        userId
                    );
                    result.data = {
                        tokenId,
                        tokenName,
                        tokenSymbol,
                        tokenType,
                        decimals: _decimals,
                        initialSupply: _initialSupply,
                        treasuryId: treasuryId.toString(),
                        treasuryKey: treasuryKey.toString(),
                        supplyKey: supplyKey.toString(),
                        adminKey: adminKey ? adminKey.toString() : null,
                        freezeKey: freezeKey ? freezeKey.toString() : null,
                        kycKey: kycKey ? kycKey.toString() : null,
                        wipeKey: wipeKey && !wipeContractId ? wipeKey.toString() : null,
                        wipeContractId
                    }

                    break;
                }

                case WorkerTaskType.UPDATE_TOKEN: {
                    const {
                        tokenId,
                        operatorId,
                        operatorKey,
                        adminKey,
                        changes,
                        payload: {userId}
                    } = task.data;

                    if (changes.freezeKey) {
                        changes.freezeKey = PrivateKey.generate();
                    }
                    if (changes.kycKey) {
                        changes.kycKey = PrivateKey.generate();
                    }
                    if (changes.wipeKey) {
                        changes.wipeKey = PrivateKey.generate();
                    }
                    client = new HederaSDKHelper(operatorId, operatorKey, null, networkOptions);
                    const status = await client.updateToken(
                        TokenId.fromString(tokenId),
                        HederaUtils.parsPrivateKey(adminKey, true, 'Admin Key'),
                        changes,
                        userId
                    )

                    result.data = {
                        status,
                        freezeKey: changes.freezeKey ? changes.freezeKey.toString() : null,
                        kycKey: changes.kycKey ? changes.kycKey.toString() : null,
                        wipeKey: changes.wipeKey ? changes.wipeKey.toString() : null
                    }

                    break;
                }

                case WorkerTaskType.DELETE_TOKEN: {
                    const {
                        tokenId,
                        operatorId,
                        operatorKey,
                        adminKey,
                        payload: {userId}
                    } = task.data;
                    client = new HederaSDKHelper(operatorId, operatorKey, null, networkOptions);
                    result.data = await client.deleteToken(
                        TokenId.fromString(tokenId),
                        HederaUtils.parsPrivateKey(adminKey, true, 'Admin Key'),
                        userId
                    )

                    break;
                }

                case WorkerTaskType.ASSOCIATE_TOKEN: {
                    const {userID, userKey, associate, tokenId, dryRun, payload: {userId}} = task.data;
                    client = new HederaSDKHelper(userID, userKey, dryRun, networkOptions);
                    if (associate) {
                        result.data = await client.associate(tokenId, userID, userKey, userId);
                    } else {
                        result.data = await client.dissociate(tokenId, userID, userKey, userId);
                    }

                    break;
                }

                case WorkerTaskType.GRANT_KYC_TOKEN: {
                    const {
                        hederaAccountId,
                        hederaAccountKey,
                        userHederaAccountId,
                        token,
                        kycKey,
                        grant,
                        dryRun,
                        payload: {userId}
                    } = task.data;
                    client = new HederaSDKHelper(hederaAccountId, hederaAccountKey, dryRun, networkOptions);

                    if (grant) {
                        result.data = await client.grantKyc(token.tokenId, userHederaAccountId, kycKey, userId);
                    } else {
                        result.data = await client.revokeKyc(token.tokenId, userHederaAccountId, kycKey, userId);
                    }
                    const user = await new Users().getUserByAccount(userHederaAccountId, userId);
                    await NotificationHelper.info(
                        `${grant ? 'Grant' : 'Revok'} KYC`,
                        `KYC ${grant ? 'granted for' : 'revoked for'} ${token.tokenName}`,
                        user?.id
                    );
                    break;
                }

                case WorkerTaskType.FREEZE_TOKEN: {
                    const {
                        hederaAccountId,
                        hederaAccountKey,
                        userHederaAccountId,
                        token,
                        freezeKey,
                        freeze,
                        dryRun,
                        payload: {userId}
                    } = task.data;
                    client = new HederaSDKHelper(hederaAccountId, hederaAccountKey, dryRun, networkOptions);
                    if (freeze) {
                        result.data = await client.freeze(token.tokenId, userHederaAccountId, freezeKey, userId);
                    } else {
                        result.data = await client.unfreeze(token.tokenId, userHederaAccountId, freezeKey, userId);
                    }
                    const user = await new Users().getUserByAccount(userHederaAccountId, userId);
                    await NotificationHelper.info(
                        `${freeze ? 'Freeze' : 'Unfreeze'} token`,
                        `${token.tokenName} ${freeze ? 'frozen' : 'unfrozen'}`,
                        user.id
                    );
                    break;
                }

                case WorkerTaskType.MINT_NFT: {
                    const {
                        hederaAccountId,
                        hederaAccountKey,
                        dryRun,
                        tokenId,
                        supplyKey,
                        metaData,
                        transactionMemo,
                        payload: {userId}
                    } = task.data;
                    client = new HederaSDKHelper(hederaAccountId, hederaAccountKey, dryRun, networkOptions);
                    let data: Uint8Array[];
                    if (Array.isArray(metaData)) {
                        data = new Array<Uint8Array>(metaData.length);
                        for (let i = 0; i < metaData.length; i++) {
                            data[i] = new Uint8Array(Buffer.from(metaData[i]));
                        }
                    } else {
                        data = [new Uint8Array(Buffer.from(metaData))];
                    }
                    result.data = await client.mintNFT(tokenId, supplyKey, data, userId, transactionMemo);

                    break;
                }

                case WorkerTaskType.TRANSFER_NFT: {
                    const {
                        hederaAccountId,
                        hederaAccountKey,
                        dryRun,
                        tokenId,
                        targetAccount,
                        treasuryId,
                        treasuryKey,
                        element,
                        transactionMemo,
                        payload: {userId}
                    } = task.data;
                    client = new HederaSDKHelper(hederaAccountId, hederaAccountKey, dryRun, networkOptions);
                    const status = await client.transferNFT(tokenId, targetAccount, treasuryId, treasuryKey, element, userId, transactionMemo);
                    result.data = status ? element : null

                    break;
                }

                case WorkerTaskType.MINT_FT: {
                    const {
                        hederaAccountId,
                        hederaAccountKey,
                        dryRun,
                        tokenId,
                        supplyKey,
                        tokenValue,
                        transactionMemo,
                        payload: {userId}
                    } = task.data;
                    client = new HederaSDKHelper(hederaAccountId, hederaAccountKey, dryRun, networkOptions);
                    result.data = await client.mint(tokenId, supplyKey, tokenValue, userId, transactionMemo);

                    break;
                }

                case WorkerTaskType.TRANSFER_FT: {
                    const {
                        hederaAccountId,
                        hederaAccountKey,
                        dryRun,
                        tokenId,
                        targetAccount,
                        treasuryId,
                        treasuryKey,
                        tokenValue,
                        transactionMemo,
                        payload: {userId}
                    } = task.data;
                    client = new HederaSDKHelper(hederaAccountId, hederaAccountKey, dryRun, networkOptions);
                    result.data = await client.transfer(tokenId, targetAccount, treasuryId, treasuryKey, tokenValue, userId, transactionMemo);

                    break;
                }

                case WorkerTaskType.WIPE_TOKEN: {
                    const {
                        hederaAccountId,
                        hederaAccountKey,
                        targetAccount,
                        tokenValue,
                        serialNumbers,
                        dryRun,
                        token,
                        wipeKey,
                        uuid,
                        payload: {userId}
                    } = task.data;
                    client = new HederaSDKHelper(hederaAccountId, hederaAccountKey, dryRun, networkOptions);
                    try {
                        await client.wipe(token.tokenId, targetAccount, wipeKey, tokenValue, userId, token.tokenType, serialNumbers, uuid);
                    } catch (error) {
                        if (token.tokenType === 'non-fungible') {
                            const plural =
                                Array.isArray(serialNumbers) &&
                                serialNumbers.length !== 1
                                    ? 's'
                                    : '';
                            if (error.message.includes('INVALID_NFT_ID')) {
                                await this.logger.error(
                                    `Task error: ${this.currentTaskId}, ${error.message}`,
                                    ['WORKER'],
                                    userId
                                );
                                await NotificationHelper.error(
                                    `Wipe Operation Failed`,
                                    `Entered Serial number${plural}: "[${serialNumbers}]" is invalid`,
                                    userId
                                );
                                break;
                            } else if (
                                error.message.includes('INVALID_WIPING_AMOUNT')
                            ) {
                                await this.logger.error(
                                    `Task error: ${this.currentTaskId}, ${error.message}`,
                                    ['WORKER'],
                                    userId
                                );
                                await NotificationHelper.error(
                                    `Wipe Operation Failed`,
                                    `Wiping amount exceeds the tokens owned for serial number${plural} [${serialNumbers}].`,
                                    userId
                                );
                                break;
                            }
                        }
                        result.error = error.message;
                        break;
                    }
                    result.data = {}
                    break;
                }

                case WorkerTaskType.NEW_TOPIC: {
                    const {hederaAccountId, hederaAccountKey, dryRun, topicMemo, keys, payload: {userId}} = task.data;
                    client = new HederaSDKHelper(hederaAccountId, hederaAccountKey, dryRun, networkOptions);
                    let adminKey: any = null;
                    let submitKey: any = null;
                    if (keys) {
                        if (keys.admin) {
                            adminKey = hederaAccountKey;
                        }
                        if (keys.submit) {
                            submitKey = hederaAccountKey;
                        }
                    } else {
                        adminKey = hederaAccountKey;
                        submitKey = hederaAccountKey;
                    }
                    result.data = await client.newTopic(
                        userId,
                        adminKey,
                        submitKey,
                        topicMemo
                    );

                    break;
                }

                case WorkerTaskType.GET_TOKEN_INFO: {
                    const {tokenId} = task.data;
                    result.data = await HederaSDKHelper
                        .setNetwork(networkOptions)
                        .getTokenInfo(tokenId);
                    break;
                }

                case WorkerTaskType.GET_TOPIC_MESSAGE: {
                    const {timeStamp} = task.data;
                    result.data = await HederaSDKHelper
                        .setNetwork(networkOptions)
                        .getTopicMessage(timeStamp);
                    break;
                }

                case WorkerTaskType.GET_TOPIC_MESSAGES: {
                    const {topic, timeStamp} = task.data;
                    result.data = await HederaSDKHelper
                        .setNetwork(networkOptions)
                        .getTopicMessages(topic, timeStamp);
                    break;
                }

                case WorkerTaskType.GET_TOPIC_MESSAGE_BY_INDEX: {
                    const {topic, index} = task.data;
                    result.data = await HederaSDKHelper
                        .setNetwork(networkOptions)
                        .getTopicMessageByIndex(topic, index);
                    break;
                }

                case WorkerTaskType.GET_TOPIC_MESSAGE_CHUNKS: {
                    const {topic, timeStamp, next} = task.data;
                    result.data = await HederaSDKHelper
                        .setNetwork(networkOptions)
                        .getTopicMessageChunks(topic, timeStamp, next);
                    break;
                }

                case WorkerTaskType.CHECK_ACCOUNT: {
                    const {hederaAccountId} = task.data;
                    result.data = !HederaSDKHelper.checkAccount(hederaAccountId);

                    break;
                }

                case WorkerTaskType.CREATE_CONTRACT: {
                    const {
                        hederaAccountId,
                        hederaAccountKey,
                        topicKey,
                        bytecodeFileId,
                        memo,
                        gas
                    } = task.data;
                    const contractMemo = memo || '';
                    client = new HederaSDKHelper(
                        hederaAccountId,
                        hederaAccountKey,
                        null,
                        networkOptions
                    );
                    result.data = await client.createContract(
                        bytecodeFileId,
                        new ContractFunctionParameters().addString(topicKey),
                        gas,
                        contractMemo
                    );

                    break;
                }

                /**
                 * Create contract V2 22.07.2025
                 */
                case WorkerTaskType.CREATE_CONTRACT_V2: {
                    const {
                        hederaAccountId,
                        hederaAccountKey,
                        topicKey,
                        bytecodeFileId,
                        memo,
                        gas,
                        constructorParams,
                        userId
                    } = task.data;
                    const contractMemo = memo || '';

                    client = new HederaSDKHelper(
                        hederaAccountId,
                        hederaAccountKey,
                        null,
                        networkOptions
                    );
                    if(!constructorParams) {
                        result.data = await client.createContractV2(
                            bytecodeFileId,
                            new ContractFunctionParameters().addString(topicKey),
                            gas,
                            contractMemo
                        );

                        break
                    }

                    const [[singleContractId], [doubleContractId]] = await Promise.all([
                        client.createContractV2(
                            constructorParams.retireSingleFileId,
                            new ContractFunctionParameters(),
                            constructorParams.retireSingleContractGas,
                            contractMemo
                        ),
                        client.createContractV2(
                            constructorParams.retireDoubleFileId,
                            new ContractFunctionParameters(),
                            constructorParams.retireDoubleContractGas,
                            contractMemo
                        )
                    ]);

                    const routerConstructor = new ContractFunctionParameters()
                        .addAddress(ContractId.fromString(singleContractId).toSolidityAddress())
                        .addAddress(ContractId.fromString(doubleContractId).toSolidityAddress());

                    const [routerContractId, logInfo] = await client.createContractV2(
                        bytecodeFileId,
                        routerConstructor,
                        gas,
                        contractMemo
                    );

                    result.data = [routerContractId, logInfo];

                    const routerAddr = ContractId.fromString(routerContractId).toSolidityAddress();
                    const implIds = [singleContractId, doubleContractId];

                    for (const implId of implIds) {
                        try {
                            await client.contractCall(
                                implId,
                                constructorParams.retireAdminRoleGas,
                                'addAdmin',
                                [
                                    { type: ContractParamType.ADDRESS, value: routerAddr }
                                ]
                            );
                            await this.logger.info(
                                `[CREATE_CONTRACT bootstrap] addAdmin(${implId}) -> SUCCESS`,
                                ['WORKER'],
                                userId
                            );
                        } catch (e) {
                            await this.logger.warn(
                                `[CREATE_CONTRACT bootstrap] addAdmin(${implId}) failed: ${(e as Error).message}`,
                                ['WORKER'],
                                userId
                            )
                        }
                    }

                    break;
                }

                case WorkerTaskType.CONTRACT_CALL: {
                    const {
                        hederaAccountId,
                        hederaAccountKey,
                        contractId,
                        functionName,
                        gas,
                        parameters,
                    } = task.data;
                    client = new HederaSDKHelper(
                        hederaAccountId,
                        hederaAccountKey,
                        null,
                        networkOptions
                    );
                    result.data = await client.contractCall(
                        contractId, gas, functionName,
                        parameters
                    );
                    break;
                }

                case WorkerTaskType.CONTRACT_QUERY: {
                    const {
                        hederaAccountId,
                        hederaAccountKey,
                        contractId,
                        functionName,
                        parameters,
                        gas
                    } = task.data;
                    client = new HederaSDKHelper(
                        hederaAccountId,
                        hederaAccountKey,
                        null,
                        networkOptions
                    );
                    const contractQueryResult = await client.contractQuery(
                        contractId, gas, functionName,
                        parameters
                    );
                    result.data = Buffer.from(contractQueryResult.asBytes());
                    break;
                }

                case WorkerTaskType.CUSTOM_CONTRACT_CALL: {
                    const {
                        hederaAccountId,
                        hederaAccountKey,
                        contractId,
                        gas,
                        parameters,
                    } = task.data;
                    client = new HederaSDKHelper(
                        hederaAccountId,
                        hederaAccountKey,
                        null,
                        networkOptions
                    );
                    const dataParameters = Buffer.from((parameters as string).slice(2), `hex`);
                    result.data = await client.customContractCall(
                        contractId, gas,
                        dataParameters
                    );
                    break;
                }

                case WorkerTaskType.CUSTOM_CONTRACT_QUERY: {
                    const {
                        hederaAccountId,
                        hederaAccountKey,
                        contractId,
                        parameters,
                        gas
                    } = task.data;
                    client = new HederaSDKHelper(
                        hederaAccountId,
                        hederaAccountKey,
                        null,
                        networkOptions
                    );
                    const contractQueryResult = await client.customContractQuery(
                        contractId, gas,
                        parameters
                    );
                    result.data = Buffer.from(contractQueryResult.asBytes());
                    break;
                }

                case WorkerTaskType.GET_CONTRACT_INFO: {
                    const {
                        contractId,
                    } = task.data;
                    const info = await HederaSDKHelper.getContractInfo(contractId);
                    result.data = {
                        memo: info.memo
                    };

                    break;
                }

                case WorkerTaskType.GET_CONTRACT_EVENTS: {
                    const {
                        timestamp,
                        contractId,
                        order,
                    } = task.data;
                    result.data = await HederaSDKHelper.getContractEvents(contractId, timestamp, order);
                    break;
                }

                case WorkerTaskType.GET_USER_NFTS_SERIALS: {
                    const {hederaAccountId, tokenId} = task.data;

                    const nfts = (await HederaSDKHelper.getSerialsNFT(hederaAccountId, tokenId)) || [];
                    const serials = {};
                    nfts.forEach(item => {
                        if (serials[item.token_id]) {
                            serials[item.token_id].push(item.serial_number);
                        } else {
                            serials[item.token_id] = [item.serial_number];
                        }
                    });
                    result.data = serials;

                    break;
                }

                case WorkerTaskType.GET_TOKEN_NFTS: {
                    const {
                        tokenId,
                        accountId,
                        serialnumber,
                        order,
                        filter,
                        limit
                    } = task.data;
                    const nfts = await HederaSDKHelper.getNFTTokenSerials(tokenId, accountId, serialnumber, order, filter, limit);
                    result.data = nfts?.map(nft => nft.serial_number) || [];
                    break;
                }

                case WorkerTaskType.GET_TRANSACTIONS: {
                    const {
                        accountId,
                        transactiontype,
                        timestamp,
                        order,
                        filter,
                        limit,
                    } = task.data;
                    const transactions = await HederaSDKHelper.getTransactions(accountId, transactiontype, timestamp, order, filter, limit);
                    result.data = transactions || [];
                    break;
                }

                default:
                    result.error = 'unknown task'
            }
            ///////
        } catch (e) {
            result.error = e.message;
            result.isTimeoutError = e.isTimeoutError;
        } finally {
            this.safeDestroyClient(client);
        }

        return result;
    }

    /**
     * Process with timeout
     * @param task
     * @private
     */
    private processTaskWithTimeout(task: ITask): Promise<ITaskResult> {
        return new Promise(async (resolve, reject) => {
            try {
                const result = await Promise.race([
                    this.processTask(task),
                    rejectTimeout(this.taskTimeout)
                ]);
                resolve(result as ITaskResult);
            } catch (e) {
                const error = {
                    id: this.currentTaskId,
                    error: 'Unknown error'
                }
                if (e) {
                    error.error = e.message || e;
                }
                resolve(error);
            }
        })
    }
}
