import {
    AccountBalanceQuery,
    AccountCreateTransaction,
    AccountId,
    AccountInfoQuery,
    Client,
    Hbar,
    PrivateKey,
    Status,
    Timestamp,
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
    TopicMessageSubmitTransaction,
    TransactionResponse,
    TransferTransaction
} from '@hashgraph/sdk';
import { MAX_FEE } from './max-fee';
import { timeout } from './utils';

/**
 * Contains methods to simplify work with hashgraph sdk
 */
export class HederaSDKHelper {
    public readonly client: Client;

    public static MAX_TIMEOUT: number = 120000;

    constructor(client: Client) {
        this.client = client
    }

    /**
     * Set the account that will, by default, pay for transactions and queries built with this client.
     * 
     * @param {string | AccountId} operatorId - Operator Id
     * @param {string | PrivateKey} operatorKey - Operator Private Key
     */
    public setOperator(operatorId: string | AccountId, operatorKey: string | PrivateKey): HederaSDKHelper {
        this.client.setOperator(operatorId, operatorKey);
        return this;
    }

    /**
     * Clear current Operator Account
     */
    public clearOperator(): HederaSDKHelper {
        this.client.setOperator(null, null);
        return this;
    }

    /**
     * Create new token (TokenCreateTransaction)
     * 
     * @param {string} name - Token name
     * @param {string} symbol - Token symbol
     * @param {boolean} nft - Fungible or NonFungible Token
     * @param {number} decimals - Decimals
     * @param {number} initialSupply - Initial Supply
     * @param {string} tokenMemo - Memo field
     * @param {any} treasury - treasury account
     * @param {PrivateKey} [adminKey] - set admin key 
     * @param {PrivateKey} [kycKey] - set kyc key 
     * @param {PrivateKey} [freezeKey] - set freeze key 
     * @param {PrivateKey} [wipeKey] - set wipe key 
     * @param {PrivateKey} [supplyKey] - set supply key 
     * 
     * @returns {string} - Token id
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
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
            .setMaxTransactionFee(new Hbar(MAX_FEE))
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

    /**
     * Get balance account (AccountBalanceQuery)
     * 
     * @param {string | AccountId} accountId - Account Id
     * 
     * @returns {string} - balance
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
    public async balance(accountId: string | AccountId): Promise<string> {
        const client = this.client;
        const query = new AccountBalanceQuery()
            .setAccountId(accountId);
        const accountBalance = await query.execute(client);
        return accountBalance.hbars.toString();
    }

    /**
     * Get associate tokens and balance (AccountInfoQuery)
     * 
     * @param {string | AccountId} accountId - Account Id
     * 
     * @returns {any} - associate tokens and balance
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
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

    /**
     * Associate tokens with account (TokenAssociateTransaction)
     * 
     * @param {string | TokenId} tokenId - Token Id
     * @param {string} id - Account Id
     * @param {string} key - Account Private Id
     * 
     * @returns {boolean} - Status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
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

    /**
     * Dissociate tokens with account (TokenDissociateTransaction)
     * 
     * @param {string | TokenId} tokenId - Token Id
     * @param {string} id - Account Id
     * @param {string} key - Account Private Id
     * 
     * @returns {boolean} - Status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
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

    /**
     * Freezes transfers of the specified token for the account (TokenFreezeTransaction)
     * 
     * @param {string | TokenId} tokenId - Token Id
     * @param {string} accountId - Account Id
     * @param {string} freezeKey - Token freeze key
     * 
     * @returns {boolean} - Status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
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

    /**
     * Unfreezes transfers of the specified token for the account (TokenUnfreezeTransaction)
     * 
     * @param {string | TokenId} tokenId - Token Id
     * @param {string} accountId - Account Id
     * @param {string} freezeKey - Token freeze key
     * 
     * @returns {boolean} - Status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
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

    /**
     * Grants KYC to the account for the given token (TokenGrantKycTransaction)
     * 
     * @param {string | TokenId} tokenId - Token Id
     * @param {string} accountId - Account Id
     * @param {string} kycKey - Token KYC key
     * 
     * @returns {boolean} - Status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
    public async grantKyc(tokenId: string | TokenId, accountId: string, kycKey: string) {
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

    /**
     * Revokes the KYC to the account for the given token (TokenRevokeKycTransaction)
     * 
     * @param {string | TokenId} tokenId - Token Id
     * @param {string} accountId - Account Id
     * @param {string} kycKey - Token KYC key
     * 
     * @returns {boolean} - Status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
    public async revokeKyc(tokenId: string | TokenId, accountId: string, kycKey: string) {
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


    /**
     * Minting fungible token allows you to increase the total supply of the token (TokenMintTransaction)
     * 
     * @param {string | TokenId} tokenId - Token Id
     * @param {string | PrivateKey} supplyKey - Token Supply key
     * @param {number} amount - amount
     * @param {string} [transactionMemo] - Memo field
     * 
     * @returns {boolean} - Status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
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

    /**
     * Minting a non-fungible token creates an NFT with 
     * its unique metadata for the class of NFTs defined by the token ID (TokenMintTransaction)
     * 
     * @param {string | TokenId} tokenId - Token Id
     * @param {string | PrivateKey} supplyKey - Token Supply key
     * @param {Uint8Array[]} data - token data
     * @param {string} [transactionMemo] - Memo field
     * 
     * @returns {number[]} - serials
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
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

    /**
     * Wipes the provided amount of fungible tokens from the specified account (TokenWipeTransaction)
     * 
     * @param {string | TokenId} tokenId - Token Id
     * @param {string | AccountId} targetId - Target Account Id
     * @param {string | PrivateKey} wipeKey - Token Wipe key
     * @param {number} amount - amount
     * @param {string} [transactionMemo] - Memo field
     * 
     * @returns {boolean} - Status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
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

    /**
     * Transfer tokens from some accounts to other accounts (TransferTransaction)
     * 
     * @param {string | TokenId} tokenId - Token Id
     * @param {string | AccountId} targetId - Target Account Id
     * @param {string | AccountId} scoreId - Treasury Account Id
     * @param {string | PrivateKey} scoreKey - Token Score key
     * @param {number} amount - amount
     * @param {string} [transactionMemo] - Memo field
     * 
     * @returns {boolean} - Status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
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

    /**
     * Transfer non-fungible token from some accounts to other accounts (TransferTransaction)
     * 
     * @param {string | TokenId} tokenId - Token Id
     * @param {string | AccountId} targetId - Target Account Id
     * @param {string | AccountId} scoreId - Treasury Account Id
     * @param {string | PrivateKey} scoreKey - Token Score key
     * @param {number[]} serials - serials
     * @param {string} [transactionMemo] - Memo field
     * 
     * @returns {boolean} - Status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
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

    /**
     * Create new Account (AccountCreateTransaction)
     * 
     * @param {number} initialBalance - Initial Balance
     * 
     * @returns {any} - Account Id and Account Private Key
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
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

    /**
     * Create new Topic (TopicCreateTransaction)
     * 
     * @param {PrivateKey | string} [key] - Topic Admin Key
     * 
     * @returns {string} - Topic Id
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
    public async newTopic(key: PrivateKey | string | null, topicMemo?: string): Promise<string> {
        const client = this.client;

        const topicCreateTransaction = new TopicCreateTransaction()
            .setMaxTransactionFee(new Hbar(MAX_FEE))

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

    /**
     * Submit message to the topic (TopicMessageSubmitTransaction)
     * 
     * @param topicId Topic identifier
     * @param message Message to publish
     * 
     * @returns Message timestamp
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
    public async submitMessage(topicId: string, message: string): Promise<string> {
        const client = this.client;
        const messageTransaction = await new TopicMessageSubmitTransaction({
            topicId: topicId,
            message: message,
        }).execute(client);

        const rec = await messageTransaction.getRecord(client);

        return (rec.consensusTimestamp.seconds.toString() + '.' + ('000000000' + rec.consensusTimestamp.nanos.toString()).slice(-9));
    }
}
