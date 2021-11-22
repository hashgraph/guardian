const {
    Client,
    AccountBalanceQuery,
    PrivateKey,
    AccountCreateTransaction,
    Hbar,
    TokenCreateTransaction
} = require("@hashgraph/sdk");
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

describe("Stability test", function () {
    this.timeout(10 * 60 * 1000);

    const OPERATOR_ID = "0.0.1548173";
    const OPERATOR_KEY = "302e020100300506032b657004220420e749aa65835ce90cab1cfb7f0fa11038e867e74946abca993f543cf9509c8edc";

    const client = Client.forTestnet();
    client.setOperator(OPERATOR_ID, OPERATOR_KEY);

    let newAccountId, newAccountKey;

    before(async function () {
        console.log("Create Test Account ...");
        const newPrivateKey = PrivateKey.generate();
        const transaction = new AccountCreateTransaction()
            .setKey(newPrivateKey.publicKey)
            .setInitialBalance(new Hbar(10));
        const txResponse = await transaction.execute(client);
        const receipt = await txResponse.getReceipt(client);
        newAccountId = receipt.accountId.toString();
        newAccountKey = newPrivateKey;
        console.log(newAccountId.toString(), newAccountKey.toString());
    });

    it('AccountBalanceQuery', async function () {
        let success = 0, failed = 0;
        for (let i = 0; i < 5; i++) {
            try {
                console.log("execute ", i);
                const query = new AccountBalanceQuery().setAccountId(OPERATOR_ID);
                const accountBalance = await query.execute(client);
                console.log(!!accountBalance);
                await wait(1000);
                ++success;
            } catch (error) {
                console.error(error);
                ++failed;
            }
        }
        console.log("end", 'success:', success, 'failed:', failed);

        assert.equal(failed, 0);
    });

    it('AccountCreateTransaction', async function () {
        let success = 0, failed = 0;
        for (let i = 0; i < 5; i++) {
            try {
                console.log("execute ", i);
                const newPrivateKey = PrivateKey.generate();
                const transaction = new AccountCreateTransaction()
                    .setKey(newPrivateKey.publicKey)
                    .setInitialBalance(new Hbar(2));
                const txResponse = await transaction.execute(client);
                const receipt = await txResponse.getReceipt(client);
                const newAccountId = receipt.accountId;
                console.log(newAccountId.toString());
                await wait(1000);
                ++success;
            } catch (error) {
                console.error(error);
                ++failed;
            }
        }
        console.log("end", 'success:', success, 'failed:', failed);

        assert.equal(failed, 0);
    });

    it('TokenCreateTransaction', async function () {
        let success = 0, failed = 0;

        const newPrivateKey = PrivateKey.generate();
        for (let i = 0; i < 5; i++) {
            try {
                console.log("execute ", i);
                let transaction = new TokenCreateTransaction()
                    .setTokenName("Test")
                    .setTokenSymbol("T")
                    .setTreasuryAccountId(newAccountId)
                    .setDecimals(2)
                    .setInitialSupply(0)
                    .setMaxTransactionFee(new Hbar(2))
                    .setTokenMemo("Memo");
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
                console.log(tokenId.toString());
                await wait(1000);
                ++success;
            } catch (error) {
                console.error(error);
                ++failed;
            }
        }
        console.log("end", 'success:', success, 'failed:', failed);

        assert.equal(failed, 0);
    });
});
