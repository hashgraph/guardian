import { GenerateUUIDv4 } from '@guardian/interfaces';
import { AccountId, Status, Timestamp, TokenId, TopicId, TopicMessageSubmitTransaction, Transaction, TransactionReceipt, TransactionRecord } from '@hiero-ledger/sdk';
import { DatabaseServer } from '../database-modules/database-server.js';
import { Singleton } from '../decorators/singleton.js';
import { NatsService } from '../mq/index.js';

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

export interface AddFileEvent {
    mockId: string;
    type: MockType.ADD_FILE;
    data: Buffer<ArrayBufferLike>
}
export interface GetFileEvent {
    mockId: string;
    type: MockType.GET_FILE;
    data: string
}
export interface DeleteFileEvent {
    mockId: string;
    type: MockType.DELETE_FILE;
    data: string
}
export interface ExecuteAndReceiptEvent {
    mockId: string;
    type: MockType.EXECUTE_AND_RECEIPT;
    data: any
}
export interface ExecuteAndRecordEvent {
    mockId: string;
    type: MockType.EXECUTE_AND_RECORD;
    data: any
}
export interface GetTokenEvent {
    mockId: string;
    type: MockType.GET_TOKEN;
    data: { tokenId: string }
}
export interface GetMessageEvent {
    mockId: string;
    type: MockType.GET_MESSAGE;
    data: { timeStamp: string } | { topicId: string, index: number }
}
export interface GetMessagesEvent {
    mockId: string;
    type: MockType.GET_MESSAGES;
    data: { topicId: string, startTimestamp?: string }
}
export interface GetAccountEvent {
    mockId: string;
    type: MockType.GET_ACCOUNT;
    data: { accountId: string }
}
export interface ApiEvent {
    mockId: string;
    type: MockType.API;
    data: {
        method: string,
        url: string,
        headers: any,
        data: any
    }
}
export interface CreateTokenEvent {
    mockId: string;
    type: MockType.CREATE_TOKEN;
    data: any
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
        if (event.type === MockType.ADD_FILE) {
            return await MockUpHelper.addFile(event.mockId, event.data);
        }
        if (event.type === MockType.GET_FILE) {
            return await MockUpHelper.getFile(event.mockId, event.data);
        }
        if (event.type === MockType.DELETE_FILE) {
            return await MockUpHelper.deleteCid(event.mockId, event.data);
        }
        if (event.type === MockType.EXECUTE_AND_RECEIPT) {
            return await MockUpHelper.executeAndReceipt(event.mockId, event.data);
        }
        if (event.type === MockType.EXECUTE_AND_RECORD) {
            return await MockUpHelper.executeAndRecord(event.mockId, event.data);
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

    private static async addFile(mockId: string, fileContent: Buffer<ArrayBufferLike>): Promise<string> {
        const cid = GenerateUUIDv4();
        const body = fileContent.toString('binary');
        await DatabaseServer.saveMockUpFile(mockId, cid, body);
        return cid;
    }

    private static async getFile(mockId: string, cid: string): Promise<any> {
        const body = await DatabaseServer.getMockUpFile(mockId, cid);
        if (body) {
            return body;
        } else {
            throw new Error('Invalid cid');
        }
    }

    private static async deleteCid(mockId: string, cid: string): Promise<boolean> {
        await DatabaseServer.deleteMockUpFile(mockId, cid);
        return true;
    }

    private static async createToken(mockId: string, tokenTemplate: any): Promise<string> {
        const tokenId = new TokenId(Date.now()).toString();
        console.log('123', tokenTemplate);
        return tokenId;
    }

    private static async executeAndReceipt(
        mockId: string,
        transaction: any
    ): Promise<TransactionReceipt> {
        console.log('executeAndReceipt', transaction);
        return {
            status: Status.Success,
            topicId: new TopicId(Date.now()),
            tokenId: new TokenId(Date.now()),
            accountId: new AccountId(Date.now()),
            serials: []
        } as any;
    }

    private static async executeAndRecord(
        mockId: string,
        transaction: any
    ): Promise<TransactionRecord> {
        try {
            if (transaction.consensus_timestamp) {
                transaction.consensusTimestamp = MockUpHelper.stringToTimestamp(transaction.consensus_timestamp);
            } else {
                transaction.consensusTimestamp = MockUpHelper.getTimestamp();
            }
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
        return null;
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
        return null;
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
        return null;
    }

    private static async getHederaAccount(
        mockId: string,
        params: { accountId: string }
    ): Promise<{
        account: string;
        balance: string;
        key: string;
    }> {
        return null;
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
    }


    public static getReceipt(
        type: string,
        accountId: string,
        transaction: Transaction
    ) {
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

        }
        if (type === 'TokenUpdateTransaction') {

        }
        if (type === 'TokenDeleteTransaction') {

        }
    }

    public static getRecord(
        type: string,
        accountId: string,
        transaction: Transaction
    ): any {
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
                id: consensus_timestamp,
                consensus_timestamp,
                topicId: topic_id,
                topic_id,
                payer_account_id: accountId,
                sequence_number: 0,
                message: base64
            }
        }
        if (type === 'TokenUpdateTransaction') {

        }
        if (type === 'TokenDeleteTransaction') {

        }
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