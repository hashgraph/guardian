import { GenerateUUIDv4 } from "@guardian/interfaces";
import { AccountId, Status, TokenId, TopicId, Transaction, TransactionReceipt } from "@hiero-ledger/sdk";

export class MockService {
    public readonly mockId: string;

    constructor(mockId: string) {
        this.mockId = mockId;
    }

    public async addFile(file: Buffer<ArrayBufferLike>): Promise<string> {
        const cid = GenerateUUIDv4();
        return cid;
    }

    public async getFile(cid: string): Promise<any> {
        return '';
    }

    public async deleteCid(cid: string): Promise<boolean> {
        return true;
    }

    public async createToken(tokenTemplate: any): Promise<string> {
        const tokenId = new TokenId(Date.now()).toString();

        return tokenId;
    }

    public async executeAndReceipt(
        transaction: Transaction,
        type: string
    ): Promise<TransactionReceipt> {
        const receipt = this.getReceipt(type);



        return {
            status: Status.Success,
            topicId: new TopicId(Date.now()),
            tokenId: new TokenId(Date.now()),
            accountId: new AccountId(Date.now()),
            serials: []
        } as any;
    }

    private getReceipt(type: string) {
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

    public async getApi(type: string, params: any): Promise<any> {
        if (type === 'HEDERA_TOKEN') {
            return await this.getHederaToken(params);
        }
        if (type === 'HEDERA_MESSAGE') {
            return await this.getHederaMessage(params);
        }
        if (type === 'HEDERA_MESSAGES') {
            return await this.getHederaMessages(params);
        }
        if (type === 'HEDERA_ACCOUNT') {
            return await this.getHederaAccount(params);
        }
    }

    private async getHederaToken(
        params: { tokenId: string }
    ): Promise<any> {
        return null;
    }

    private async getHederaMessage(
        params:
            { timeStamp: string } |
            { topicId: string, index: string }
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

    private async getHederaMessages(
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

    private async getHederaAccount(
        params: { accountId: string }
    ): Promise<{
        account: string;
        balance: string;
        key: string;
    }> {
        return null;
    }

    public async api(config: {
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
}