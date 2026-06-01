import { expect, assert } from 'chai';
import {
    Client,
    AccountBalanceQuery,
    PrivateKey,
    AccountCreateTransaction,
    Hbar,
    TokenCreateTransaction,
    AccountInfoQuery,
    TopicCreateTransaction,
    FileCreateTransaction
} from '@hiero-ledger/sdk';
import dotenv from 'dotenv';

dotenv.config();

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

async function run(name, maxTransaction, f, d) {
    const logs = [];
    let success = 0, failed = 0;
    console.log(`${name} start`);
    for (let i = 0; i < maxTransaction; i++) {
        try {
            const t1 = new Date();
            await f();
            await wait(d);
            ++success;
            const t2 = new Date();
            logs.push((t2 - t1) / 1000);
        } catch (error) {
            console.error(`${name} Error: `, error);
            ++failed;
            logs.push(false);
        }
    }
    console.log(`${name}: `, logs);
    console.log(`${name} end`);
    return { success, failed };
}

describe('Stability test', function () {
    this.timeout(20 * 60 * 1000);

    const OPERATOR_ID = process.env.OPERATOR_ID;
    const OPERATOR_KEY = process.env.OPERATOR_KEY;
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

    it('FileCreateTransaction', async function () {
        const { success, failed } = await run('FileCreateTransaction', maxTransaction, async function () {
            const json = '{"appnetName":"appnetName","didTopicId":"0.0.34016549","vcTopicId":"0.0.34016550","appnetDidServers":["didServerUrl"]}';
            const transaction = new FileCreateTransaction()
                .setContents(json)
                .setMaxTransactionFee(new Hbar(2))
                .freezeWith(client);
            const txResponse = await transaction.execute(client);
            const receipt = await txResponse.getReceipt(client);
            const fileId = receipt.fileId;
        }, 1000);
        assert.equal(success, maxTransaction);
        assert.equal(failed, 0);
    });

    it('AccountBalanceQuery', async function () {
        const { success, failed } = await run('AccountBalanceQuery', maxTransaction, async function () {
            const query = new AccountBalanceQuery().setAccountId(OPERATOR_ID);
            const accountBalance = await query.execute(client);
        }, 1000);
        assert.equal(success, maxTransaction);
        assert.equal(failed, 0);
    });

    it('AccountInfoQuery', async function () {
        const { success, failed } = await run('AccountInfoQuery', maxTransaction, async function () {
            const info = await new AccountInfoQuery()
                .setAccountId(OPERATOR_ID)
                .execute(client);
        }, 1000);
        assert.equal(success, maxTransaction);
        assert.equal(failed, 0);
    });

    it('TopicCreateTransaction', async function () {
        const { success, failed } = await run('TopicCreateTransaction', maxTransaction, async function () {
            const transaction = new TopicCreateTransaction();
            const txResponse = await transaction.execute(client);
            const receipt = await txResponse.getReceipt(client);
            const topicId = receipt.topicId;
        }, 1000);
        assert.equal(success, maxTransaction);
        assert.equal(failed, 0);
    });

    it('AccountCreateTransaction', async function () {
        const { success, failed } = await run('AccountCreateTransaction', maxTransaction, async function () {
            const newPrivateKey = PrivateKey.generate();
            const transaction = new AccountCreateTransaction()
                .setKey(newPrivateKey.publicKey)
                .setInitialBalance(new Hbar(2));
            const txResponse = await transaction.execute(client);
            const receipt = await txResponse.getReceipt(client);
            const newAccountId = receipt.accountId;
        }, 1000);
        assert.equal(success, maxTransaction);
        assert.equal(failed, 0);
    });

    it('TokenCreateTransaction', async function () {
        // const { success, failed } = await run('TokenCreateTransaction', maxTransaction, async function () {
        //     const newPrivateKey = PrivateKey.generate();
        //     let transaction = new TokenCreateTransaction()
        //         .setTokenName('Test')
        //         .setTokenSymbol('T')
        //         .setTreasuryAccountId(newAccountId)
        //         .setDecimals(2)
        //         .setInitialSupply(0)
        //         .setMaxTransactionFee(new Hbar(5))
        //         .setTokenMemo('Memo');
        //     transaction = transaction.setAdminKey(newPrivateKey);
        //     transaction = transaction.setKycKey(newPrivateKey);
        //     transaction = transaction.setFreezeKey(newPrivateKey);
        //     transaction = transaction.setWipeKey(newPrivateKey);
        //     transaction = transaction.setSupplyKey(newPrivateKey);
        //     transaction = transaction.freezeWith(client);
        //     const signTx = await (await transaction.sign(newPrivateKey)).sign(newAccountKey);
        //     const txResponse = await signTx.execute(client);
        //     const receipt = await txResponse.getReceipt(client);
        //     const tokenId = receipt.tokenId;
        // }, 1000);
        // assert.equal(success, maxTransaction);
        // assert.equal(failed, 0);
    });
});
