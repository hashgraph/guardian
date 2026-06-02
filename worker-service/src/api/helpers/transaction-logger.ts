import {
    AccountCreateTransaction,
    Client,
    TokenAssociateTransaction,
    TokenCreateTransaction,
    TokenDeleteTransaction,
    TokenDissociateTransaction,
    TokenFreezeTransaction,
    TokenGrantKycTransaction,
    TokenMintTransaction,
    TokenRevokeKycTransaction,
    TokenUnfreezeTransaction,
    TokenUpdateTransaction,
    TokenWipeTransaction,
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
    Transaction,
    TransferTransaction
} from '@hiero-ledger/sdk';

/**
 * Transaction logger
 */
export class TransactionLogger {
    /**
     * Get transaction data
     * @param id
     * @param client
     * @param network
     * @param transactionName
     * @param userId
     */
    public static getTransactionData(
        id: string,
        client: Client,
        network: string,
        transactionName: string,
        userId: string | null
    ): any {
        return {
            id,
            network,
            operatorAccountId: client?.operatorAccountId?.toString(),
            transactionName,
            payload: { userId }
        }
    }

    /**
     * Get transaction message
     * @param transactionName
     * @param transaction
     * @param metadata
     */
    public static getTransactionMetadata(transactionName: string, transaction: Transaction, metadata?: any): string {
        let data = '';
        if (!transaction) {
            return data;
        }
        data += `txid: ${transaction.transactionId}; `;
        if (transactionName === 'TokenCreateTransaction') {
            const t = transaction as TokenCreateTransaction;
            data += 'payer sigs: 1; ';
            data += `admin keys: ${t.adminKey ? 1 : 0}; `;
            data += `KYC keys: ${t.kycKey ? 1 : 0}; `;
            data += `wipe keys: ${t.wipeKey ? 1 : 0}; `;
            data += `pause keys: ${t.pauseKey ? 1 : 0}; `;
            data += `supply keys: ${t.supplyKey ? 1 : 0}; `;
            data += `freeze keys: ${t.freezeKey ? 1 : 0}; `;
            data += `token name size: ${TransactionLogger.stringSize(t.tokenName)}; `;
            data += `token symbol size: ${TransactionLogger.stringSize(t.tokenSymbol)}; `;
            data += `token memo size: ${TransactionLogger.stringSize(t.tokenMemo)}; `;
            data += `memo size: ${TransactionLogger.stringSize(t.transactionMemo)}; `;
        }
        if (transactionName === 'TokenAssociateTransaction') {
            const t = transaction as TokenAssociateTransaction;
            data += 'payer sigs: 1; ';
            data += 'total sigs: 1; ';
            data += 'tokens associated: 1; ';
            data += `memo size: ${TransactionLogger.stringSize(t.transactionMemo)}; `;
        }
        if (transactionName === 'TokenDissociateTransaction') {
            const t = transaction as TokenDissociateTransaction;
            data += 'payer sigs: 1; ';
            data += 'total sigs: 1; ';
            data += 'tokens dissociated: 1; ';
            data += `memo size: ${TransactionLogger.stringSize(t.transactionMemo)}; `;
        }
        if (transactionName === 'TokenFreezeTransaction') {
            const t = transaction as TokenFreezeTransaction;
            data += 'payer sigs: 1; ';
            data += 'total sigs: 1; ';
            data += `memo size: ${TransactionLogger.stringSize(t.transactionMemo)}; `;
        }
        if (transactionName === 'TokenUnfreezeTransaction') {
            const t = transaction as TokenUnfreezeTransaction;
            data += 'payer sigs: 1; ';
            data += 'total sigs: 1; ';
            data += `memo size: ${TransactionLogger.stringSize(t.transactionMemo)}; `;
        }
        if (transactionName === 'TokenGrantKycTransaction') {
            const t = transaction as TokenGrantKycTransaction;
            data += 'payer sigs: 1; ';
            data += 'total sigs: 1; ';
            data += `memo size: ${TransactionLogger.stringSize(t.transactionMemo)}; `;
        }
        if (transactionName === 'TokenRevokeKycTransaction') {
            const t = transaction as TokenRevokeKycTransaction;
            data += 'payer sigs: 1; ';
            data += 'total sigs: 1; ';
            data += `memo size: ${TransactionLogger.stringSize(t.transactionMemo)}; `;
        }
        if (transactionName === 'TokenMintTransaction') {
            const t = transaction as TokenMintTransaction;
            data += 'Fungible Token; ';
            data += 'payer sigs: 1; ';
            data += 'total sigs: 1; ';
            data += `memo size: ${TransactionLogger.stringSize(t.transactionMemo)}; `;
        }
        if (transactionName === 'TokenMintNFTTransaction') {
            transactionName = 'TokenMintTransaction';
            const t = transaction as TokenMintTransaction;
            data += 'Non-Fungible Token; ';
            data += 'payer sigs: 1; ';
            data += 'total sigs: 1; ';
            data += `of NFTs minted: ${t.metadata.length};`;
            data += `bytes of metadata per NFT: ${t.metadata[0].length};`;
            data += `memo size: ${TransactionLogger.stringSize(t.transactionMemo)}; `;
        }
        if (transactionName === 'TokenWipeTransaction') {
            const t = transaction as TokenWipeTransaction;
            data += 'payer sigs: 1; ';
            data += 'total sigs: 1; ';
            data += `memo size: ${TransactionLogger.stringSize(t.transactionMemo)}; `;
        }
        if (transactionName === 'TransferTransaction') {
            const t = transaction as TransferTransaction;
            data += 'Fungible Token; ';
            data += 'payer sigs: 1; ';
            data += 'total sigs: 1; ';
            data += `amount: ${metadata}; `;
            data += `memo size: ${TransactionLogger.stringSize(t.transactionMemo)}; `;
        }
        if (transactionName === 'NFTTransferTransaction') {
            transactionName = 'TransferTransaction';
            const t = transaction as TransferTransaction;
            data += 'Non-Fungible Token; ';
            data += 'payer sigs: 1; ';
            data += 'total sigs: 1; ';
            data += `of NFTs transferred: ${TransactionLogger.stringSize(metadata)}; `;
            data += `memo size: ${TransactionLogger.stringSize(t.transactionMemo)}; `;
        }
        if (transactionName === 'AccountCreateTransaction') {
            const t = transaction as AccountCreateTransaction;
            data += 'payer sigs: 1; ';
            data += 'total sigs: 1; ';
            data += `memo size: ${TransactionLogger.stringSize(t.transactionMemo)}; `;
        }
        if (transactionName === 'TopicCreateTransaction') {
            const t = transaction as TopicCreateTransaction;
            data += 'payer sigs: 1; ';
            data += 'total sigs: 1; ';
            data += `admin keys: ${t.adminKey ? 1 : 0}; `;
            data += `submit keys: ${t.submitKey ? 1 : 0}; `;
            data += `topic memo size: ${TransactionLogger.stringSize(t.topicMemo)}; `;
            data += `memo size: ${TransactionLogger.stringSize(t.transactionMemo)}; `;
        }
        if (transactionName === 'TopicMessageSubmitTransaction') {
            const t = transaction as TopicMessageSubmitTransaction;
            data += 'payer sigs: 1; ';
            data += 'total sigs: 1; ';
            data += `message size: ${TransactionLogger.stringSize(t.message)}; `;
            data += `memo size: ${TransactionLogger.stringSize(t.transactionMemo)}; `;
        }
        if (transactionName === 'TokenUpdateTransaction') {
            const t = transaction as TokenUpdateTransaction;
            data += 'payer sigs: 1; ';
            data += `memo size: ${TransactionLogger.stringSize(t.transactionMemo)}; `;
        }
        if (transactionName === 'TokenDeleteTransaction') {
            const t = transaction as TokenDeleteTransaction;
            data += 'payer sigs: 1; ';
            data += `memo size: ${TransactionLogger.stringSize(t.transactionMemo)}; `;
        }
        return data;
    }

    /**
     * String size
     * @param text
     * @private
     */
    private static stringSize(text: string | Uint8Array): number {
        if (typeof text === 'string') {
            const array = Buffer.from(text, 'utf8');
            return array.length;
        } else if (text) {
            return text.length;
        } else {
            return null;
        }
    }
}
