import { GenerateUUIDv4 } from '@guardian/interfaces';
import { AccountId, Status, Timestamp, TokenId, TopicCreateTransaction, TopicId, TopicMessageSubmitTransaction, Transaction, TransactionReceipt, TransactionRecord } from '@hiero-ledger/sdk';
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
    CREATE_TOKEN = 'CREATE_TOKEN',
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
export interface CreateTokenEvent {
    mockId: string;
    type: MockType.CREATE_TOKEN;
    data: {
        type: MockEntityType.TOKEN,
        template: any
    }
}

export type MockEvent =
    AddFileEvent |
    GetFileEvent |
    DeleteFileEvent |
    ExecuteAndReceiptEvent |
    GetTokenEvent |
    ExecuteAndRecordEvent |
    CreateTokenEvent |
    GetMessageEvent |
    GetMessagesEvent |
    GetAccountEvent |
    ApiEvent;

export class MockUpHelper {
    public static async execute(event: MockEvent) {
        console.debug(event);
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
        if (event.type === MockType.CREATE_TOKEN) {
            return await MockUpHelper.createToken(event.mockId, event.data);
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
        if (event.type === MockType.GET_ACCOUNT) {
            return await MockUpHelper.getHederaAccount(event.mockId, event.data);
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
        await DatabaseServer.saveMockUp(mockId, type, { cid, content: fileContent });
        return cid;
    }

    private static async getFile(
        mockId: string,
        type: MockEntityType,
        cid: string
    ): Promise<any> {
        const row = await DatabaseServer.getMockUp(mockId, type, { cid });
        if (row && row.content) {
            return row.content;
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

    private static async createToken(mockId: string, tokenTemplate: any): Promise<string> {
        const tokenId = new TokenId(Date.now()).toString();
        throw new Error('createToken');
        return tokenId;
    }

    private static async executeAndReceipt(
        mockId: string,
        type: MockEntityType,
        transaction: any
    ): Promise<TransactionReceipt> {
        await DatabaseServer.saveMockUp(mockId, type, { transaction });
        return transaction;
    }

    private static async executeAndRecord(
        mockId: string,
        type: MockEntityType,
        transaction: any
    ): Promise<TransactionRecord> {
        try {
            await DatabaseServer.saveMockUp(mockId, type, { transaction });
            return transaction;
        } catch (error) {
            console.error(error);
            return { consensusTimestamp: MockUpHelper.getTimestamp() } as any;
        }
    }

    private static async getHederaToken(
        mockId: string,
        params: { tokenId: string }
    ): Promise<any> {
        throw new Error('getHederaToken');
    }

    private static async getHederaMessage(
        mockId: string,
        params:
            { timeStamp: string } |
            { topicId: string, index: number }
    ): Promise<{
        id: string;
        consensus_timestamp: string;
        payer_account_id: string;
        sequence_number: string;
        topicId: string;
        message: string;
    }> {
        throw new Error('getHederaMessage');
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
        throw new Error('getHederaMessages');
    }

    private static async getHederaAccount(
        mockId: string,
        params: { accountId: string }
    ): Promise<{
        account: string;
        balance: string;
        key: string;
    }> {
        throw new Error('getHederaAccount');
    }

    private static async api(mockId: string, config: {
        method: string,
        url: string,
        headers: any,
        data: any
    }): Promise<any> {
        const method = config.method;
        if (method === 'GET') {

        } else if (method === 'POST') {

        } else if (method === 'PUT') {

        } else if (method === 'PATCH') {

        } else if (method === 'DELETE') {

        } else {
            throw new Error('Invalid method');
        }
        throw new Error('api');
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
        console.debug('getReceipt', type, transaction);
        if (type === 'TokenCreateTransaction') {

        }
        if (type === 'TokenAssociateTransaction') {

        }
        if (type === 'TokenDissociateTransaction') {

        }
        if (type === 'TokenFreezeTransaction') {

        }
        if (type === 'TokenUnfreezeTransaction') {

        }
        if (type === 'TokenGrantKycTransaction') {

        }
        if (type === 'TokenRevokeKycTransaction') {

        }
        if (type === 'TokenMintTransaction') {

        }
        if (type === 'TokenMintNFTTransaction') {

        }
        if (type === 'TokenWipeTransaction') {

        }
        if (type === 'TransferTransaction') {

        }
        if (type === 'NFTTransferTransaction') {

        }
        if (type === 'AccountCreateTransaction') {

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
        if (type === 'TopicMessageSubmitTransaction') {

        }
        if (type === 'TokenUpdateTransaction') {

        }
        if (type === 'TokenDeleteTransaction') {

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
        if (type === 'TokenCreateTransaction') {

        }
        if (type === 'TokenAssociateTransaction') {

        }
        if (type === 'TokenDissociateTransaction') {

        }
        if (type === 'TokenFreezeTransaction') {

        }
        if (type === 'TokenUnfreezeTransaction') {

        }
        if (type === 'TokenGrantKycTransaction') {

        }
        if (type === 'TokenRevokeKycTransaction') {

        }
        if (type === 'TokenMintTransaction') {

        }
        if (type === 'TokenMintNFTTransaction') {

        }
        if (type === 'TokenWipeTransaction') {

        }
        if (type === 'TransferTransaction') {

        }
        if (type === 'NFTTransferTransaction') {

        }
        if (type === 'AccountCreateTransaction') {

        }
        if (type === 'TopicCreateTransaction') {

        }
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
                    sequence_number: 0,
                    message: base64
                }
            }
        }
        if (type === 'TokenUpdateTransaction') {

        }
        if (type === 'TokenDeleteTransaction') {

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

    public static async getMockUpData(mockId: string): Promise<any> {
        const rows = await DatabaseServer.getMockUps(mockId);

        const ipfsMap = new Map<string, any>();
        const topicMap = new Map<string, any>();
        for (const row of rows) {
            if (row.type === MockEntityType.FILE) {
                ipfsMap.set(row.cid, row.content);
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

            } else if (row.type === MockEntityType.ACCOUNT) {

            } else if (row.type === MockEntityType.API) {

            }
        }

        const ipfs: any[] = [];
        for (const [cid, content] of ipfsMap.entries()) {
            ipfs.push({ cid, content });
        }
        const topics: any[] = [];
        for (const [topicId, topic] of topicMap.entries()) {
            let messages: any[] = topic.messages;
            messages = messages.sort((a, b) => a.consensus_timestamp > b.consensus_timestamp ? -1 : 1);
            for (let index = 0; index < messages.length; index++) {
                messages[index].sequence_number = index;
            }
            delete topic.messages;
            topics.push({ topicId, topic, messages });
        }

        return {
            ipfs,
            topics
        }
    }

    public static async import(mockId: string, zipFile: any): Promise<boolean> {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);

        const ipfsString = await content.files['ipfs.json'].async('string');
        const topicsString = await content.files['topics.json'].async('string');

        const ipfs = ipfsString ? JSON.parse(ipfsString) : null;
        const topics = topicsString ? JSON.parse(topicsString) : null;

        await DatabaseServer.deleteMockUps(mockId);

        if (ipfs) {
            for (const file of ipfs) {
                await DatabaseServer.saveMockUp(mockId, MockEntityType.FILE, {
                    cid: file.cid,
                    content: file.content
                });
            }
        }
        if (topics) {
            for (const topic of topics) {
                await DatabaseServer.saveMockUp(mockId, MockEntityType.TOPIC, {
                    transaction: topic.topic
                });
                if (topic.messages) {
                    for (const message of topic.messages) {
                        await DatabaseServer.saveMockUp(mockId, MockEntityType.MESSAGE, {
                            transaction: message
                        });
                    }
                }
            }
        }

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
        return zip;
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
