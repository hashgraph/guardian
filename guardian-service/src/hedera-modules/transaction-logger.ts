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

export enum TransactionLogLvl {
    NONE = 0,
    DEBUG = 1
}

export class TransactionLogger {
    private static logLvl: TransactionLogLvl = TransactionLogLvl.NONE;

    public static setLogLevel(lvl: TransactionLogLvl): void {
        TransactionLogger.logLvl = lvl;
    }

    private static stringSize(text: string | Uint8Array): number {
        if (typeof text == 'string') {
            const array = Buffer.from(text, "utf8");
            return array.length;
        } else {
            return text.length;
        }
    }

    public static messageLog(name: string, duration?: number) {
        try {
            if (TransactionLogger.logLvl == TransactionLogLvl.DEBUG) {
                const date = new Date();
                if (duration) {
                    console.log(`[MESSAGE, COMPLETION]      ${date.toISOString()}  ${duration / 1000}s \t${name}`);
                } else {
                    console.log(`[MESSAGE, SEND]            ${date.toISOString()}  ____ \t${name}`);
                }
            }
        } catch (error) {
            const date = new Date();
            console.log(`[MESSAGE, ERROR]           ${date.toISOString()}  ____ \t${name} \t${error.message}`);
        }
    }

    public static transactionLog(operatorAccountId: AccountId, transactionName: string, transaction?: Transaction, metadata?: any, duration?: number): void {
        try {
            if (TransactionLogger.logLvl == TransactionLogLvl.DEBUG) {
                if (transaction) {
                    let data = '';
                    if (transactionName == 'TokenCreateTransaction') {
                        const t = transaction as TokenCreateTransaction;
                        data += 'payer sigs: 1; ';
                        data += `admin keys: ${t.adminKey ? 1 : 0}; `;
                        data += `KYC keys: ${t.kycKey ? 1 : 0}; `;
                        data += `wipe keys: ${t.wipeKey ? 1 : 0}; `;
                        data += `pause keys: ${t.pauseKey ? 1 : 0}; `;
                        data += `supply keys: ${t.supplyKey ? 1 : 0}; `;
                        data += `freeze keys: ${t.freezeKey ? 1 : 0}; `;
                        data += `token name size: ${this.stringSize(t.tokenName)}; `;
                        data += `token symbol size: ${this.stringSize(t.tokenSymbol)}; `;
                        data += `token memo size: ${this.stringSize(t.tokenMemo)}; `;
                        data += `memo size: ${this.stringSize(t.transactionMemo)}; `;
                    }
                    if (transactionName == 'TokenAssociateTransaction') {
                        const t = transaction as TokenAssociateTransaction;
                        data += 'payer sigs: 1; ';
                        data += 'total sigs: 1; ';
                        data += 'tokens associated: 1; ';
                        data += `memo size: ${this.stringSize(t.transactionMemo)}; `;
                    }
                    if (transactionName == 'TokenDissociateTransaction') {
                        const t = transaction as TokenDissociateTransaction;
                        data += 'payer sigs: 1; ';
                        data += 'total sigs: 1; ';
                        data += 'tokens dissociated: 1; ';
                        data += `memo size: ${this.stringSize(t.transactionMemo)}; `;
                    }
                    if (transactionName == 'TokenFreezeTransaction') {
                        const t = transaction as TokenFreezeTransaction;
                        data += 'payer sigs: 1; ';
                        data += 'total sigs: 1; ';
                        data += `memo size: ${this.stringSize(t.transactionMemo)}; `;
                    }
                    if (transactionName == 'TokenUnfreezeTransaction') {
                        const t = transaction as TokenUnfreezeTransaction;
                        data += 'payer sigs: 1; ';
                        data += 'total sigs: 1; ';
                        data += `memo size: ${this.stringSize(t.transactionMemo)}; `;
                    }
                    if (transactionName == 'TokenGrantKycTransaction') {
                        const t = transaction as TokenGrantKycTransaction;
                        data += 'payer sigs: 1; ';
                        data += 'total sigs: 1; ';
                        data += `memo size: ${this.stringSize(t.transactionMemo)}; `;
                    }
                    if (transactionName == 'TokenRevokeKycTransaction') {
                        const t = transaction as TokenRevokeKycTransaction;
                        data += 'payer sigs: 1; ';
                        data += 'total sigs: 1; ';
                        data += `memo size: ${this.stringSize(t.transactionMemo)}; `;
                    }
                    if (transactionName == 'TokenMintTransaction') {
                        const t = transaction as TokenMintTransaction;
                        data += 'Fungible Token; ';
                        data += 'payer sigs: 1; ';
                        data += 'total sigs: 1; ';
                        data += `memo size: ${this.stringSize(t.transactionMemo)}; `;
                    }
                    if (transactionName == 'TokenMintNFTTransaction') {
                        transactionName = 'TokenMintTransaction';
                        const t = transaction as TokenMintTransaction;
                        data += 'Non-Fungible Token; ';
                        data += 'payer sigs: 1; ';
                        data += 'total sigs: 1; ';
                        data += `of NFTs minted: ${t.metadata.length};`;
                        data += `bytes of metadata per NFT: ${t.metadata[0].length};`;
                        data += `memo size: ${this.stringSize(t.transactionMemo)}; `;
                    }
                    if (transactionName == 'TokenWipeTransaction') {
                        const t = transaction as TokenWipeTransaction;
                        data += 'payer sigs: 1; ';
                        data += 'total sigs: 1; ';
                        data += `memo size: ${this.stringSize(t.transactionMemo)}; `;
                    }
                    if (transactionName == 'TransferTransaction') {
                        const t = transaction as TransferTransaction;
                        data += 'Fungible Token; ';
                        data += 'payer sigs: 1; ';
                        data += 'total sigs: 1; ';
                        data += `amount: ${metadata}; `;
                        data += `memo size: ${this.stringSize(t.transactionMemo)}; `;
                    }
                    if (transactionName == 'NFTTransferTransaction') {
                        transactionName = 'TransferTransaction';
                        const t = transaction as TransferTransaction;
                        data += 'Non-Fungible Token; ';
                        data += 'payer sigs: 1; ';
                        data += 'total sigs: 1; ';
                        data += `of NFTs transferred: ${metadata.length}; `;
                        data += `memo size: ${this.stringSize(t.transactionMemo)}; `;
                    }
                    if (transactionName == 'AccountCreateTransaction') {
                        const t = transaction as AccountCreateTransaction;
                        data += 'payer sigs: 1; ';
                        data += 'total sigs: 1; ';
                        data += `memo size: ${this.stringSize(t.transactionMemo)}; `;
                    }
                    if (transactionName == 'TopicCreateTransaction') {
                        const t = transaction as TopicCreateTransaction;
                        data += 'payer sigs: 1; ';
                        data += 'total sigs: 1; ';
                        data += `admin keys: ${t.adminKey ? 1 : 0}; `;
                        data += `submit keys: ${t.submitKey ? 1 : 0}; `;
                        data += `topic memo size: ${this.stringSize(t.topicMemo)}; `;
                        data += `memo size: ${this.stringSize(t.transactionMemo)}; `;
                    }
                    if (transactionName == 'TopicMessageSubmitTransaction') {
                        const t = transaction as TopicMessageSubmitTransaction;
                        data += 'payer sigs: 1; ';
                        data += 'total sigs: 1; ';
                        data += `message size: ${this.stringSize(t.message)}; `;
                        data += `memo size: ${this.stringSize(t.transactionMemo)}; `;
                    }
                    const date = new Date();
                    console.log(`[TRANSACTION, COMPLETION]  ${date.toISOString()}  ${duration / 1000}s \t${operatorAccountId.toString()} \t${transactionName}\t ${data}`);
                } else {
                    const date = new Date();
                    console.log(`[TRANSACTION, CREATE]      ${date.toISOString()}  ____ \t____________ \t${transactionName}`);
                }
            }
        } catch (error) {
            const date = new Date();
            console.log(`[TRANSACTION ERROR]        ${date.toISOString()}  ____ \t____________ \t${transactionName} \t${error.message}`);
        }
    }
    public static transactionErrorLog(operatorAccountId: AccountId, transactionName: string, transaction: Transaction, message: string): void {
        try {
            const date = new Date();
            console.log(`[TRANSACTION ERROR]        ${date.toISOString()}  ____ \t${operatorAccountId.toString()} \t${transactionName} \t${message}`);
        } catch (error) {
            const date = new Date();
            console.log(`[TRANSACTION ERROR]        ${date.toISOString()}  ____ \t____________ \t${transactionName} \t${error.message}`);
        }
    }

}