import {
    Client, PrivateKey, Status, TokenId,
    TokenMintTransaction
} from '@hashgraph/sdk';
import { OPERATOR_ID, OPERATOR_KEY } from './constants';

async function slowFunction(tokenId, privateKey, name): Promise<void> {
    const client = Client.forTestnet();
    client.setOperator(OPERATOR_ID, OPERATOR_KEY);

    const data = [
        new Uint8Array(Buffer.from("f44dce5b-3b4d-4ea6-aae9-2549bd30f9a2")),
        new Uint8Array(Buffer.from("f44dce5b-3b4d-4ea6-aae9-2549bd30f9a2")),
        new Uint8Array(Buffer.from("f44dce5b-3b4d-4ea6-aae9-2549bd30f9a2")),
        new Uint8Array(Buffer.from("f44dce5b-3b4d-4ea6-aae9-2549bd30f9a2")),
        new Uint8Array(Buffer.from("f44dce5b-3b4d-4ea6-aae9-2549bd30f9a2")),
        new Uint8Array(Buffer.from("f44dce5b-3b4d-4ea6-aae9-2549bd30f9a2")),
        new Uint8Array(Buffer.from("f44dce5b-3b4d-4ea6-aae9-2549bd30f9a2")),
        new Uint8Array(Buffer.from("f44dce5b-3b4d-4ea6-aae9-2549bd30f9a2")),
        new Uint8Array(Buffer.from("f44dce5b-3b4d-4ea6-aae9-2549bd30f9a2")),
        new Uint8Array(Buffer.from("f44dce5b-3b4d-4ea6-aae9-2549bd30f9a2"))
    ];

    let s = [];

    const processing = async () => {
        const transaction = new TokenMintTransaction()
            .setTokenId(tokenId)
            .setMetadata(data)
            .setTransactionMemo("transactionMemo")
            .freezeWith(client);
        const signTx = await transaction.sign(privateKey);
        const txResponse = await signTx.execute(client);
        const receipt = await txResponse.getReceipt(client);
        const transactionStatus = receipt.status;

        if (transactionStatus !== Status.Success) {
            await processing()
        } else {
            process.send({
                type: 'MINTED',
                name,
                transactionStatus
            });
        }
    }

    for (let i = 0; i < 2000; i++) {
        await processing();
    }
}

process.on('message', async (message: any) => {
    if (message.type === 'START') {
        const {tokenId, privateKey, name} = message;
        console.time('slow');
        console.log('start minting on', name);
        await slowFunction(TokenId.fromString(tokenId), PrivateKey.fromString(privateKey), name);
        console.timeEnd('slow');
        process.send({type: 'READY'});
    }
});
