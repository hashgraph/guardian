import { fork } from 'child_process';
import path from 'path';
import { AccountBalanceQuery, Client, Hbar, PrivateKey, TokenCreateTransaction, TokenType } from '@hashgraph/sdk';
import { OPERATOR_ID, OPERATOR_KEY } from './constants';

const THREADS = 32;

async function Main() {
    let currentCount: number = 0;
    let previousCount: number = 0;

    const client = Client.forTestnet();
    client.setOperator(OPERATOR_ID, OPERATOR_KEY);
    const operatorKey = PrivateKey.fromString(OPERATOR_KEY);

    const query = new AccountBalanceQuery()
        .setAccountId(OPERATOR_ID);

    // Submit the query to a Hedera network
    const accountBalance = await query.execute(client);

    // Print the balance of hbars
    console.log("The hbar account balance for this account is " + accountBalance.hbars);

    const privateKey = PrivateKey.generate();
    const publicKey = privateKey.publicKey;

    // Create the transaction and freeze for manual signing
    const transaction = new TokenCreateTransaction()
        .setTokenName("Your Token Name")
        .setTokenSymbol("F")
        .setTokenType(TokenType.NonFungibleUnique)
        .setTreasuryAccountId(OPERATOR_ID)
        .setInitialSupply(0)
        .setAdminKey(privateKey)
        .setSupplyKey(privateKey)
        .setMaxTransactionFee(new Hbar(30)) // Change the default max transaction fee
        .freezeWith(client);

    // Sign the transaction with the token adminKey and the token treasury account private key
    const signTx = await (await transaction.sign(privateKey)).sign(operatorKey);

    // Sign the transaction with the client operator private key and submit to a Hedera network
    const txResponse = await signTx.execute(client);

    // Get the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);

    // Get the token ID from the receipt
    const tokenId = receipt.tokenId;

    const slowFunctionPath = path.join(__dirname, 'slow-function');

    for (let i = 0; i < THREADS; i++) {
        const child = fork(slowFunctionPath);
        child.on('message', (message: any) => {
            if (message.type === 'MINTED') {
                currentCount++;
            }
        });
        child.send({
            type: 'START',
            name: 'thread' + i,
            tokenId: tokenId.toString(),
            privateKey: privateKey.toString()
        });
    }

    setInterval(() => {
        console.log(currentCount - previousCount, 'per second');
        previousCount = currentCount;
    }, 1000)
}

Main().then(console.log);
