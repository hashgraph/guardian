import assert from 'node:assert/strict';
import { TransactionLogger } from '../dist/api/helpers/transaction-logger.js';

const baseTx = (extra = {}) => ({ transactionId: 'tx', transactionMemo: '', ...extra });

describe('TransactionLogger.getTransactionMetadata — token lifecycle', () => {
    it('TokenAssociateTransaction reports tokens associated', () => {
        const out = TransactionLogger.getTransactionMetadata('TokenAssociateTransaction', baseTx());
        assert.match(out, /tokens associated: 1/);
        assert.match(out, /payer sigs: 1/);
        assert.match(out, /total sigs: 1/);
    });

    it('TokenDissociateTransaction reports tokens dissociated', () => {
        const out = TransactionLogger.getTransactionMetadata('TokenDissociateTransaction', baseTx());
        assert.match(out, /tokens dissociated: 1/);
    });

    it('TokenFreezeTransaction includes total sigs', () => {
        const out = TransactionLogger.getTransactionMetadata('TokenFreezeTransaction', baseTx());
        assert.match(out, /total sigs: 1/);
    });

    it('TokenUnfreezeTransaction includes total sigs', () => {
        const out = TransactionLogger.getTransactionMetadata('TokenUnfreezeTransaction', baseTx());
        assert.match(out, /total sigs: 1/);
    });

    it('TokenGrantKycTransaction includes payer sigs', () => {
        const out = TransactionLogger.getTransactionMetadata('TokenGrantKycTransaction', baseTx());
        assert.match(out, /payer sigs: 1/);
    });

    it('TokenRevokeKycTransaction includes payer sigs', () => {
        const out = TransactionLogger.getTransactionMetadata('TokenRevokeKycTransaction', baseTx());
        assert.match(out, /payer sigs: 1/);
    });

    it('TokenUpdateTransaction reports memo size only', () => {
        const out = TransactionLogger.getTransactionMetadata('TokenUpdateTransaction', baseTx());
        assert.match(out, /payer sigs: 1/);
        assert.match(out, /memo size: 0/);
    });

    it('TokenDeleteTransaction reports memo size', () => {
        const out = TransactionLogger.getTransactionMetadata('TokenDeleteTransaction', baseTx());
        assert.match(out, /memo size: 0/);
    });

    it('TokenWipeTransaction includes total sigs', () => {
        const out = TransactionLogger.getTransactionMetadata('TokenWipeTransaction', baseTx());
        assert.match(out, /total sigs: 1/);
    });
});

describe('TransactionLogger.getTransactionMetadata — mint and transfer', () => {
    it('TokenMintTransaction labels Fungible Token', () => {
        const out = TransactionLogger.getTransactionMetadata('TokenMintTransaction', baseTx());
        assert.match(out, /Fungible Token/);
    });

    it('TokenMintNFTTransaction labels Non-Fungible Token and counts NFTs', () => {
        const tx = baseTx({ metadata: [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])] });
        const out = TransactionLogger.getTransactionMetadata('TokenMintNFTTransaction', tx);
        assert.match(out, /Non-Fungible Token/);
        assert.match(out, /of NFTs minted: 2/);
        assert.match(out, /bytes of metadata per NFT: 3/);
    });

    it('TransferTransaction labels Fungible Token and includes amount metadata', () => {
        const out = TransactionLogger.getTransactionMetadata('TransferTransaction', baseTx(), 42);
        assert.match(out, /Fungible Token/);
        assert.match(out, /amount: 42/);
    });

    it('NFTTransferTransaction labels Non-Fungible Token', () => {
        const out = TransactionLogger.getTransactionMetadata('NFTTransferTransaction', baseTx(), 'abc');
        assert.match(out, /Non-Fungible Token/);
        assert.match(out, /of NFTs transferred: 3/);
    });
});

describe('TransactionLogger.getTransactionMetadata — account and topic', () => {
    it('AccountCreateTransaction includes total sigs', () => {
        const out = TransactionLogger.getTransactionMetadata('AccountCreateTransaction', baseTx());
        assert.match(out, /total sigs: 1/);
    });

    it('TopicCreateTransaction reports admin and submit keys', () => {
        const tx = baseTx({ adminKey: {}, submitKey: null, topicMemo: 'memo' });
        const out = TransactionLogger.getTransactionMetadata('TopicCreateTransaction', tx);
        assert.match(out, /admin keys: 1/);
        assert.match(out, /submit keys: 0/);
        assert.match(out, /topic memo size: 4/);
    });

    it('TopicMessageSubmitTransaction reports message size', () => {
        const tx = baseTx({ message: 'hello world' });
        const out = TransactionLogger.getTransactionMetadata('TopicMessageSubmitTransaction', tx);
        assert.match(out, /message size: 11/);
    });
});

describe('TransactionLogger.getTransactionMetadata — generic behaviour', () => {
    it('always prefixes the txid', () => {
        const out = TransactionLogger.getTransactionMetadata('Anything', baseTx({ transactionId: 'XYZ' }));
        assert.match(out, /txid: XYZ/);
    });

    it('returns just the txid prefix for an unrecognised transaction name', () => {
        const out = TransactionLogger.getTransactionMetadata('SomethingElse', baseTx({ transactionId: 'T1' }));
        assert.equal(out, 'txid: T1; ');
    });

    it('returns an empty string for undefined transaction', () => {
        assert.equal(TransactionLogger.getTransactionMetadata('TokenCreateTransaction', undefined), '');
    });

    it('counts multi-byte UTF-8 memo size in bytes not chars', () => {
        const out = TransactionLogger.getTransactionMetadata('TokenDeleteTransaction', baseTx({ transactionMemo: 'é' }));
        assert.match(out, /memo size: 2/);
    });
});
