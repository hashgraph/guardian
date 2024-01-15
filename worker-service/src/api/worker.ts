import { Logger, MessageBrokerChannel, MessageResponse, NatsService, NotificationHelper, Users, ValidateConfiguration } from '@guardian/common';
import { ExternalMessageEvents, GenerateUUIDv4, ITask, ITaskResult, WorkerEvents, WorkerTaskType } from '@guardian/interfaces';
import { HederaSDKHelper, NetworkOptions } from './helpers/hedera-sdk-helper';
import { IpfsClientClass } from './ipfs-client-class';
import { AccountId, ContractFunctionParameters, ContractId, PrivateKey, TokenId } from '@hashgraph/sdk';
import { HederaUtils } from './helpers/utils';
import axios from 'axios';
import process from 'process';

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
export class Worker extends NatsService {
    /**
     * Logger instance
     * @private
     */
    private readonly logger: Logger;

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

    constructor(
        private w3cKey: string,
        private w3cProof: string
    ) {
        super();
        this.ipfsClient = new IpfsClientClass(
            this.w3cKey,
            this.w3cProof
        );
        this.logger = new Logger();

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

        await this.ipfsClient.createClient()

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

            this.logger.info(`Task started: ${task.id}, ${task.type}`, [process.env.SERVICE_CHANNEL]);

            const result = await this.processTaskWithTimeout(task);

            try {
                // await this.publish([task.reply, WorkerEvents.TASK_COMPLETE].join('-'), result);
                if (result?.error) {
                    this.logger.error(`Task error: ${this.currentTaskId}, ${result?.error}`, [process.env.SERVICE_CHANNEL]);
                } else {
                    this.logger.info(`Task completed: ${this.currentTaskId}`, [process.env.SERVICE_CHANNEL]);
                }
            } catch (error) {
                this.logger.error(error.message, [process.env.SERVICE_CHANNEL]);
                this.clearState();

            }

            const completeTask = (data) => {
                // let count = 0;
                const fn = async () => {
                    await this.publish([task.reply, WorkerEvents.TASK_COMPLETE].join('.'), data);
                    // if (count < 5) {
                    //     setTimeout(async () => {
                    //         await fn()
                    //     })
                    //     count++
                    // }
                }
                fn();
            }

            await completeTask(result);
            // await this.publish([task.reply, WorkerEvents.TASK_COMPLETE].join('.'), result);
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
                this.ipfsClient = new IpfsClientClass(
                    this.w3cKey,
                    this.w3cProof
                );
                const validator = new ValidateConfiguration();
                await validator.validate();
            } catch (error) {
                this.logger.error(`Update settings error, ${error.message}`, ['WORKER']);
            }
        });

        HederaSDKHelper.setTransactionResponseCallback(async (operatorAccountId: string) => {
            try {
                const balance = await HederaSDKHelper.balanceRest(operatorAccountId);
                await this.sendMessage('update-user-balance', {
                    balance,
                    unit: 'Hbar',
                    operatorAccountId
                });
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
        try {
            switch (task.type) {
                case WorkerTaskType.ADD_FILE: {
                    let fileContent = Buffer.from(task.data.payload.content, 'base64');
                    const data = await this.channel.request<any, any>(ExternalMessageEvents.IPFS_BEFORE_UPLOAD_CONTENT, task.data.payload);
                    if (data && data.body) {
                        fileContent = Buffer.from(data.body, 'base64')
                    }
                    //const blob: any = new Blob([fileContent]);
                    const r = await this.ipfsClient.addFile(fileContent);
                    this.publish(ExternalMessageEvents.IPFS_ADDED_FILE, r);
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

                case WorkerTaskType.HTTP_REQUEST: {
                    const { method, url, headers, body } = task.data.payload;
                    const response = await axios({
                        method,
                        url,
                        headers,
                        data: body
                    });
                    result.data = response.data;
                    break;
                }

                case WorkerTaskType.SEND_HEDERA: {
                    const { operatorId, operatorKey, dryRun } = task.data.clientOptions;
                    const client = new HederaSDKHelper(operatorId, operatorKey, dryRun, networkOptions);
                    const { topicId, buffer, submitKey, memo } = task.data;
                    result.data = await client.submitMessage(topicId, buffer, submitKey, memo);
                    client.destroy();
                    break;
                }

                case WorkerTaskType.GENERATE_DEMO_KEY: {
                    const { operatorId, operatorKey, initialBalance } = task.data;
                    const client = new HederaSDKHelper(operatorId, operatorKey, null, networkOptions);
                    const treasury = await client.newAccount(initialBalance);
                    result.data = {
                        id: treasury.id.toString(),
                        key: treasury.key.toString()
                    };
                    client.destroy();
                    break;
                }

                case WorkerTaskType.GET_USER_BALANCE: {
                    const { hederaAccountId, hederaAccountKey } = task.data;
                    const client = new HederaSDKHelper(hederaAccountId, hederaAccountKey, null, networkOptions);
                    result.data = await client.balance(hederaAccountId);
                    client.destroy();

                    break;
                }

                case WorkerTaskType.GET_ACCOUNT_INFO: {
                    const { userID, userKey, hederaAccountId } = task.data;
                    const client = new HederaSDKHelper(userID, userKey, null, networkOptions);
                    result.data = await client.accountInfo(hederaAccountId);
                    client.destroy();

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
                    } = task.data;
                    const client = new HederaSDKHelper(operatorId, operatorKey, null, networkOptions);
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
                        wipeKey
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
                    client.destroy();

                    break;
                }

                case WorkerTaskType.UPDATE_TOKEN: {
                    const {
                        tokenId,
                        operatorId,
                        operatorKey,
                        adminKey,
                        changes
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
                    const client = new HederaSDKHelper(operatorId, operatorKey, null, networkOptions);
                    const status = await client.updateToken(
                        TokenId.fromString(tokenId),
                        HederaUtils.parsPrivateKey(adminKey, true, 'Admin Key'),
                        changes
                    )

                    result.data = {
                        status,
                        freezeKey: changes.freezeKey ? changes.freezeKey.toString() : null,
                        kycKey: changes.kycKey ? changes.kycKey.toString() : null,
                        wipeKey: changes.wipeKey ? changes.wipeKey.toString() : null
                    }
                    client.destroy();

                    break;
                }

                case WorkerTaskType.DELETE_TOKEN: {
                    const {
                        tokenId,
                        operatorId,
                        operatorKey,
                        adminKey,
                    } = task.data;

                    const client = new HederaSDKHelper(operatorId, operatorKey, null, networkOptions);
                    result.data = await client.deleteToken(
                        TokenId.fromString(tokenId),
                        HederaUtils.parsPrivateKey(adminKey, true, 'Admin Key')
                    )
                    client.destroy();

                    break;
                }

                case WorkerTaskType.ASSOCIATE_TOKEN: {
                    const { userID, userKey, associate, tokenId, dryRun } = task.data;
                    const client = new HederaSDKHelper(userID, userKey, dryRun, networkOptions);
                    if (associate) {
                        result.data = await client.associate(tokenId, userID, userKey);
                    } else {
                        result.data = await client.dissociate(tokenId, userID, userKey);
                    }
                    client.destroy();

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
                        dryRun
                    } = task.data;
                    const client = new HederaSDKHelper(hederaAccountId, hederaAccountKey, dryRun, networkOptions);

                    if (grant) {
                        result.data = await client.grantKyc(token.tokenId, userHederaAccountId, kycKey);
                    } else {
                        result.data = await client.revokeKyc(token.tokenId, userHederaAccountId, kycKey);
                    }
                    client.destroy();
                    const user = await new Users().getUserByAccount(userHederaAccountId);
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
                        dryRun
                    } = task.data;
                    const client = new HederaSDKHelper(hederaAccountId, hederaAccountKey, dryRun, networkOptions);
                    if (freeze) {
                        result.data = await client.freeze(token.tokenId, userHederaAccountId, freezeKey);
                    } else {
                        result.data = await client.unfreeze(token.tokenId, userHederaAccountId, freezeKey);
                    }
                    client.destroy();
                    const user = await new Users().getUserByAccount(userHederaAccountId);
                    await NotificationHelper.info(
                        `${freeze ? 'Freeze' : 'Unfreeze'} token`,
                        `${token.tokenName} ${freeze ? 'frozen' : 'unfrozen'}`,
                        user.id
                    );
                    break;
                }

                case WorkerTaskType.MINT_NFT: {
                    const { hederaAccountId, hederaAccountKey, dryRun, tokenId, supplyKey, metaData, transactionMemo } = task.data;
                    const client = new HederaSDKHelper(hederaAccountId, hederaAccountKey, dryRun, networkOptions);
                    let data: Uint8Array[];
                    if (Array.isArray(metaData)) {
                        data = new Array<Uint8Array>(metaData.length);
                        for (let i = 0; i < metaData.length; i++) {
                            data[i] = new Uint8Array(Buffer.from(metaData[i]));
                        }
                    } else {
                        data = [new Uint8Array(Buffer.from(metaData))];
                    }
                    result.data = await client.mintNFT(tokenId, supplyKey, data, transactionMemo);
                    client.destroy();

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
                        transactionMemo
                    } = task.data;
                    const client = new HederaSDKHelper(hederaAccountId, hederaAccountKey, dryRun, networkOptions);
                    const status = await client.transferNFT(tokenId, targetAccount, treasuryId, treasuryKey, element, transactionMemo);
                    result.data = status ? element : null
                    client.destroy();

                    break;
                }

                case WorkerTaskType.MINT_FT: {
                    const { hederaAccountId, hederaAccountKey, dryRun, tokenId, supplyKey, tokenValue, transactionMemo } = task.data;
                    const client = new HederaSDKHelper(hederaAccountId, hederaAccountKey, dryRun, networkOptions);
                    result.data = await client.mint(tokenId, supplyKey, tokenValue, transactionMemo);
                    client.destroy();

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
                        transactionMemo
                    } = task.data;
                    const client = new HederaSDKHelper(hederaAccountId, hederaAccountKey, dryRun, networkOptions);
                    result.data = await client.transfer(tokenId, targetAccount, treasuryId, treasuryKey, tokenValue, transactionMemo);
                    client.destroy();

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
                        wipeKey,
                        uuid
                    } = task.data;
                    const client = new HederaSDKHelper(hederaAccountId, hederaAccountKey, dryRun, networkOptions);
                    if (token.tokenType === 'non-fungible') {
                        result.error = 'unsupported operation';
                    } else {
                        await client.wipe(token.tokenId, targetAccount, wipeKey, tokenValue, uuid);
                        result.data = {}
                    }
                    client.destroy();

                    break;
                }

                case WorkerTaskType.NEW_TOPIC: {
                    const { hederaAccountId, hederaAccountKey, dryRun, topicMemo, keys } = task.data;
                    const client = new HederaSDKHelper(hederaAccountId, hederaAccountKey, dryRun, networkOptions);
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
                        adminKey,
                        submitKey,
                        topicMemo
                    );
                    client.destroy();

                    break;
                }

                case WorkerTaskType.GET_TOKEN_INFO: {
                    const { tokenId } = task.data;
                    result.data = await HederaSDKHelper
                        .setNetwork(networkOptions)
                        .getTokenInfo(tokenId);
                    break;
                }

                case WorkerTaskType.GET_TOPIC_MESSAGE: {
                    const { timeStamp } = task.data;
                    result.data = await HederaSDKHelper
                        .setNetwork(networkOptions)
                        .getTopicMessage(timeStamp);
                    break;
                }

                case WorkerTaskType.GET_TOPIC_MESSAGES: {
                    const { topic, timeStamp } = task.data;
                    result.data = await HederaSDKHelper
                        .setNetwork(networkOptions)
                        .getTopicMessages(topic, timeStamp);
                    break;
                }

                case WorkerTaskType.GET_TOPIC_MESSAGE_BY_INDEX: {
                    const { topic, index } = task.data;
                    result.data = await HederaSDKHelper
                        .setNetwork(networkOptions)
                        .getTopicMessageByIndex(topic, index);
                    break;
                }

                case WorkerTaskType.GET_TOPIC_MESSAGE_CHUNKS: {
                    const { topic, timeStamp, next } = task.data;
                    result.data = await HederaSDKHelper
                        .setNetwork(networkOptions)
                        .getTopicMessageChunks(topic, timeStamp, next);
                    break;
                }

                case WorkerTaskType.CHECK_ACCOUNT: {
                    const { hederaAccountId } = task.data;
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
                    const client = new HederaSDKHelper(
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
                    client.destroy();

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
                    const client = new HederaSDKHelper(
                        hederaAccountId,
                        hederaAccountKey,
                        null,
                        networkOptions
                    );
                    result.data = await client.contractCall(
                        contractId, gas, functionName,
                        parameters
                    );
                    client.destroy();
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
                    const client = new HederaSDKHelper(
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
                    client.destroy();
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
                    const client = new HederaSDKHelper(
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
                    client.destroy();
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
                    const client = new HederaSDKHelper(
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
                    client.destroy();
                    break;
                }

                case WorkerTaskType.GET_CONTRACT_INFO: {
                    const {
                        hederaAccountId,
                        hederaAccountKey,
                        contractId,
                    } = task.data;
                    const client = new HederaSDKHelper(
                        hederaAccountId,
                        hederaAccountKey,
                        null,
                        networkOptions
                    );
                    // const address = await client.contractQuery(
                    //     contractId,
                    //     'getOwner',
                    //     new ContractFunctionParameters()
                    // );
                    // const owner = AccountId.fromSolidityAddress(address.getAddress()).toString();
                    const info = await client.getContractInfo(contractId);
                    result.data = {
                        memo: info.contractMemo
                    };
                    client.destroy();

                    break;
                }

                case WorkerTaskType.GET_CONTRACT_EVENTS: {
                    const {
                        timestamp,
                        contractId,
                        order,
                        limit
                    } = task.data;
                    result.data = await HederaSDKHelper.getContractEvents(contractId, timestamp, order, limit);
                    break;
                }

                case WorkerTaskType.GET_USER_NFTS_SERIALS: {
                    const {
                        operatorId,
                        operatorKey,
                        tokenId,
                    } = task.data;
                    const client = new HederaSDKHelper(operatorId, operatorKey, null, networkOptions);
                    const nfts = (await client.getSerialsNFT(tokenId)) || [];
                    const serials = {};
                    nfts.forEach(item => {
                        if (serials[item.token_id]) {
                            serials[item.token_id].push(item.serial_number);
                        } else {
                            serials[item.token_id] = [item.serial_number];
                        }
                    });
                    result.data = serials;
                    client.destroy();

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
}
