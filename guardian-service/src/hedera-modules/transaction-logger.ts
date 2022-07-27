import {
    AccountCreateTransaction,
    AccountId,
    TokenAssociateTransaction,
    TokenCreateTransaction,
    TokenDissociateTransaction,
    TokenFreezeTransaction,
    TokenGrantKycTransaction,
    TokenMintTransaction,
    TokenRevokeKycTransaction,
    TokenUnfreezeTransaction,
    TokenWipeTransaction,
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
    Transaction,
    TransferTransaction
} from '@hashgraph/sdk';
import { HederaSDKHelper } from './hedera-sdk-helper';

/**
 * Transaction log level
 */
export enum TransactionLogLvl {
    NONE = '0',
    TRANSACTION = '1',
    DEBUG = '2'
}

/**
 * Transaction logger
 */
export class TransactionLogger {
    /**
     * Log level
     * @private
     */
    private static logLvl: TransactionLogLvl = TransactionLogLvl.NONE;
    /**
     * Callback
     * @private
     */
    private static fn: Function = null;
    /**
     * Time map
     * @private
     */
    private static readonly map = {};

    /**
     * Set log level
     * @param lvl
     */
    public static setLogLevel(lvl: TransactionLogLvl): void {
        TransactionLogger.logLvl = lvl || TransactionLogLvl.NONE;
    }

    /**
     * Set log function
     * @param fn
     */
    public static setLogFunction(fn: Function): void {
        TransactionLogger.fn = fn;
    }

    /**
     * Create log message
     * @param types
     * @param duration
     * @param name
     * @param attr
     * @private
     */
    private static log(types: string[], duration: number, name: string, attr?: string[]) {
        const date = (new Date()).toISOString();
        const d = duration ? `${(duration / 1000)}s` : '_';
        const attribute = attr || [];
        if (TransactionLogger.fn) {
            TransactionLogger.fn(types, date, d, name, attribute);
        }
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
        } else {
            return text.length;
        }
    }

    /**
     * Message log
     * @param id
     * @param name
     */
    public static async messageLog(id: string, name: string): Promise<void> {
        try {
            if (TransactionLogger.logLvl === TransactionLogLvl.NONE) {
                return;
            }
            const time = Date.now();
            const start = TransactionLogger.map[id];
            TransactionLogger.map[id] = time;

            if (start) {
                const duration = time - start;
                TransactionLogger.log(['MESSAGE', 'COMPLETION'], duration, name, [id]);
            } else {
                TransactionLogger.log(['MESSAGE', 'SEND'], null, name, [id]);
            }
        } catch (error) {
            TransactionLogger.log(['MESSAGE', 'ERROR'], null, name, [id, error.message]);
        }
    }

    /**
     * Transaction log
     * @param id
     * @param operatorAccountId
     * @param transactionName
     * @param transaction
     * @param metadata
     */
    public static async transactionLog(
        id: string, operatorAccountId: AccountId, transactionName: string, transaction?: Transaction, metadata?: any
    ): Promise<void> {
        try {
            if (TransactionLogger.logLvl === TransactionLogLvl.NONE) {
                return;
            }
            const time = Date.now();
            const start = TransactionLogger.map[id];
            TransactionLogger.map[id] = time;

            const account = operatorAccountId.toString();
            const data = TransactionLogger.getTransactionData(transactionName, transaction, metadata);
            const attr = [id, account, data];

            if (TransactionLogger.logLvl === TransactionLogLvl.DEBUG) {
                try {
                    const client = new HederaSDKHelper(process.env.OPERATOR_ID, process.env.OPERATOR_KEY, false);
                    const balance = await client.balance(operatorAccountId);
                    attr.push(balance);
                } catch (error) {
                    attr.push(null);
                }
            }

            if (transaction) {
                const duration = time - start;
                TransactionLogger.log(['TRANSACTION', 'COMPLETION'], duration, transactionName, attr);
            } else {
                TransactionLogger.log(['TRANSACTION', 'CREATE'], null, transactionName, attr);
            }
        } catch (error) {
            TransactionLogger.log(['TRANSACTION', 'ERROR'], null, transactionName, [id, error.message]);
        }
    }

    /**
     * Get transaction data
     * @param transactionName
     * @param transaction
     * @param metadata
     * @private
     */
    private static getTransactionData(transactionName: string, transaction: Transaction, metadata?: any): string {
        let data = '';
        if (!transaction) {
            return data;
        }
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
            data += `of NFTs transferred: ${metadata.length}; `;
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
        return data;
    }

    /**
     * Transaction error log
     * @param id
     * @param operatorAccountId
     * @param transactionName
     * @param transaction
     * @param message
     */
    public static async transactionErrorLog(
        id: string, operatorAccountId: AccountId, transactionName: string, transaction: Transaction, message: string
    ): Promise<void> {
        try {
            const account = operatorAccountId.toString();
            const attr = [id, account, message];
            TransactionLogger.log(['TRANSACTION', 'ERROR'], null, transactionName, attr);
        } catch (error) {
            TransactionLogger.log(['TRANSACTION', 'ERROR'], null, transactionName, [error.message]);
        }
    }

}
