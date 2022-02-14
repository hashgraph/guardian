const {
    Client,
    AccountBalanceQuery,
    PrivateKey,
    AccountCreateTransaction,
    Hbar,
    TokenCreateTransaction,
    AccountInfoQuery,
    TopicCreateTransaction,
    FileCreateTransaction
} = require('@hashgraph/sdk');
const { expect, assert } = require('chai');

async function wait(timeout) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            try {
                resolve(true);
            } catch (error) {
                reject(error);
            }
        }, timeout);
    });
}

describe('Stability test', function () {
    this.timeout(20 * 60 * 1000);

    const OPERATOR_ID = '0.0.1548173';
    const OPERATOR_KEY = '302e020100300506032b657004220420e749aa65835ce90cab1cfb7f0fa11038e867e74946abca993f543cf9509c8edc';
    const maxTransaction = 10;

    const client = Client.forTestnet();
    client.setOperator(OPERATOR_ID, OPERATOR_KEY);

    let newAccountId, newAccountKey;

    before(async function () {
        const newPrivateKey = PrivateKey.generate();
        const transaction = new AccountCreateTransaction()
            .setKey(newPrivateKey.publicKey)
            .setInitialBalance(new Hbar(25));
        const txResponse = await transaction.execute(client);
        const receipt = await txResponse.getReceipt(client);
        newAccountId = receipt.accountId.toString();
        newAccountKey = newPrivateKey;
    });

    it('AccountBalanceQuery', async function () {
        const logs = [];
        let success = 0, failed = 0;
        for (let i = 0; i < maxTransaction; i++) {
            try {
                const query = new AccountBalanceQuery().setAccountId(OPERATOR_ID);
                const accountBalance = await query.execute(client);
                await wait(1000);
                ++success;
                logs.push(true);
            } catch (error) {
                console.error('AccountBalanceQuery', error);
                ++failed;
                logs.push(false);
            }
        }
        console.log('AccountBalanceQuery', logs);
        assert.equal(success, maxTransaction);
        assert.equal(failed, 0);
    });

    it('AccountInfoQuery', async function () {
        const logs = [];
        let success = 0, failed = 0;
        for (let i = 0; i < maxTransaction; i++) {
            try {
                const info = await new AccountInfoQuery()
                    .setAccountId(OPERATOR_ID)
                    .execute(client);
                await wait(1000);
                ++success;
                logs.push(true);
            } catch (error) {
                console.error('AccountInfoQuery', error);
                ++failed;
                logs.push(false);
            }
        }
        console.log('AccountInfoQuery', logs);
        assert.equal(success, maxTransaction);
        assert.equal(failed, 0);
    });

    it('TopicCreateTransaction', async function () {
        const logs = [];
        let success = 0, failed = 0;
        for (let i = 0; i < maxTransaction; i++) {
            try {
                const transaction = new TopicCreateTransaction();
                const txResponse = await transaction.execute(client);
                const receipt = await txResponse.getReceipt(client);
                const topicId = receipt.topicId;
                await wait(1000);
                ++success;
                logs.push(true);
            } catch (error) {
                console.error('TopicCreateTransaction', error);
                ++failed;
                logs.push(false);
            }
        }
        console.log('TopicCreateTransaction', logs);
        assert.equal(success, maxTransaction);
        assert.equal(failed, 0);
    });

    it('FileCreateTransaction', async function () {
        const logs = [];
        let success = 0, failed = 0;
        for (let i = 0; i < maxTransaction; i++) {
            try {
                const transaction = new FileCreateTransaction()
                    .setContents("the file contents")
                    .setMaxTransactionFee(new Hbar(2))
                    .freezeWith(client);
                const txResponse = await transaction.execute(client);
                const receipt = await txResponse.getReceipt(client);
                const fileId = receipt.fileId;
                await wait(1000);
                ++success;
                logs.push(true);
            } catch (error) {
                console.error('FileCreateTransaction', error);
                ++failed;
                logs.push(false);
            }
        }
        console.log('FileCreateTransaction', logs);
        assert.equal(success, maxTransaction);
        assert.equal(failed, 0);
    });

    it('AccountCreateTransaction', async function () {
        const logs = [];
        let success = 0, failed = 0;
        for (let i = 0; i < maxTransaction; i++) {
            try {
                const newPrivateKey = PrivateKey.generate();
                const transaction = new AccountCreateTransaction()
                    .setKey(newPrivateKey.publicKey)
                    .setInitialBalance(new Hbar(2));
                const txResponse = await transaction.execute(client);
                const receipt = await txResponse.getReceipt(client);
                const newAccountId = receipt.accountId;
                await wait(1000);
                ++success;
                logs.push(true);
            } catch (error) {
                console.error('AccountCreateTransaction', error);
                ++failed;
                logs.push(false);
            }
        }
        console.log('AccountCreateTransaction', logs);
        assert.equal(success, maxTransaction);
        assert.equal(failed, 0);
    });

    it('TokenCreateTransaction', async function () {
        const logs = [];
        let success = 0, failed = 0;
        const newPrivateKey = PrivateKey.generate();
        for (let i = 0; i < maxTransaction; i++) {
            try {
                let transaction = new TokenCreateTransaction()
                    .setTokenName('Test')
                    .setTokenSymbol('T')
                    .setTreasuryAccountId(newAccountId)
                    .setDecimals(2)
                    .setInitialSupply(0)
                    .setMaxTransactionFee(new Hbar(5))
                    .setTokenMemo('Memo');
                transaction = transaction.setAdminKey(newPrivateKey);
                transaction = transaction.setKycKey(newPrivateKey);
                transaction = transaction.setFreezeKey(newPrivateKey);
                transaction = transaction.setWipeKey(newPrivateKey);
                transaction = transaction.setSupplyKey(newPrivateKey);
                transaction = transaction.freezeWith(client);
                const signTx = await (await transaction.sign(newPrivateKey)).sign(newAccountKey);
                const txResponse = await signTx.execute(client);
                const receipt = await txResponse.getReceipt(client);
                const tokenId = receipt.tokenId;
                await wait(1000);
                ++success;
                logs.push(true);
            } catch (error) {
                console.error('TokenCreateTransaction', error);
                ++failed;
                logs.push(false);
            }
        }
        console.log('TokenCreateTransaction', logs);
        assert.equal(success, maxTransaction);
        assert.equal(failed, 0);
    });
});
