import {
    AccountBalanceQuery,
    AccountCreateTransaction,
    AccountId,
    AccountInfoQuery,
    Client,
    Hbar,
    PrivateKey,
    Status,
    TokenAssociateTransaction,
    TokenCreateTransaction,
    TokenDissociateTransaction,
    TokenFreezeTransaction,
    TokenGrantKycTransaction,
    TokenId,
    TokenMintTransaction,
    TokenRevokeKycTransaction,
    TokenType,
    TokenUnfreezeTransaction,
    TokenWipeTransaction,
    TopicCreateTransaction,
    TransactionResponse,
    TransferTransaction
} from "@hashgraph/sdk";

export class HederaSDKHelper {
    public readonly client: Client;

    constructor(client: Client) {
        this.client = client
    }

    public setOperator(operatorId: string | AccountId, operatorKey: string | PrivateKey): HederaSDKHelper {
        this.client.setOperator(operatorId, operatorKey);
        return this;
    }

    public clearOperator(): HederaSDKHelper {
        this.client.setOperator(null, null);
        return this;
    }

    public async newToken(
        name: string,
        symbol: string,
        nft: boolean,
        decimals: number,
        initialSupply: number,
        tokenMemo: string,
        treasury: {
            id: AccountId;
            key: PrivateKey;
        },
        adminKey: PrivateKey,
        kycKey: PrivateKey,
        freezeKey: PrivateKey,
        wipeKey: PrivateKey,
        supplyKey: PrivateKey
    ): Promise<string> {
        const client = this.client;
        let transaction = new TokenCreateTransaction()
            .setTokenName(name)
            .setTokenSymbol(symbol)
            .setTreasuryAccountId(treasury.id)
            .setDecimals(decimals)
            .setInitialSupply(initialSupply)
            .setMaxTransactionFee(new Hbar(10))
            .setTokenMemo(tokenMemo);

        if (adminKey) {
            transaction = transaction.setAdminKey(adminKey);
        }
        if (kycKey) {
            transaction = transaction.setKycKey(kycKey);
        }
        if (freezeKey) {
            transaction = transaction.setFreezeKey(freezeKey);
        }
        if (wipeKey) {
            transaction = transaction.setWipeKey(wipeKey);
        }
        if (supplyKey) {
            transaction = transaction.setSupplyKey(supplyKey);
        }
        if (nft) {
            transaction = transaction.setTokenType(TokenType.NonFungibleUnique);
        }
        transaction = transaction.freezeWith(client);

        const signTx = await (await transaction.sign(adminKey)).sign(treasury.key);
        const txResponse = await signTx.execute(client);
        const receipt = await txResponse.getReceipt(client);
        const tokenId = receipt.tokenId;
        return tokenId.toString();
    }

    public async balance(accountId: string | AccountId): Promise<string> {
        const client = this.client;
        const query = new AccountBalanceQuery()
            .setAccountId(accountId);
        const accountBalance = await query.execute(client);
        return accountBalance.hbars.toString();
    }

    public async accountInfo(accountId?: string | AccountId): Promise<any> {
        const client = this.client;
        const info = await new AccountInfoQuery()
            .setAccountId(accountId)
            .execute(client);
        const hBarBalance = info.balance.toString();
        const tokens = {};
        for (let key of info.tokenRelationships.keys()) {
            const tokenId = key.toString();
            const token = info.tokenRelationships.get(key);
            tokens[tokenId] = ({
                tokenId: tokenId,
                balance: token.balance.toString(),
                frozen: token.isFrozen,
                kyc: token.isKycGranted,
                hBarBalance: hBarBalance
            });
        }
        return tokens;
    }

    public async associate(tokenId: string | TokenId, id: string, key: string) {
        const client = this.client;
        const accountId = AccountId.fromString(id);
        const accountKey = PrivateKey.fromString(key);
        const transaction = new TokenAssociateTransaction()
            .setAccountId(accountId)
            .setTokenIds([tokenId])
            .freezeWith(client);
        const signTx = await transaction.sign(accountKey);
        const txResponse = await signTx.execute(client);
        const receipt = await txResponse.getReceipt(client);
        const transactionStatus = receipt.status;
        return transactionStatus == Status.Success;
    }

    public async dissociate(tokenId: string | TokenId, id: string, key: string) {
        const client = this.client;
        const accountId = AccountId.fromString(id);
        const accountKey = PrivateKey.fromString(key);
        const transaction = new TokenDissociateTransaction()
            .setAccountId(accountId)
            .setTokenIds([tokenId])
            .freezeWith(client);
        const signTx = await transaction.sign(accountKey);
        const txResponse = await signTx.execute(client);
        const receipt = await txResponse.getReceipt(client);
        const transactionStatus = receipt.status;
        return transactionStatus == Status.Success;
    }

    public async freeze(tokenId: string | TokenId, accountId: string, freezeKey: string) {
        const client = this.client;
        const _freezeKey = PrivateKey.fromString(freezeKey);
        const transaction = new TokenFreezeTransaction()
            .setAccountId(accountId)
            .setTokenId(tokenId)
            .freezeWith(client);
        const signTx = await transaction.sign(_freezeKey);
        const txResponse = await signTx.execute(client);
        const receipt = await txResponse.getReceipt(client);
        const transactionStatus = receipt.status;
        return transactionStatus == Status.Success;
    }

    public async unfreeze(tokenId: string | TokenId, accountId: string, freezeKey: string) {
        const client = this.client;
        const _freezeKey = PrivateKey.fromString(freezeKey);
        const transaction = new TokenUnfreezeTransaction()
            .setAccountId(accountId)
            .setTokenId(tokenId)
            .freezeWith(client);
        const signTx = await transaction.sign(_freezeKey);
        const txResponse = await signTx.execute(client);
        const receipt = await txResponse.getReceipt(client);
        const transactionStatus = receipt.status;
        return transactionStatus == Status.Success;
    }

    public async grantKyc(tokenId: TokenId, accountId: string, kycKey: string) {
        const client = this.client;
        const _kycKey = PrivateKey.fromString(kycKey);
        const transaction = new TokenGrantKycTransaction()
            .setAccountId(accountId)
            .setTokenId(tokenId)
            .freezeWith(client);
        const signTx = await transaction.sign(_kycKey);
        const txResponse = await signTx.execute(client);
        const receipt = await txResponse.getReceipt(client);
        const transactionStatus = receipt.status;
        return transactionStatus == Status.Success;
    }

    public async revokeKyc(tokenId: TokenId, accountId: string, kycKey: string) {
        const client = this.client;
        const _kycKey = PrivateKey.fromString(kycKey);
        const transaction = new TokenRevokeKycTransaction()
            .setAccountId(accountId)
            .setTokenId(tokenId)
            .freezeWith(client);
        const signTx = await transaction.sign(_kycKey);
        const txResponse = await signTx.execute(client);
        const receipt = await txResponse.getReceipt(client);
        const transactionStatus = receipt.status;
        return transactionStatus == Status.Success;
    }

    public async mint(
        tokenId: string | TokenId,
        supplyKey: string | PrivateKey,
        amount: number,
        transactionMemo?: string
    ) {
        const client = this.client;
        const _supplyKey = PrivateKey.fromString(supplyKey.toString());
        const transaction = new TokenMintTransaction()
            .setTokenId(tokenId)
            .setAmount(amount)
            .setTransactionMemo(transactionMemo)
            .freezeWith(client);
        const signTx = await transaction.sign(_supplyKey);
        const txResponse = await signTx.execute(client);
        const receipt = await txResponse.getReceipt(client);
        const transactionStatus = receipt.status;
        return transactionStatus == Status.Success;
    }

    public async mintNFT(
        tokenId: string | TokenId,
        supplyKey: string | PrivateKey,
        data: Uint8Array[],
        transactionMemo?: string
    ): Promise<number[]> {
        const client = this.client;
        const _supplyKey = PrivateKey.fromString(supplyKey.toString());
        const transaction = new TokenMintTransaction()
            .setTokenId(tokenId)
            .setMetadata(data)
            .setTransactionMemo(transactionMemo)
            .freezeWith(client);
        const signTx = await transaction.sign(_supplyKey);
        const txResponse = await signTx.execute(client);
        const receipt = await txResponse.getReceipt(client);
        const transactionStatus = receipt.status;
        if (transactionStatus == Status.Success) {
            return receipt.serials.map(e => e.toNumber())
        } else {
            return null;
        }
    }

    public async wipe(
        tokenId: string | TokenId,
        targetId: string | AccountId,
        wipeKey: string | PrivateKey,
        amount: number,
        transactionMemo?: string
    ) {
        const client = this.client;
        const _wipeKey = PrivateKey.fromString(wipeKey.toString());
        const transaction = new TokenWipeTransaction()
            .setAccountId(targetId)
            .setTokenId(tokenId)
            .setAmount(amount)
            .setTransactionMemo(transactionMemo)
            .freezeWith(client);
        const signTx = await transaction.sign(_wipeKey);
        const txResponse = await signTx.execute(client);
        const receipt = await txResponse.getReceipt(client);
        const transactionStatus = receipt.status;
        return transactionStatus == Status.Success;
    }

    public async transfer(
        tokenId: string | TokenId,
        targetId: string | AccountId,
        scoreId: string | AccountId,
        scoreKey: string | PrivateKey,
        amount: number,
        transactionMemo?: string
    ) {
        const client = this.client;
        const _scoreKey = PrivateKey.fromString(scoreKey.toString());
        const transaction = new TransferTransaction()
            .addTokenTransfer(tokenId, scoreId, -amount)
            .addTokenTransfer(tokenId, targetId, amount)
            .setTransactionMemo(transactionMemo)
            .freezeWith(client);
        const signTx = await transaction.sign(_scoreKey);
        const txResponse = await signTx.execute(client);
        const receipt = await txResponse.getReceipt(client);
        const transactionStatus = receipt.status;
        return transactionStatus == Status.Success;
    }

    public async transferNFT(
        tokenId: string | TokenId,
        targetId: string | AccountId,
        scoreId: string | AccountId,
        scoreKey: string | PrivateKey,
        serials: number[],
        transactionMemo?: string
    ): Promise<boolean> {
        const client = this.client;
        const _scoreKey = PrivateKey.fromString(scoreKey.toString());
        let transaction = new TransferTransaction()
            .setTransactionMemo(transactionMemo);

        for (let index = 0; index < serials.length; index++) {
            const serial = serials[index];
            transaction = transaction
                .addNftTransfer(tokenId, serial, scoreId, targetId)

        }
        transaction = transaction.freezeWith(client);
        const signTx = await transaction.sign(_scoreKey);
        const txResponse = await signTx.execute(client);
        const receipt = await txResponse.getReceipt(client);
        const transactionStatus = receipt.status;
        return transactionStatus == Status.Success;
    }


    public async newAccount(initialBalance: number): Promise<{ id: AccountId; key: PrivateKey; }> {
        const client = this.client;
        const newPrivateKey = PrivateKey.generate();
        const transaction = new AccountCreateTransaction()
            .setKey(newPrivateKey.publicKey)
            .setInitialBalance(new Hbar(initialBalance));
        const txResponse = await transaction.execute(client);
        const receipt = await txResponse.getReceipt(client);
        const newAccountId = receipt.accountId;
        return {
            id: newAccountId,
            key: newPrivateKey
        };
    }

    public async newTopic(key: PrivateKey | string | null, topicMemo?: string): Promise<string> {
        const client = this.client;

        const topicCreateTransaction = new TopicCreateTransaction()
            .setMaxTransactionFee(new Hbar(2))

        if (topicMemo) {
            topicCreateTransaction.setTopicMemo(topicMemo);
        }

        let dtxId: TransactionResponse;
        if (key) {
            const accountKey = PrivateKey.fromString(key.toString());
            topicCreateTransaction
                .setAdminKey(accountKey)
                .freezeWith(client);
            const signTx = await topicCreateTransaction.sign(accountKey);
            dtxId = await signTx.execute(client);
        } else {
            topicCreateTransaction
                .freezeWith(client);
            dtxId = await topicCreateTransaction.execute(client);
        }

        const topicId = (await dtxId.getReceipt(client)).topicId;

        return topicId.toString();
    }
}
