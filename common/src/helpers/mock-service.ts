import { GenerateUUIDv4 } from '@guardian/interfaces';
import { AccountId, Status, Timestamp, TokenCreateTransaction, TokenId, TokenType, TopicCreateTransaction, TopicId, TopicMessageSubmitTransaction, Transaction, TransactionReceipt, TransactionRecord } from '@hiero-ledger/sdk';
import { DatabaseServer } from '../database-modules/database-server.js';
import { Singleton } from '../decorators/singleton.js';
import { NatsService } from '../mq/index.js';
import JSZip from 'jszip';

export enum MockType {
    ADD_FILE = 'ADD_FILE',
    GET_FILE = 'GET_FILE',
    DELETE_FILE = 'DELETE_FILE',
    EXECUTE_AND_RECEIPT = 'EXECUTE_AND_RECEIPT',
    EXECUTE_AND_RECORD = 'EXECUTE_AND_RECORD',
    GET_TOKEN = 'GET_TOKEN',
    GET_MESSAGE = 'GET_MESSAGE',
    GET_MESSAGES = 'GET_MESSAGES',
    GET_ACCOUNT = 'GET_ACCOUNT',
    API = 'API'
}

export enum MockEntityType {
    FILE = 'FILE',
    TOPIC = 'TOPIC',
    MESSAGE = 'MESSAGE',
    TOKEN = 'TOKEN',
    ACCOUNT = 'ACCOUNT',
    API = 'API',
}

export interface AddFileEvent {
    mockId: string;
    type: MockType.ADD_FILE;
    data: {
        type: MockEntityType.FILE,
        content: string
    }
}
export interface GetFileEvent {
    mockId: string;
    type: MockType.GET_FILE;
    data: {
        type: MockEntityType.FILE,
        cid: string
    }
}
export interface DeleteFileEvent {
    mockId: string;
    type: MockType.DELETE_FILE;
    data: {
        type: MockEntityType.FILE,
        cid: string
    }
}
export interface ExecuteAndReceiptEvent {
    mockId: string;
    type: MockType.EXECUTE_AND_RECEIPT;
    data: {
        type: MockEntityType,
        transaction: any
    }
}
export interface ExecuteAndRecordEvent {
    mockId: string;
    type: MockType.EXECUTE_AND_RECORD;
    data: {
        type: MockEntityType,
        transaction: any
    }
}
export interface GetTokenEvent {
    mockId: string;
    type: MockType.GET_TOKEN;
    data: {
        type: MockEntityType.TOKEN,
        tokenId: string
    }
}
export interface GetMessageEvent {
    mockId: string;
    type: MockType.GET_MESSAGE;
    data: {
        type: MockEntityType.MESSAGE,
        timeStamp: string
    } | {
        type: MockEntityType.MESSAGE,
        topicId: string,
        index: number
    }
}
export interface GetMessagesEvent {
    mockId: string;
    type: MockType.GET_MESSAGES;
    data: {
        type: MockEntityType.MESSAGE,
        topicId: string,
        startTimestamp?: string
    }
}
export interface GetAccountEvent {
    mockId: string;
    type: MockType.GET_ACCOUNT;
    data: {
        type: MockEntityType.ACCOUNT,
        accountId: string
    }
}
export interface ApiEvent {
    mockId: string;
    type: MockType.API;
    data: {
        type: MockEntityType.API,
        method: string,
        url: string,
        headers: any,
        data: any
    }
}

export type MockEvent =
    AddFileEvent |
    GetFileEvent |
    DeleteFileEvent |
    ExecuteAndReceiptEvent |
    GetTokenEvent |
    ExecuteAndRecordEvent |
    GetMessageEvent |
    GetMessagesEvent |
    GetAccountEvent |
    ApiEvent;

export class MockUpHelper {
    public static async execute(event: MockEvent) {
        if (event.type === MockType.ADD_FILE) {
            return await MockUpHelper.addFile(event.mockId, event.data.type, event.data.content);
        }
        if (event.type === MockType.GET_FILE) {
            return await MockUpHelper.getFile(event.mockId, event.data.type, event.data.cid);
        }
        if (event.type === MockType.DELETE_FILE) {
            return await MockUpHelper.deleteCid(event.mockId, event.data.type, event.data.cid);
        }
        if (event.type === MockType.EXECUTE_AND_RECEIPT) {
            return await MockUpHelper.executeAndReceipt(event.mockId, event.data.type, event.data.transaction);
        }
        if (event.type === MockType.EXECUTE_AND_RECORD) {
            return await MockUpHelper.executeAndRecord(event.mockId, event.data.type, event.data.transaction);
        }
        if (event.type === MockType.GET_TOKEN) {
            return await MockUpHelper.getHederaToken(event.mockId, event.data);
        }
        if (event.type === MockType.GET_MESSAGE) {
            return await MockUpHelper.getHederaMessage(event.mockId, event.data);
        }
        if (event.type === MockType.GET_MESSAGES) {
            return await MockUpHelper.getHederaMessages(event.mockId, event.data);
        }
        if (event.type === MockType.API) {
            return await MockUpHelper.api(event.mockId, event.data);
        }
        throw new Error('Invalid method');
    }

    public static getBuffet(content: Buffer<ArrayBufferLike>): string {
        return content.toString('binary');
    }

    private static async addFile(
        mockId: string,
        type: MockEntityType,
        fileContent: string
    ): Promise<string> {
        const cid = GenerateUUIDv4();
        await DatabaseServer.saveMockUp(mockId, type, { cid, document: fileContent });
        return cid;
    }

    private static async getFile(
        mockId: string,
        type: MockEntityType,
        cid: string
    ): Promise<any> {
        const row = await DatabaseServer.getMockUp(mockId, type, { cid });
        if (row && row.document) {
            return row.document;
        } else {
            throw new Error('Invalid cid');
        }
    }

    private static async deleteCid(
        mockId: string,
        type: MockEntityType,
        cid: string
    ): Promise<boolean> {
        await DatabaseServer.deleteMockUp(mockId, type, { cid });
        return true;
    }

    private static async executeAndReceipt(
        mockId: string,
        type: MockEntityType,
        transaction: any
    ): Promise<TransactionReceipt> {
        try {
            if (type) {
                await DatabaseServer.saveMockUp(mockId, type, { transaction });
            }
            return transaction;
        } catch (error) {
            console.error(error);
            return {
                status: Status.Success
            } as any;
        }
    }

    private static async executeAndRecord(
        mockId: string,
        type: MockEntityType,
        transaction: any
    ): Promise<TransactionRecord> {
        try {
            if (type) {
                await DatabaseServer.saveMockUp(mockId, type, { transaction });
            }
            return transaction;
        } catch (error) {
            console.error(error);
            return {
                consensusTimestamp: MockUpHelper.getTimestamp()
            } as any;
        }
    }

    private static async getHederaToken(
        mockId: string,
        params: { tokenId: string }
    ): Promise<any> {
        const row = await DatabaseServer.getMockUp(mockId, MockEntityType.TOKEN, {
            'transaction.token_id': params?.tokenId
        });
        if (row) {
            return row.transaction;
        } else {
            return null;
        }
    }

    private static async getHederaMessage(
        mockId: string,
        params: any //{ timeStamp: string } | { topicId: string, index: number }
    ): Promise<{
        id: string;
        consensus_timestamp: string;
        payer_account_id: string;
        sequence_number: string;
        topicId: string;
        message: string;
    }> {
        if (params.timeStamp) {
            const row = await DatabaseServer.getMockUp(mockId, MockEntityType.MESSAGE, {
                'transaction.consensus_timestamp': params.timeStamp
            });
            if (row) {
                return row.transaction;
            } else {
                return null;
            }
        } else if (params.topicId) {
            let rows = await DatabaseServer.getMockUps(mockId, MockEntityType.MESSAGE, {
                'transaction.topic_id': params.topicId
            });
            rows = rows.sort((a, b) => a.transaction.consensus_timestamp < b.transaction.consensus_timestamp ? -1 : 1);
            const index = (params.index || 1) - 1;
            const row = rows[index];
            if (row) {
                return row.transaction;
            } else {
                return null;
            }
        }
    }

    private static async getHederaMessages(
        mockId: string,
        params: { topicId: string, startTimestamp?: string }
    ): Promise<{
        id: string;
        consensus_timestamp: string;
        payer_account_id: string;
        sequence_number: string;
        topicId: string;
        message: string;
    }[]> {
        let result: any[];
        if (params.startTimestamp) {
            let rows = await DatabaseServer.getMockUps(mockId, MockEntityType.MESSAGE, {
                'transaction.topic_id': params.topicId,
                'transaction.consensus_timestamp': { $gte: params.startTimestamp }
            });
            rows = rows.sort((a, b) => a.transaction.consensus_timestamp < b.transaction.consensus_timestamp ? -1 : 1);
            result = rows.map((row) => row.transaction);
        } else {
            let rows = await DatabaseServer.getMockUps(mockId, MockEntityType.MESSAGE, {
                'transaction.topic_id': params.topicId
            });
            rows = rows.sort((a, b) => a.transaction.consensus_timestamp < b.transaction.consensus_timestamp ? -1 : 1);
            result = rows.map((row) => row.transaction);
        }
        if (result && result.length) {
            return result;
        } else {
            return null;
        }
    }

    private static async api(mockId: string, request: {
        method: string,
        url: string,
        headers: any,
        data: any
    }): Promise<any> {
        request.method = request.method?.toUpperCase();
        const row = await DatabaseServer.getMockUp(mockId, MockEntityType.API, {
            'request.url': request.url,
            'request.method': request.method,
        });

        if (!row) {
            throw new Error('Response not found');
        }

        if (row.request.responseType === 'JSON') {
            return JSON.parse(row.response);
        } else {
            return row.response;
        }
    }

    public static deserializeTransaction(transaction: any): any {
        transaction.status = Status.Success;
        if (transaction.consensus_timestamp) {
            transaction.consensusTimestamp = MockUpHelper.stringToTimestamp(transaction.consensus_timestamp);
        }
        if (transaction.topic_id) {
            transaction.topicId = MockUpHelper.stringToTopicId(transaction.topic_id);
        }
        if (transaction.token_id) {
            transaction.tokenId = MockUpHelper.stringToTokenId(transaction.token_id);
        }
        if (transaction.account_id) {
            transaction.accountId = MockUpHelper.stringToAccountId(transaction.account_id);
        }
        return transaction;
    }

    public static getReceipt(
        type: string,
        accountId: string,
        transaction: Transaction
    ): {
        type: MockEntityType,
        transaction: any
    } {
        if (type === 'TokenCreateTransaction') {
            const t = transaction as TokenCreateTransaction;
            const token_id = MockUpHelper.getTokenId();

            const treasury_account_id = t.treasuryAccountId?.toString();
            const name = t.tokenName;
            const symbol = t.tokenSymbol;
            const type = t.tokenType === TokenType.FungibleCommon ? 'FUNGIBLE_COMMON' : 'NON_FUNGIBLE_UNIQUE';
            const decimals = t.decimals.toInt();
            const admin_key = !!t.adminKey;
            const supply_key = !!t.supplyKey;
            const freeze_key = !!t.freezeKey;
            const kyc_key = !!t.kycKey;
            const wipe_key = !!t.wipeKey;
            return {
                type: MockEntityType.TOKEN,
                transaction: {
                    id: token_id,
                    token_id,
                    treasury_account_id,
                    name,
                    symbol,
                    type,
                    decimals,
                    admin_key,
                    supply_key,
                    freeze_key,
                    kyc_key,
                    wipe_key
                }
            }
        }
        if (type === 'AccountCreateTransaction') {
            const account_id = MockUpHelper.getAccountId();
            return {
                type: MockEntityType.ACCOUNT,
                transaction: {
                    id: account_id,
                    account_id
                }
            }
        }
        if (type === 'TopicCreateTransaction') {
            const t = transaction as TopicCreateTransaction;
            const memo = t.getTopicMemo();
            const topicId = MockUpHelper.getTopicId();
            return {
                type: MockEntityType.TOPIC,
                transaction: {
                    id: topicId,
                    topic_id: topicId,
                    payer_account_id: accountId,
                    memo
                }
            }
        }

        if (type === 'TokenAssociateTransaction') {
            return {
                type: null,
                transaction: {}
            };
        }
        if (type === 'TokenDissociateTransaction') {
            return {
                type: null,
                transaction: {}
            };
        }
        if (type === 'TokenFreezeTransaction') {
            return {
                type: null,
                transaction: {}
            };
        }
        if (type === 'TokenUnfreezeTransaction') {
            return {
                type: null,
                transaction: {}
            };
        }
        if (type === 'TokenGrantKycTransaction') {
            return {
                type: null,
                transaction: {}
            };
        }
        if (type === 'TokenRevokeKycTransaction') {
            return {
                type: null,
                transaction: {}
            };
        }
        if (type === 'TokenMintTransaction') {
            return {
                type: null,
                transaction: {}
            };
        }
        if (type === 'TokenMintNFTTransaction') {
            return {
                type: null,
                transaction: {}
            };
        }
        if (type === 'TokenWipeTransaction') {
            return {
                type: null,
                transaction: {}
            };
        }
        if (type === 'TransferTransaction') {
            return {
                type: null,
                transaction: {}
            };
        }
        if (type === 'NFTTransferTransaction') {
            return {
                type: null,
                transaction: {}
            };
        }
        throw new Error('Invalid Type');
    }

    public static getRecord(
        type: string,
        accountId: string,
        transaction: Transaction
    ): {
        type: MockEntityType,
        transaction: any
    } {
        if (type === 'TopicMessageSubmitTransaction') {
            const t = transaction as TopicMessageSubmitTransaction;
            const timestamp = MockUpHelper.getTimestamp();
            const consensus_timestamp = MockUpHelper.timestampToString(timestamp);
            const topic_id = t.topicId.toString();
            const message = t.getMessage().toString();
            const base64 = Buffer.from(message, 'utf8').toString('base64');

            return {
                type: MockEntityType.MESSAGE,
                transaction: {
                    id: consensus_timestamp,
                    consensus_timestamp,
                    topicId: topic_id,
                    topic_id,
                    payer_account_id: accountId,
                    sequence_number: 1,
                    message: base64
                }
            }
        }
        throw new Error('Invalid Type');
    }

    private static getTimestamp(): Timestamp {
        const time = Date.now();
        const seconds = Math.floor(time / 100);
        const nanos = Math.floor((time - seconds + Math.random()) * 1000000);
        return new Timestamp(seconds, nanos);
    }

    private static timestampToString(timestamp: Timestamp): string {
        const seconds = timestamp.seconds.toString();
        const nanos = timestamp.nanos.toString();
        return (seconds + '.' + ('000000000' + nanos).slice(-9));
    }

    private static stringToTimestamp(timestamp: string): Timestamp {
        const [seconds, nanos] = (timestamp || '').split('.');
        return new Timestamp(Number(seconds), Number(nanos));
    }

    private static getTopicId(): string {
        return (new TopicId(Date.now())).toString();
    }

    private static getAccountId(): string {
        return (new AccountId(Date.now())).toString();
    }

    private static getTokenId(): string {
        return (new TokenId(Date.now())).toString();
    }

    private static stringToTopicId(id: string): TopicId {
        const i = Number(id.split('.')[2]);
        return new TopicId(i);
    }

    private static stringToTokenId(id: string): AccountId {
        const i = Number(id.split('.')[2]);
        return new AccountId(i);
    }

    private static stringToAccountId(id: string): TokenId {
        const i = Number(id.split('.')[2]);
        return new TokenId(i);
    }

    public static async getMockUpData(mockId: string): Promise<{
        ipfs: any[],
        topics: any[],
        tokens: any[],
        api: any[],
        users: any[]
    }> {
        const rows = await DatabaseServer.getMockUps(mockId);

        const ipfsMap = new Map<string, any>();
        const topicMap = new Map<string, any>();
        const tokenMap = new Map<string, any>();
        const apiMap = new Map<string, any>();

        for (const row of rows) {
            if (row.type === MockEntityType.FILE) {
                ipfsMap.set(row.cid, row.document);
            } else if (row.type === MockEntityType.TOPIC) {
                const transaction = row.transaction;
                const topic = topicMap.get(transaction.topic_id);
                if (topic) {
                    transaction.messages = topic.messages;
                } else {
                    transaction.messages = [];
                }
                topicMap.set(transaction.topic_id, transaction);
            } else if (row.type === MockEntityType.MESSAGE) {
                const transaction = row.transaction;
                const topic = topicMap.get(transaction.topic_id) || {
                    topic_id: transaction.topic_id
                };
                topic.messages = topic.messages || [];
                topic.messages.push(transaction)
                topicMap.set(transaction.topic_id, topic);
            } else if (row.type === MockEntityType.TOKEN) {
                const transaction = row.transaction;
                tokenMap.set(transaction.token_id, row.transaction);
            } else if (row.type === MockEntityType.ACCOUNT) {
                return null;
            } else if (row.type === MockEntityType.API) {
                const request = row.request;
                const response = row.response;
                request.method = request.method?.toUpperCase();
                const id = `${request.method}|${request.url}`;
                apiMap.set(id, { request, response });
            }
        }

        const ipfs: any[] = [];
        for (const [cid, content] of ipfsMap.entries()) {
            ipfs.push({ cid, content });
        }
        const topics: any[] = [];
        for (const [topicId, topic] of topicMap.entries()) {
            let messages: any[] = topic.messages;
            messages = messages.sort((a, b) => a.consensus_timestamp < b.consensus_timestamp ? -1 : 1);
            for (let index = 0; index < messages.length; index++) {
                messages[index].sequence_number = index + 1;
            }
            delete topic.messages;
            topics.push({ topicId, topic, messages });
        }

        const tokens: any[] = [];
        for (const transaction of tokenMap.values()) {
            tokens.push(transaction);
        }

        const api: any[] = [];
        for (const config of apiMap.values()) {
            api.push(config);
        }


        const userRows = await DatabaseServer.getVirtualUsers(mockId, null, true, true);
        const users: any[] = [];
        for (const user of userRows) {
            if (user.username !== 'Administrator') {
                users.push({
                    username: user.username,
                    did: user.did,
                    hederaAccountId: user.hederaAccountId,
                    hederaAccountKey: user.hederaAccountKey,
                    systemMode: user.systemMode,
                    document: user.document,
                });
            }
        }

        return {
            ipfs,
            topics,
            tokens,
            api,
            users
        }
    }

    public static async import(mockId: string, zipFile: any): Promise<boolean> {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);

        const ipfsString = await content.files['ipfs.json'].async('string');
        const topicsString = await content.files['topics.json'].async('string');
        const tokensString = await content.files['tokens.json'].async('string');
        const apiString = await content.files['api.json'].async('string');
        const usersString = await content.files['users.json'].async('string');

        const ipfs = ipfsString ? JSON.parse(ipfsString) : null;
        const topics = topicsString ? JSON.parse(topicsString) : null;
        const tokens = tokensString ? JSON.parse(tokensString) : null;
        const api = apiString ? JSON.parse(apiString) : null;
        const users = usersString ? JSON.parse(usersString) : null;

        // await DatabaseServer.deleteMockUps(mockId);

        await MockUpHelper._setMockUpData(mockId, { ipfs, topics, tokens, api, users });

        return true;
    }

    public static async export(mockId: string): Promise<JSZip> {
        const zip = new JSZip();
        const DETERMINISTIC_ZIP_DATE = new Date(Date.UTC(1980, 0, 1, 0, 0, 0));
        const ZIP_FILE_OPTIONS = {
            createFolders: false,
            date: DETERMINISTIC_ZIP_DATE,
            unixPermissions: 0o100644,
            dosPermissions: 0x20,
        };
        const data = await MockUpHelper.getMockUpData(mockId);
        zip.file('ipfs.json', JSON.stringify(data.ipfs), ZIP_FILE_OPTIONS);
        zip.file('topics.json', JSON.stringify(data.topics), ZIP_FILE_OPTIONS);
        zip.file('tokens.json', JSON.stringify(data.tokens), ZIP_FILE_OPTIONS);
        zip.file('api.json', JSON.stringify(data.api), ZIP_FILE_OPTIONS);
        zip.file('users.json', JSON.stringify(data.users), ZIP_FILE_OPTIONS);
        return zip;
    }

    public static async setMockUpData(mockId: string, data: any): Promise<any> {
        await DatabaseServer.deleteMockUps(mockId);
        await MockUpHelper._setMockUpData(mockId, data);
        return await MockUpHelper.getMockUpData(mockId);
    }

    private static async _setMockUpData(mockId: string, data: {
        ipfs: any[],
        topics: any[],
        tokens: any[],
        api: any[],
        users: any[]
    }) {
        if (Array.isArray(data.ipfs)) {
            for (const file of data.ipfs) {
                await DatabaseServer.saveMockUp(mockId, MockEntityType.FILE, {
                    cid: file.cid,
                    document: file.content
                });
            }
        }
        if (Array.isArray(data.topics)) {
            for (const topic of data.topics) {
                await DatabaseServer.saveMockUp(mockId, MockEntityType.TOPIC, {
                    transaction: topic.topic
                });
                if (topic.messages) {
                    for (let i = 0; i < topic.messages.length; i++) {
                        const message = topic.messages[i];
                        message.sequence_number = i + 1;
                        await DatabaseServer.saveMockUp(mockId, MockEntityType.MESSAGE, {
                            transaction: message
                        });
                    }
                }
            }
        }
        if (Array.isArray(data.tokens)) {
            for (const token of data.tokens) {
                await DatabaseServer.saveMockUp(mockId, MockEntityType.TOKEN, {
                    transaction: token
                });
            }
        }
        if (Array.isArray(data.api)) {
            for (const api of data.api) {
                api.request.method = api.request.method?.toUpperCase();
                await DatabaseServer.saveMockUp(mockId, MockEntityType.API, {
                    request: api.request,
                    response: api.response
                });
            }
        }
        if (Array.isArray(data.users)) {
            for (const user of data.users) {
                await DatabaseServer.createVirtualUser(
                    mockId,
                    user.username,
                    user.did,
                    user.hederaAccountId,
                    user.hederaAccountKey,
                    false,
                    user.systemMode,
                    user.document,
                )
            }
        }
    }

    public static async replaceSchema(
        mockId: string,
        messageId: string,
        contextCid: string,
        dryRunUrl: string,
    ) {
        try {
            const row = await DatabaseServer.getMockUp(mockId, MockEntityType.MESSAGE, {
                'transaction.consensus_timestamp': messageId
            });
            if (row) {
                const dryRunCid = dryRunUrl.replace('schema:', '');
                const message = row.transaction.message;
                const buffer = Buffer.from(message, 'base64').toString();
                const item = JSON.parse(buffer);
                item.context_cid = dryRunCid;
                item.context_uri = dryRunUrl;
                const json = JSON.stringify(item);
                const encodedJson = Buffer.from(json, 'utf8').toString('base64');
                row.transaction.message = encodedJson;

                const file = await DatabaseServer.getMockUp(mockId, MockEntityType.FILE, { cid: contextCid });
                file.cid = dryRunCid;
                await DatabaseServer.updateMockUp(file);

                await DatabaseServer.updateMockUp(row);
            }
        } catch (error) {
            console.error(error);
        }
    }
}

@Singleton
export class MockService extends NatsService {
    /**
     * Message queue name
     */
    public messageQueueName = 'mock-service-' + GenerateUUIDv4();

    /**
     * Reply subject
     * @private
     */
    public replySubject = this.messageQueueName + `-reply-${GenerateUUIDv4()}`;

    constructor() {
        super();
    }

    public async execute(event: MockEvent): Promise<any> {
        return await this.sendMessage('MOCK_EVENT_EXECUTE', event);
    }
}
