const {
    Client, 
    AccountBalanceQuery, 
    PrivateKey, 
    AccountCreateTransaction, 
    Hbar
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

    it('AccountBalanceQuery', async function () {
        let success = 0, failed = 0;
        for (let i = 0; i < 10; i++) {
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
        for (let i = 0; i < 10; i++) {
            try {
                console.log("execute ", i);
                const newPrivateKey = PrivateKey.generate();
                const transaction = new AccountCreateTransaction()
                    .setKey(newPrivateKey.publicKey)
                    .setInitialBalance(new Hbar(1));
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
});
