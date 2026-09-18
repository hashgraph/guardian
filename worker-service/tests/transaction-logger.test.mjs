import assert from 'node:assert/strict';
import { TransactionLogger } from '../dist/api/helpers/transaction-logger.js';

describe('TransactionLogger.getTransactionData', () => {
    it('packages id/network/operator/transactionName/userId into a payload', () => {
        const client = { operatorAccountId: { toString: () => '0.0.42' } };
        const result = TransactionLogger.getTransactionData(
            'tx-1', client, 'testnet', 'TokenCreateTransaction', 'user-7',
        );
        assert.deepEqual(result, {
            id: 'tx-1',
            network: 'testnet',
            operatorAccountId: '0.0.42',
            transactionName: 'TokenCreateTransaction',
            payload: { userId: 'user-7' },
        });
    });

    it('handles null client (no operator account id)', () => {
        const result = TransactionLogger.getTransactionData(
            'tx-2', null, 'mainnet', 'TopicCreateTransaction', null,
        );
        assert.equal(result.operatorAccountId, undefined);
        assert.equal(result.payload.userId, null);
    });
});

describe('TransactionLogger.getTransactionMetadata', () => {
    it('returns "" for a null transaction', () => {
        assert.equal(
            TransactionLogger.getTransactionMetadata('TokenCreateTransaction', null),
            '',
        );
    });

    it('embeds the txid for any transaction', () => {
        const fakeTx = { transactionId: 'tx-9' };
        const out = TransactionLogger.getTransactionMetadata('Unknown', fakeTx);
        assert.match(out, /txid: tx-9/);
    });

    it('reports key/name/symbol sizes for TokenCreateTransaction', () => {
        const fakeTx = {
            transactionId: 'tx-10',
            adminKey: {},
            kycKey: null,
            wipeKey: {},
            pauseKey: null,
            supplyKey: {},
            freezeKey: null,
            tokenName: 'Hello',
            tokenSymbol: 'HEY',
            tokenMemo: '',
            transactionMemo: '',
        };
        const out = TransactionLogger.getTransactionMetadata('TokenCreateTransaction', fakeTx);
        assert.match(out, /admin keys: 1/);
        assert.match(out, /KYC keys: 0/);
        assert.match(out, /wipe keys: 1/);
        assert.match(out, /pause keys: 0/);
        assert.match(out, /supply keys: 1/);
        assert.match(out, /freeze keys: 0/);
        assert.match(out, /token name size: 5/); // 'Hello'.length === 5
        assert.match(out, /token symbol size: 3/);
    });
});
