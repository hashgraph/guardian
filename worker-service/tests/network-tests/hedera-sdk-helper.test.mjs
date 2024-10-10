import { assert } from 'chai';
import dotenv from 'dotenv';

import { HederaSDKHelper } from '../../dist/api/helpers/hedera-sdk-helper.js';
import { HederaUtils } from '../../dist/api/helpers/utils.js';

dotenv.config();

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Hedera SDK Helper', function () {
    const transactionTimeout = 90 * 1000;

    let sdk, accountId, accountKey, tokenId, account2Id, account2Key, token2Id, nft;

    const initialBalance = 5;
    const OPERATOR_ID = process.env.OPERATOR_ID;
    const OPERATOR_KEY = process.env.OPERATOR_KEY;
    const HEDERA_NET = process.env.HEDERA_NET || 'testnet';

    this.timeout(60 * transactionTimeout);

    before(async function () {
        sdk = new HederaSDKHelper(OPERATOR_ID, OPERATOR_KEY, null, { network: HEDERA_NET });
    });

    it('Test SDK newAccount', async function () {
        this.timeout(2 * transactionTimeout);

        const { id, key } = await sdk.newAccount(initialBalance);
        accountId = id;
        accountKey = key;
        assert.exists(id);
        assert.exists(key);
        await delay(1000);
    });

    it('Test SDK balance', async function () {
        this.timeout(transactionTimeout);

        if (!accountId) assert.fail('Account not created');
        const balance = await sdk.balance(accountId);
        assert.equal(balance, initialBalance + ' ℏ');
        await delay(1000);
    });

    it('Test SDK newToken', async function () {
        this.timeout(transactionTimeout);

        if (!accountId) assert.fail('Account not created');

        // @param {string} name - Token name
        // @param {string} symbol - Token symbol
        // @param {boolean} nft - Fungible or NonFungible Token
        // @param {number} decimals - Decimals
        // @param {number} initialSupply - Initial Supply
        // @param {string} tokenMemo - Memo field
        // @param {AccountId} treasuryId - treasury account
        // @param {PrivateKey} treasuryKey - treasury account
        // @param {PrivateKey} [supplyKey] - set supply key
        // @param {PrivateKey} [adminKey] - set admin key
        // @param {PrivateKey} [kycKey] - set kyc key
        // @param {PrivateKey} [freezeKey] - set freeze key
        // @param {PrivateKey} [wipeKey] - set wipe key
        const token = await sdk.newToken(
            'Test Token',
            'T',
            false,
            2,
            0,
            'memo',
            accountId,
            accountKey,
            accountKey,
            accountKey,
            accountKey,
            accountKey,
            accountKey,
        );
        assert.exists(token);
        tokenId = token ? token.toString() : null;
        await delay(1000);
    });

    it('Test SDK accountInfo', async function () {
        this.timeout(transactionTimeout);

        if (!accountId) assert.fail('Account not created');
        if (!tokenId) assert.fail('Token not created');
        const accountInfo = await sdk.accountInfo(accountId);
        assert.deepEqual(accountInfo[tokenId], {
            tokenId: tokenId,
            balance: '0',
            frozen: false,
            kyc: true,
            hBarBalance: initialBalance + ' ℏ'
        });
        await delay(1000);
    });

    it('Test SDK associate', async function () {
        this.timeout(4 * transactionTimeout);

        if (!tokenId) assert.fail('Token not created');
        const { id, key } = await sdk.newAccount(initialBalance);
        account2Id = id;
        account2Key = key
        await delay(1000);
        if (!account2Id) assert.fail('Account not created');
        const status = await sdk.associate(tokenId, account2Id.toString(), account2Key.toString());
        assert.equal(status, true);
        await delay(1000);
    });

    it('Test SDK freeze', async function () {
        this.timeout(transactionTimeout);

        if (!account2Id) assert.fail('Account not created');
        const status = await sdk.freeze(tokenId, account2Id.toString(), accountKey.toString());
        assert.equal(status, true);
        await delay(1000);
    });

    it('Test SDK grantKyc', async function () {
        this.timeout(transactionTimeout);

        if (!account2Id) assert.fail('Account not created');
        const status = await sdk.grantKyc(tokenId, account2Id.toString(), accountKey.toString());
        assert.equal(status, true);
        await delay(1000);
    });

    it('Test SDK freeze|grantKyc info', async function () {
        this.timeout(transactionTimeout);

        if (!account2Id) assert.fail('Account not created');
        if (!tokenId) assert.fail('Token not created');
        const accountInfo = await sdk.accountInfo(account2Id);
        assert.deepEqual(accountInfo[tokenId], {
            tokenId: tokenId,
            balance: '0',
            frozen: true,
            kyc: true,
            hBarBalance: initialBalance + ' ℏ'
        });
        await delay(1000);
    });

    it('Test SDK unfreeze', async function () {
        this.timeout(transactionTimeout);

        if (!account2Id) assert.fail('Account not created');
        const status = await sdk.unfreeze(tokenId, account2Id.toString(), accountKey.toString());
        assert.equal(status, true);
        await delay(1000);
    });

    it('Test SDK revokeKyc', async function () {
        this.timeout(transactionTimeout);

        if (!account2Id) assert.fail('Account not created');
        const status = await sdk.revokeKyc(tokenId, account2Id.toString(), accountKey.toString());
        assert.equal(status, true);
        await delay(1000);
    });

    it('Test SDK unfreeze|revokeKyc info', async function () {
        this.timeout(transactionTimeout);
        if (!account2Id) assert.fail('Account not created');
        if (!tokenId) assert.fail('Token not created');
        const accountInfo = await sdk.accountInfo(account2Id);
        assert.deepEqual(accountInfo[tokenId], {
            tokenId: tokenId,
            balance: '0',
            frozen: false,
            kyc: false,
            hBarBalance: initialBalance + ' ℏ'
        });
        await delay(1000);
    });

    it('Test SDK dissociate', async function () {
        this.timeout(transactionTimeout);

        if (!account2Id) assert.fail('Account not created');
        const status = await sdk.dissociate(tokenId, account2Id.toString(), account2Key.toString());
        assert.equal(status, true);
        await delay(1000);
    });

    it('Test SDK dissociate info', async function () {
        this.timeout(transactionTimeout);

        if (!account2Id) assert.fail('Account not created');
        if (!tokenId) assert.fail('Token not created');
        const accountInfo = await sdk.accountInfo(account2Id);
        assert.notExists(accountInfo[tokenId]);
        await delay(1000);
    });


    it('Test SDK newNFToken', async function () {
        this.timeout(transactionTimeout);

        if (!accountId) assert.fail('Account not created');
        const token = await sdk.newToken(
            'Test Token',
            'T',
            true,
            0,
            0,
            'memo',
            accountId,
            accountKey,
            accountKey,
            accountKey,
            accountKey,
            accountKey,
            accountKey,
        );
        assert.exists(token);
        token2Id = token ? token.toString() : null;
        await delay(1000);
    });

    it('Test SDK associate', async function () {
        this.timeout(4 * transactionTimeout);

        if (!accountId) assert.fail('Account not created');
        if (!account2Id) assert.fail('Account not created');
        if (!tokenId) assert.fail('Token not created');
        if (!token2Id) assert.fail('Token not created');

        let status;
        status = await sdk.associate(tokenId, account2Id.toString(), account2Key.toString());
        assert.equal(status, true);
        await delay(1000);

        status = await sdk.associate(token2Id, account2Id.toString(), account2Key.toString());
        assert.equal(status, true);
        await delay(1000);

        status = await sdk.grantKyc(tokenId, account2Id.toString(), accountKey.toString());
        assert.equal(status, true);
        await delay(1000);

        status = await sdk.grantKyc(token2Id, account2Id.toString(), accountKey.toString());
        assert.equal(status, true);
        await delay(1000);
    });

    it('Test SDK mint', async function () {
        this.timeout(transactionTimeout);

        if (!accountId) assert.fail('Account not created');
        if (!tokenId) assert.fail('Token not created');

        let status;
        status = await sdk.mint(tokenId, accountKey, 1, 'Memo');
        assert.equal(status, true);
        await delay(1000);
    });

    it('Test SDK mintNFT', async function () {
        this.timeout(transactionTimeout);

        if (!accountId) assert.fail('Account not created');
        if (!token2Id) assert.fail('Token not created');

        const data = HederaUtils.decode('1');
        nft = await sdk.mintNFT(token2Id, accountKey, data, 'Memo');
        assert.exists(nft);
        await delay(1000);
    });

    it('Test SDK transfer', async function () {
        this.timeout(transactionTimeout);

        if (!accountId) assert.fail('Account not created');
        if (!account2Id) assert.fail('Account not created');
        if (!tokenId) assert.fail('Token not created');

        let status;
        status = await sdk.transfer(
            tokenId,
            account2Id,
            accountId,
            accountKey,
            1,
            'Memo'
        );
        assert.equal(status, true);
        await delay(1000);
    });

    it('Test SDK transferNFT', async function () {
        this.timeout(transactionTimeout);

        if (!accountId) assert.fail('Account not created');
        if (!account2Id) assert.fail('Account not created');
        if (!token2Id) assert.fail('Token not created');
        if (!nft) assert.fail('Token not minted');

        let status;
        status = await sdk.transferNFT(
            token2Id,
            account2Id,
            accountId,
            accountKey,
            nft,
            'Memo'
        );
        assert.equal(status, true);
        await delay(1000);
    });

    it('Test SDK wipe', async function () {
        this.timeout(transactionTimeout);

        if (!accountId) assert.fail('Account not created');
        if (!account2Id) assert.fail('Account not created');
        if (!tokenId) assert.fail('Token not created');

        let status;
        status = await sdk.wipe(
            tokenId,
            account2Id,
            accountKey,
            1,
            'Memo'
        );
        assert.equal(status, true);
        await delay(1000);
    });


    it('Test SDK newTopic', async function () {
        this.timeout(2 * transactionTimeout);

        if (!accountId) assert.fail('Account not created');
        const id = await sdk.newTopic(accountKey, accountKey,'Memo');
        assert.exists(id);
        await delay(1000);
    });
});
