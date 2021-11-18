const {Client, AccountBalanceQuery} = require("@hashgraph/sdk");

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

describe("Hedera", function () {
    this.timeout(10 * 60 * 1000);

    it('Test ', async function () {
        const OPERATOR_ID = "0.0.1548173";
        const OPERATOR_KEY = "302e020100300506032b657004220420e749aa65835ce90cab1cfb7f0fa11038e867e74946abca993f543cf9509c8edc";
    
        const client = Client.forTestnet();
        client.setOperator(OPERATOR_ID, OPERATOR_KEY);
        
        for (let i = 0; i < 10; i++) {
            try {
                console.log("execute ", i);
                const query = new AccountBalanceQuery().setAccountId(OPERATOR_ID);
                const accountBalance = await query.execute(client);
                console.log(!!accountBalance);
                await wait(2000);
            } catch (error) {
                console.error(error)
            }
        }
        console.log("end");
    });
});