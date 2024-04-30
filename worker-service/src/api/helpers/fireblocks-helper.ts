import { FireblocksSDK, PeerType, TransactionOperation, TransactionResponse, TransactionStatus } from 'fireblocks-sdk'

export class FireblocksHelper{

    private readonly client: FireblocksSDK;

    constructor(
        private readonly apiKey: string,
        private readonly privateKey: string,
        private readonly vaultId: string,
        private readonly assetId: string,
    ) {
        const baseUrl = process.env.FIREBLOCKS_BASEURL || 'https://api.fireblocks.io';
        this.client = new FireblocksSDK(this.privateKey, this.apiKey, baseUrl)
    }

    async createTransaction(message: Uint8Array) {
        try {
            const transaction = await this.client.createTransaction({
                operation: TransactionOperation.RAW,
                source: {type: PeerType.VAULT_ACCOUNT, id: this.vaultId},
                assetId: this.assetId,
                extraParameters: {rawMessageData: {messages: [{content: Buffer.from(message).toString('hex')}]}}
            });
            return await this.getTransactionResult(transaction.id);
        } catch (e) {
            console.log(e);
        }
    }

    private async delay(time: number): Promise<null> {
        return new Promise((resolve: any) => setTimeout(resolve, time));
    }

    private async getTransactionResult(transactionId: string): Promise<TransactionResponse> {
        const txInfo = await this.client.getTransactionById(transactionId);
        if ([
            TransactionStatus.CANCELLED,
            TransactionStatus.FAILED,
            TransactionStatus.BLOCKED,
            TransactionStatus.REJECTED,
        ].includes(txInfo.status)) {
            throw new Error(`Fireblocks transaction "${transactionId}" failed with status ${txInfo.status}`);
        }
        if (txInfo.status === TransactionStatus.COMPLETED) {
            return txInfo;
        } else {
            await this.delay(3000);
            return this.getTransactionResult(transactionId);
        }

    }
}
