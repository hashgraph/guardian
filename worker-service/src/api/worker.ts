import { Logger, MessageBrokerChannel, SettingsContainer } from '@guardian/common';
import {
    ExternalMessageEvents,
    ITask,
    ITaskResult,
    IWorkerRequest,
    WorkerEvents,
    WorkerTaskType
} from '@guardian/interfaces';
import { HederaSDKHelper } from './helpers/hedera-sdk-helper';
import { Environment } from './helpers/environment';
import { IpfsClient } from './ipfs-client';
import Blob from 'cross-blob';
import { HederaUtils } from './helpers/utils';
import { PrivateKey } from '@hashgraph/sdk';

/**
 * Split chunk
 * @param array
 * @param chunk
 * @return
 */
function splitChunk<T>(array: T[], chunk: number): T[][] {
    const res: T[][] = [];
    let i: number;
    let j: number;
    for (i = 0, j = array.length; i < j; i += chunk) {
        res.push(array.slice(i, i + chunk));
    }
    return res;
}

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

/**
 * Worker class
 */
export class Worker {
    /**
     * Logger instance
     * @private
     */
    private readonly logger: Logger;

    /**
     * Ipfs client
     * @private
     */
    private readonly ipfsClient: IpfsClient;

    /**
     * Current task ID
     */
    private currentTaskId: string;

    /**
     * Update event received flag
     * @private
     */
    private updateEventReceived = false;

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
     * Channel Name
     * @private
     */
    private readonly _channelName: string;

    constructor(
        private readonly channel: MessageBrokerChannel
    ) {
        const { IPFS_STORAGE_API_KEY } = new SettingsContainer().settings;

        this.logger = new Logger();
        this.ipfsClient = new IpfsClient(IPFS_STORAGE_API_KEY);

        this.minPriority = parseInt(process.env.MIN_PRIORITY, 10);
        this.maxPriority = parseInt(process.env.MAX_PRIORITY, 10);
        this.taskTimeout = parseInt(process.env.TASK_TIMEOUT, 10) * 1000; // env in seconds
        this._channelName = process.env.SERVICE_CHANNEL.toUpperCase();
    }

    /**
     * Initialize worker
     */
    public init(): void {
        setInterval(() => {
            if (!this.isInUse) {
                this.getItem().then();
            }
        }, parseInt(process.env.REFRESH_INTERVAL, 10) * 1000);

        this.channel.subscribe(WorkerEvents.QUEUE_UPDATED, () => {
            if (!this.isInUse) {
                this.getItem().then();
            } else {
                this.updateEventReceived = true;
            }
        });

        HederaSDKHelper.setTransactionResponseCallback(async (client: any) => {
            try {
                const balance = await HederaSDKHelper.balance(client, client.operatorAccountId);
                await this.channel.request(['api-gateway', 'update-user-balance'].join('.'), {
                    balance,
                    unit: 'Hbar',
                    operatorAccountId: client.operatorAccountId.toString()
                });
            } catch (error) {
                throw new Error(`Worker (${['api-gateway', 'update-user-balance'].join('.')}) send: ` + error);
            }
        })
    }

    /**
     * Request to guardian service method
     * @param entity
     * @param params
     * @param type
     */
    private async request<T extends any>(entity: string, params?: IWorkerRequest | ITaskResult, type?: string): Promise<T> {
        try {
            const response = await this.channel.request<any, T>(`guardians.${entity}`, params);
            if (!response) {
                throw new Error('Server is not available');
            }
            if (response.error) {
                throw new Error(response.error);
            }
            return response.body;
        } catch (error) {
            throw new Error(`Guardian (${entity}) send: ` + error);
        }
    }

    /**
     * Clear states
     * @private
     */
    private clearState(): void {
        this.isInUse = false;
        this.currentTaskId = null;
        this.updateEventReceived = false;
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

        try {
            switch (task.type) {
                case WorkerTaskType.ADD_FILE: {
                    let fileContent = Buffer.from(task.data.payload.content, 'base64');
                    const data = await this.channel.request<any, any>(ExternalMessageEvents.IPFS_BEFORE_UPLOAD_CONTENT, task.data.payload);
                    if (data && data.body) {
                        fileContent = Buffer.from(data.body, 'base64')
                    }
                    const blob: any = new Blob([fileContent]);
                    const r = await this.ipfsClient.addFiile(blob);
                    this.channel.publish(ExternalMessageEvents.IPFS_ADDED_FILE, r);
                    result.data = r;
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

                case WorkerTaskType.SEND_HEDERA: {
                    Environment.setNetwork(task.data.network);
                    Environment.setLocalNodeAddress(task.data.localNodeAddress);
                    Environment.setLocalNodeProtocol(task.data.localNodeProtocol);
                    const {operatorId, operatorKey, dryRun} = task.data.clientOptions;
                    const client = new HederaSDKHelper(operatorId, operatorKey, dryRun);
                    const {topicId, buffer, submitKey, memo} = task.data;
                    result.data = await client.submitMessage(topicId, buffer, submitKey, memo);
                    break;
                }

                case WorkerTaskType.GENERATE_DEMO_KEY: {
                    const {operatorId, operatorKey, initialBalance} = task.data;
                    const client = new HederaSDKHelper(operatorId, operatorKey);
                    const treasury = await client.newAccount(initialBalance);
                    result.data = {
                        id: treasury.id.toString(),
                        key: treasury.key.toString()
                    };
                    break;
                }

                case WorkerTaskType.GET_USER_BALANCE: {
                    const {hederaAccountId, hederaAccountKey} = task.data;
                    const client = new HederaSDKHelper(hederaAccountId, hederaAccountKey);
                    result.data = await client.balance(hederaAccountId);

                    break;
                }

                case WorkerTaskType.GET_ACCOUNT_INFO: {
                    const {userID, userKey, hederaAccountId} = task.data;
                    const client = new HederaSDKHelper(userID, userKey);
                    result.data = await client.accountInfo(hederaAccountId);

                    break;
                }

                case WorkerTaskType.CREATE_TOKEN: {
                    const {
                        operatorId,
                        operatorKey,
                        changeSupply,
                        decimals,
                        enableAdmin,
                        enableFreeze,
                        enableKYC,
                        enableWipe,
                        initialSupply,
                        tokenName,
                        tokenSymbol,
                        tokenType} = task.data;
                    const client = new HederaSDKHelper(operatorId, operatorKey);
                    const treasury = client.newTreasury(operatorId, operatorKey);
                    const treasuryId = treasury.id;
                    const treasuryKey = treasury.key;
                    const adminKey = enableAdmin ? treasuryKey : null;
                    const kycKey = enableKYC ? treasuryKey : null;
                    const freezeKey = enableFreeze ? treasuryKey : null;
                    const wipeKey = enableWipe ? treasuryKey : null;
                    const supplyKey = changeSupply ? treasuryKey : null;
                    const nft = tokenType === 'non-fungible';
                    const _decimals = nft ? 0 : decimals;
                    const _initialSupply = nft ? 0 : initialSupply;
                    const tokenId = await client.newToken(
                        tokenName,
                        tokenSymbol,
                        nft,
                        _decimals,
                        _initialSupply,
                        '',
                        treasury,
                        adminKey,
                        kycKey,
                        freezeKey,
                        wipeKey,
                        supplyKey,
                    );

                    result.data = {
                        tokenId,
                        tokenName,
                        tokenSymbol,
                        tokenType,
                        decimals: _decimals,
                        initialSupply: _initialSupply,
                        adminId: treasuryId ? treasuryId.toString() : null,
                        adminKey: adminKey ? adminKey.toString() : null,
                        kycKey: kycKey ? kycKey.toString() : null,
                        freezeKey: freezeKey ? freezeKey.toString() : null,
                        wipeKey: wipeKey ? wipeKey.toString() : null,
                        supplyKey: supplyKey ? supplyKey.toString() : null
                    }

                    break;
                }

                case WorkerTaskType.NEW_TOKEN: {
                    const {
                        operatorId,
                        operatorKey,
                        tokenName,
                        tokenSymbol,
                        nft,
                        decimals,
                        initialSupply,
                        tokenMemo,
                        adminKey,
                        kycKey,
                        freezeKey,
                        wipeKey,
                        supplyKey,
                    } = task.data;
                    const client = new HederaSDKHelper(operatorId, operatorKey);
                    result.data = await client.newToken(
                        tokenName,
                        tokenSymbol,
                        nft,
                        decimals,
                        initialSupply,
                        tokenMemo,
                        {
                            id: operatorId,
                            key: PrivateKey.fromString(operatorKey)
                        },
                        PrivateKey.fromString(adminKey),
                        PrivateKey.fromString(kycKey),
                        PrivateKey.fromString(freezeKey),
                        PrivateKey.fromString(wipeKey),
                        PrivateKey.fromString(supplyKey),
                    );

                    break;
                }

                case WorkerTaskType.ASSOCIATE_TOKEN: {
                    const {userID, userKey, associate, tokenId, dryRun} = task.data;
                    const client = new HederaSDKHelper(userID, userKey, dryRun);
                    if (associate) {
                        result.data = await client.associate(tokenId, userID, userKey);
                    } else {
                        result.data = await client.dissociate(tokenId, userID, userKey);
                    }

                    break;
                }

                case WorkerTaskType.GRANT_KYC_TOKEN: {
                    const {hederaAccountId, hederaAccountKey, userHederaAccountId, tokenId, kycKey, grant, dryRun} = task.data;
                    const client = new HederaSDKHelper(hederaAccountId, hederaAccountKey, dryRun);

                    if (grant) {
                        await client.grantKyc(tokenId, userHederaAccountId, kycKey);
                    } else {
                        await client.revokeKyc(tokenId, userHederaAccountId, kycKey);
                    }

                    result.data = await client.accountInfo(userHederaAccountId);

                    break;
                }

                case WorkerTaskType.FREEZE_TOKEN: {
                    const {hederaAccountId, hederaAccountKey, freezeKey, freeze, tokenId, dryRun} = task.data;
                    const client = new HederaSDKHelper(hederaAccountId, hederaAccountKey, dryRun);
                    if (freeze) {
                        await client.freeze(tokenId, hederaAccountId, freezeKey);
                    } else {
                        await client.unfreeze(tokenId, hederaAccountId, freezeKey);
                    }
                    result.data = await client.accountInfo(hederaAccountId)

                    break;
                }

                case WorkerTaskType.MINT_TOKEN: {
                    const {hederaAccountId, hederaAccountKey, token, tokenValue, dryRun, transactionMemo, uuid, targetAccount, mintId} = task.data;

                    const client = new HederaSDKHelper(hederaAccountId, hederaAccountKey, dryRun);
                    const tokenId = token.tokenId;
                    const supplyKey = token.supplyKey;
                    const adminId = token.adminId;
                    const adminKey = token.adminKey;

                    if (token.tokenType === 'non-fungible') {
                        const metaData = HederaUtils.decode(uuid);
                        const data = new Array<Uint8Array>(Math.floor(tokenValue));
                        data.fill(metaData);
                        const serials: number[] = [];
                        const dataChunk = splitChunk(data, 10);
                        for (let i = 0; i < dataChunk.length; i++) {
                            const element = dataChunk[i];
                            if (i % 100 === 0) {
                                console.log(`Mint(${mintId}): Minting (Chunk: ${i + 1}/${dataChunk.length})`);
                            }
                            try {
                                const newSerials = await client.mintNFT(tokenId, supplyKey, element, transactionMemo);
                                for (const serial of newSerials) {
                                    serials.push(serial)
                                }
                            } catch (error) {
                                console.error(`Mint(${mintId}): Mint Error (${error.message})`);
                            }
                        }

                        console.log(`Mint(${mintId}): Minted (Count: ${serials.length})`);
                        console.log(`Mint(${mintId}): Transfer ${adminId} -> ${targetAccount} `);

                        const serialsChunk = splitChunk(serials, 10);
                        for (let i = 0; i < serialsChunk.length; i++) {
                            const element = serialsChunk[i];
                            if (i % 100 === 0) {
                                console.log(`Mint(${mintId}): Transfer (Chunk: ${i + 1}/${serialsChunk.length})`);
                            }
                            try {
                                await client.transferNFT(tokenId, targetAccount, adminId, adminKey, element, transactionMemo);
                            } catch (error) {
                                console.error(`Mint(${mintId}): Transfer Error (${error.message})`);
                            }
                        }
                    } else {
                        await client.mint(tokenId, supplyKey, tokenValue, transactionMemo);
                        await client.transfer(tokenId, targetAccount, adminId, adminKey, tokenValue, transactionMemo);
                    }

                    result.data = {}

                    break;
                }

                case WorkerTaskType.WIPE_TOKEN: {
                    const {
                        hederaAccountId,
                        hederaAccountKey,
                        targetAccount,
                        tokenValue,
                        dryRun,
                        token,
                        uuid
                    } = task.data;

                    const tokenId = token.tokenId;
                    const wipeKey = token.wipeKey;

                    const client = new HederaSDKHelper(hederaAccountId, hederaAccountKey , dryRun);
                    if (token.tokenType === 'non-fungible') {
                        result.error = 'unsupported operation';
                    } else {
                        await client.wipe(tokenId, targetAccount, wipeKey, tokenValue, uuid);
                        result.data = {}
                    }
                    break;
                }

                case WorkerTaskType.NEW_TOPIC: {
                    const {hederaAccountId, hederaAccountKey , dryRun, topicMemo} = task.data;
                    const client = new HederaSDKHelper(hederaAccountId, hederaAccountKey , dryRun);
                    result.data = await client.newTopic(
                        hederaAccountKey,
                        hederaAccountKey,
                        topicMemo
                    );

                    break;
                }

                case WorkerTaskType.CHECK_ACCOUNT: {
                    const {hederaAccountId} = task.data;
                    result.data = !HederaSDKHelper.checkAccount(hederaAccountId);

                    break;
                }

                default:
                    result.error = 'unknown task'
            }
            ///////
        } catch (e) {
            result.error = e.message;
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

    /**
     * Get item from queue
     */
    public async getItem(): Promise<any> {
        this.isInUse = true;

        this.logger.info(`Search task`, [this._channelName]);

        let task: any = null;
        try {
            task = await Promise.race([
                this.request(WorkerEvents.QUEUE_GET, {
                    minPriority: this.minPriority,
                    maxPriority: this.maxPriority,
                    taskTimeout: this.taskTimeout
                }),
                rejectTimeout(this.taskTimeout)
            ]);
        } catch (e) {
            this.clearState();
            return;
        }

        if (!task) {
            this.isInUse = false;

            this.logger.info(`Task not found`, [this._channelName]);

            if (this.updateEventReceived) {
                this.updateEventReceived = false;
                this.getItem().then();
            }

            return;
        }

        this.currentTaskId = task.id;

        this.logger.info(`Task started: ${task.id}, ${task.type}`, [this._channelName]);

        const result = await this.processTaskWithTimeout(task);

        try {
            await this.request(WorkerEvents.TASK_COMPLETE, result);
            this.logger.info(`Task completed: ${this.currentTaskId}`, [this._channelName]);
        } catch (error) {
            this.logger.error(error.message, [this._channelName]);
            this.clearState();

        }

        this.getItem().then();
    }
}
