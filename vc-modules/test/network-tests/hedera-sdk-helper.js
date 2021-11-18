const {
    HederaHelper,
} = require("../../dist/index");
const { expect, assert } = require('chai');

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe("Hedera SDK Helper", function () {
    const transactionTimeout = 10 * 1000;

    let sdk, accountId, accountKey, tokenId, account2Id, account2Key;

    const initialBalance = 5;
    const OPERATOR_ID = "0.0.1548173";
    const OPERATOR_KEY = "302e020100300506032b657004220420e749aa65835ce90cab1cfb7f0fa11038e867e74946abca993f543cf9509c8edc";

    this.timeout(10 * 60 * 1000);

    before(async function () {
        const helper = HederaHelper.setOperator(OPERATOR_ID, OPERATOR_KEY);
        sdk = helper.SDK;
    });

    it('Test SDK newAccount', async function () {
        this.timeout(transactionTimeout);

        // newAccount(initialBalance: number)
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
        // balance(accountId: string | AccountId)
        const balance = await sdk.balance(accountId);
        assert.equal(balance, initialBalance + ' ℏ');
        await delay(100);
    });

    it('Test SDK newToken', async function () {
        this.timeout(transactionTimeout);

        if (!accountId) assert.fail('Account not created');
        // newToken(
        //     name: string,
        //     symbol: string,
        //     nft: boolean,
        //     decimals: number,
        //     initialSupply: number,
        //     tokenMemo: string,
        //     treasury: {
        //         id: AccountId;
        //         key: PrivateKey;
        //     },
        //     adminKey: PrivateKey,
        //     kycKey: PrivateKey,
        //     freezeKey: PrivateKey,
        //     wipeKey: PrivateKey,
        //     supplyKey: PrivateKey
        // )
        const token = await sdk.newToken(
            'Test Token',
            'T',
            false,
            2,
            0,
            'memo',
            {
                id: accountId,
                key: accountKey,
            },
            accountKey,
            accountKey,
            accountKey,
            accountKey,
            accountKey
        );
        assert.exists(token);
        tokenId = token ? token.toString() : null;
        await delay(100);
    });

    it('Test SDK accountInfo', async function () {
        this.timeout(transactionTimeout);
        if (!accountId) assert.fail('Account not created');
        if (!tokenId) assert.fail('Token not created');
        // accountInfo(accountId?: string | AccountId)
        const accountInfo = await sdk.accountInfo(accountId);
        assert.deepEqual(accountInfo[tokenId], {
            tokenId: tokenId,
            balance: '0',
            frozen: false,
            kyc: true,
            hBarBalance: initialBalance + ' ℏ'
        });
        await delay(100);
    });

    it('Test SDK associate', async function () {
        this.timeout(2 * transactionTimeout);
        if (!tokenId) assert.fail('Token not created');
        const { id, key } = await sdk.newAccount(initialBalance);
        account2Id = id;
        account2Key = key
        await delay(1000);
        if (!account2Id) assert.fail('Account not created');
        // associate(tokenId: string | TokenId, id: string, key: string)
        const status = await sdk.associate(tokenId, account2Id.toString(), account2Key.toString());
        assert.equal(status, true);
    });

    it('Test SDK freeze', async function () {
        this.timeout(2 * transactionTimeout);
        if (!account2Id) assert.fail('Account not created');

        // freeze(tokenId: string | TokenId, accountId: string, freezeKey: string)
        const status = await sdk.freeze(tokenId, account2Id.toString(), accountKey.toString());
        assert.equal(status, true);
    });

    it('Test SDK grantKyc', async function () {
        this.timeout(2 * transactionTimeout);
        if (!account2Id) assert.fail('Account not created');

        // grantKyc(tokenId: TokenId, accountId: string, kycKey: string)
        const status = await sdk.grantKyc(tokenId, account2Id.toString(), accountKey.toString());
        assert.equal(status, true);
    });

    it('Test SDK freeze|grantKyc info', async function () {
        this.timeout(transactionTimeout);
        if (!account2Id) assert.fail('Account not created');
        if (!tokenId) assert.fail('Token not created');
        // accountInfo(accountId?: string | AccountId)
        const accountInfo = await sdk.accountInfo(account2Id);
        assert.deepEqual(accountInfo[tokenId], {
            tokenId: tokenId,
            balance: '0',
            frozen: true,
            kyc: true,
            hBarBalance: initialBalance + ' ℏ'
        });
        await delay(100);
    });

    it('Test SDK unfreeze', async function () {
        this.timeout(2 * transactionTimeout);
        if (!account2Id) assert.fail('Account not created');

        // unfreeze(tokenId: string | TokenId, accountId: string, freezeKey: string)
        const status = await sdk.unfreeze(tokenId, account2Id.toString(), accountKey.toString());
        assert.equal(status, true);
    });

    it('Test SDK revokeKyc', async function () {
        this.timeout(2 * transactionTimeout);
        if (!account2Id) assert.fail('Account not created');

       // revokeKyc(tokenId: TokenId, accountId: string, kycKey: string)
        const status = await sdk.revokeKyc(tokenId, account2Id.toString(), accountKey.toString());
        assert.equal(status, true);
    });

    it('Test SDK unfreeze|revokeKyc info', async function () {
        this.timeout(transactionTimeout);
        if (!account2Id) assert.fail('Account not created');
        if (!tokenId) assert.fail('Token not created');
        // accountInfo(accountId?: string | AccountId)
        const accountInfo = await sdk.accountInfo(account2Id);
        assert.deepEqual(accountInfo[tokenId], {
            tokenId: tokenId,
            balance: '0',
            frozen: false,
            kyc: false,
            hBarBalance: initialBalance + ' ℏ'
        });
        await delay(100);
    });


















    it('Test SDK dissociate', async function () {
        this.timeout(2 * transactionTimeout);
        if (!account2Id) assert.fail('Account not created');

       // dissociate(tokenId: string | TokenId, id: string, key: string)
        const status = await sdk.dissociate(tokenId, account2Id.toString(), account2Key.toString());
        assert.equal(status, true);
    });

    it('Test SDK dissociate info', async function () {
        this.timeout(transactionTimeout);
        if (!account2Id) assert.fail('Account not created');
        if (!tokenId) assert.fail('Token not created');
        // accountInfo(accountId?: string | AccountId)
        const accountInfo = await sdk.accountInfo(account2Id);
        assert.notExists(accountInfo[tokenId]);
        await delay(100);
    });






    // it('Test SDK newToken', async function () {
    //     const accountInfo = await sdk.accountInfo(accountId);
    //     console.log(accountInfo);
    // });

    // mint(
    //     tokenId: string | TokenId,
    //     supplyKey: string | PrivateKey,
    //     amount: number,
    //     transactionMemo?: string
    // )
    // mintNFT(
    //     tokenId: string | TokenId,
    //     supplyKey: string | PrivateKey,
    //     data: Uint8Array[],
    //     transactionMemo?: string
    // ): Promise<number[]>
    // wipe(
    //     tokenId: string | TokenId,
    //     targetId: string | AccountId,
    //     wipeKey: string | PrivateKey,
    //     amount: number,
    //     transactionMemo?: string
    // )
    // transfer(
    //     tokenId: string | TokenId,
    //     targetId: string | AccountId,
    //     scoreId: string | AccountId,
    //     scoreKey: string | PrivateKey,
    //     amount: number,
    //     transactionMemo?: string
    // )
    // transferNFT(
    //     tokenId: string | TokenId,
    //     targetId: string | AccountId,
    //     scoreId: string | AccountId,
    //     scoreKey: string | PrivateKey,
    //     serials: number[],
    //     transactionMemo?: string
    // ): Promise<boolean>



    // newTopic(key: PrivateKey | string | null, topicMemo?: string): Promise<string>
});