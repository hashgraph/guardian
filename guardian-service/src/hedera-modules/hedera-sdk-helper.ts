import {
    AccountBalanceQuery,
    AccountCreateTransaction,
    AccountId,
    AccountInfoQuery,
    Client,
    Hbar,
    HbarUnit,
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
    TopicId,
    TopicMessageSubmitTransaction,
    Transaction,
    TransactionReceipt,
    TransactionRecord,
    TransferTransaction
} from '@hashgraph/sdk';
import { timeout } from './utils';
import axios from 'axios';
import { Environment } from './environment';
import { TransactionLogger } from './transaction-logger';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import Long from 'long';

export const MAX_FEE = 10;
export const INITIAL_BALANCE = 30;

/**
 * Contains methods to simplify work with hashgraph sdk
 */
export class HederaSDKHelper {
    /**
     * Client
     * @private
     */
    private readonly client: Client;
    /**
     * Max timeout
     */
    public static readonly MAX_TIMEOUT: number = 120000;
    /**
     * Callback
     * @private
     */
    private static fn: Function = null;

    /**
     * Dry-run
     * @private
     */
    private readonly dryRun: string = null;

    constructor(
        operatorId: string | AccountId | null,
        operatorKey: string | PrivateKey | null,
        dryRun: string = null
    ) {
        this.dryRun = dryRun || null;
        this.client = Environment.createClient();
        if (operatorId && operatorKey) {
            this.client.setOperator(operatorId, operatorKey);
        }
    }

    /**
     * Transaction starting
     * @param id
     * @param transactionName
     * @private
     */
    private async transactionStartLog(id: string, transactionName: string): Promise<void> {
        await TransactionLogger.transactionLog(id, this.client.operatorAccountId, transactionName);
    }

    /**
     * Transaction end log
     * @param id
     * @param transactionName
     * @param transaction
     * @param metadata
     * @private
     */
    private async transactionEndLog(id: string, transactionName: string, transaction?: Transaction, metadata?: any): Promise<void> {
        await TransactionLogger.transactionLog(id, this.client.operatorAccountId, transactionName, transaction, metadata);
    }

    /**
     * Transaction error log
     * @param id
     * @param transactionName
     * @param transaction
     * @param error
     * @private
     */
    private async transactionErrorLog(id: string, transactionName: string, transaction: Transaction, error: Error): Promise<void> {
        await TransactionLogger.transactionErrorLog(id, this.client.operatorAccountId, transactionName, transaction, error.message);
    }


    /**
     * Transaction starting
     * @param id
     * @param transactionName
     * @private
     */
    private async virtualTransactionLog(id: string, type: string, client: Client): Promise<void> {
        await TransactionLogger.virtualTransactionLog(id, type, client.operatorAccountId?.toString());
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
            /**
             * Id
             */
            id: AccountId | string;
            /**
             * Key
             */
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
        const receipt = await this.executeAndReceipt(client, signTx, 'TokenCreateTransaction');
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
        for (const key of info.tokenRelationships.keys()) {
            const tokenId = key.toString();
            const token = info.tokenRelationships.get(key);
            tokens[tokenId] = ({
                tokenId,
                balance: token.balance.toString(),
                frozen: token.isFrozen,
                kyc: token.isKycGranted,
                hBarBalance
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
    public async associate(tokenId: string | TokenId, id: string, key: string): Promise<boolean> {
        const client = this.client;

        const accountId = AccountId.fromString(id);
        const accountKey = PrivateKey.fromString(key);
        const transaction = new TokenAssociateTransaction()
            .setAccountId(accountId)
            .setTokenIds([tokenId])
            .freezeWith(client);
        const signTx = await transaction.sign(accountKey);
        const receipt = await this.executeAndReceipt(client, signTx, 'TokenAssociateTransaction');
        const transactionStatus = receipt.status;

        return transactionStatus === Status.Success;
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
    public async dissociate(tokenId: string | TokenId, id: string, key: string): Promise<boolean> {
        const client = this.client;

        const accountId = AccountId.fromString(id);
        const accountKey = PrivateKey.fromString(key);
        const transaction = new TokenDissociateTransaction()
            .setAccountId(accountId)
            .setTokenIds([tokenId])
            .freezeWith(client);
        const signTx = await transaction.sign(accountKey);
        const receipt = await this.executeAndReceipt(client, signTx, 'TokenDissociateTransaction');
        const transactionStatus = receipt.status;

        return transactionStatus === Status.Success;
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
    public async freeze(tokenId: string | TokenId, accountId: string, freezeKey: string): Promise<boolean> {
        const client = this.client;

        const _freezeKey = PrivateKey.fromString(freezeKey);
        const transaction = new TokenFreezeTransaction()
            .setAccountId(accountId)
            .setTokenId(tokenId)
            .freezeWith(client);
        const signTx = await transaction.sign(_freezeKey);
        const receipt = await this.executeAndReceipt(client, signTx, 'TokenFreezeTransaction');
        const transactionStatus = receipt.status;

        return transactionStatus === Status.Success;
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
    public async unfreeze(tokenId: string | TokenId, accountId: string, freezeKey: string): Promise<boolean> {
        const client = this.client;

        const _freezeKey = PrivateKey.fromString(freezeKey);
        const transaction = new TokenUnfreezeTransaction()
            .setAccountId(accountId)
            .setTokenId(tokenId)
            .freezeWith(client);
        const signTx = await transaction.sign(_freezeKey);
        const receipt = await this.executeAndReceipt(client, signTx, 'TokenUnfreezeTransaction');
        const transactionStatus = receipt.status;

        return transactionStatus === Status.Success;
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
    public async grantKyc(tokenId: string | TokenId, accountId: string, kycKey: string): Promise<boolean> {
        const client = this.client;

        const _kycKey = PrivateKey.fromString(kycKey);
        const transaction = new TokenGrantKycTransaction()
            .setAccountId(accountId)
            .setTokenId(tokenId)
            .freezeWith(client);
        const signTx = await transaction.sign(_kycKey);
        const receipt = await this.executeAndReceipt(client, signTx, 'TokenGrantKycTransaction');
        const transactionStatus = receipt.status;

        return transactionStatus === Status.Success;
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
    public async revokeKyc(tokenId: string | TokenId, accountId: string, kycKey: string): Promise<boolean> {
        const client = this.client;

        const _kycKey = PrivateKey.fromString(kycKey);
        const transaction = new TokenRevokeKycTransaction()
            .setAccountId(accountId)
            .setTokenId(tokenId)
            .freezeWith(client);
        const signTx = await transaction.sign(_kycKey);
        const receipt = await this.executeAndReceipt(client, signTx, 'TokenRevokeKycTransaction');
        const transactionStatus = receipt.status;

        return transactionStatus === Status.Success;
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
    ): Promise<boolean> {
        const client = this.client;

        const _supplyKey = PrivateKey.fromString(supplyKey.toString());
        const transaction = new TokenMintTransaction()
            .setTokenId(tokenId)
            .setAmount(amount)
            .setTransactionMemo(transactionMemo)
            .freezeWith(client);
        const signTx = await transaction.sign(_supplyKey);
        const receipt = await this.executeAndReceipt(client, signTx, 'TokenMintTransaction');
        const transactionStatus = receipt.status;

        return transactionStatus === Status.Success;
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
        const receipt = await this.executeAndReceipt(client, signTx, 'TokenMintNFTTransaction');
        const transactionStatus = receipt.status;

        if (transactionStatus === Status.Success) {
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
    ): Promise<boolean> {
        const client = this.client;

        const _wipeKey = PrivateKey.fromString(wipeKey.toString());
        const transaction = new TokenWipeTransaction()
            .setAccountId(targetId)
            .setTokenId(tokenId)
            .setAmount(amount)
            .setTransactionMemo(transactionMemo)
            .freezeWith(client);
        const signTx = await transaction.sign(_wipeKey);
        const receipt = await this.executeAndReceipt(client, signTx, 'TokenWipeTransaction');
        const transactionStatus = receipt.status;

        return transactionStatus === Status.Success;
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
    ): Promise<boolean> {
        const client = this.client;

        const _scoreKey = PrivateKey.fromString(scoreKey.toString());
        const transaction = new TransferTransaction()
            .addTokenTransfer(tokenId, scoreId, -amount)
            .addTokenTransfer(tokenId, targetId, amount)
            .setTransactionMemo(transactionMemo)
            .freezeWith(client);
        const signTx = await transaction.sign(_scoreKey);
        const receipt = await this.executeAndReceipt(client, signTx, 'TransferTransaction', amount);
        const transactionStatus = receipt.status;

        return transactionStatus === Status.Success;
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

        for (const serial of serials) {
            transaction = transaction
                .addNftTransfer(tokenId, serial, scoreId, targetId)

        }
        transaction = transaction.freezeWith(client);
        const signTx = await transaction.sign(_scoreKey);
        const receipt = await this.executeAndReceipt(client, signTx, 'NFTTransferTransaction', serials);
        const transactionStatus = receipt.status;

        return transactionStatus === Status.Success;
    }

    /**
     * Create new Account (AccountCreateTransaction)
     *
     * @param {number} initialBalance - Initial Balance
     *
     * @returns {any} - Account Id and Account Private Key
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
    public async newAccount(initialBalance: number): Promise<{
        /**
         * Account ID
         */
        id: AccountId;
        /**
         * Private key
         */
        key: PrivateKey;
    }> {
        const client = this.client;

        const newPrivateKey = PrivateKey.generate();
        const transaction = new AccountCreateTransaction()
            .setKey(newPrivateKey.publicKey)
            .setInitialBalance(new Hbar(initialBalance || INITIAL_BALANCE));
        const receipt = await this.executeAndReceipt(client, transaction, 'AccountCreateTransaction');
        const newAccountId = receipt.accountId;

        return {
            id: newAccountId,
            key: newPrivateKey
        };
    }

    /**
     * New treasury
     * @param accountId
     * @param privateKey
     */
    public newTreasury(accountId: string | AccountId, privateKey: string | PrivateKey) {
        return {
            id: typeof accountId === 'string' ? AccountId.fromString(accountId) : accountId,
            key: typeof privateKey === 'string' ? PrivateKey.fromString(privateKey) : privateKey
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
    public async newTopic(
        adminKey?: PrivateKey | string,
        submitKey?: PrivateKey | string,
        topicMemo?: string
    ): Promise<string> {
        const client = this.client;

        let transaction: any = new TopicCreateTransaction()

        if (topicMemo) {
            transaction = transaction.setTopicMemo(topicMemo);
        }

        if (submitKey) {
            const accountKey = PrivateKey.fromString(submitKey.toString());
            transaction = transaction.setSubmitKey(accountKey);
        }

        if (adminKey) {
            const accountKey = PrivateKey.fromString(adminKey.toString());
            transaction = transaction.setAdminKey(accountKey)
        }

        transaction = transaction.freezeWith(client);

        if (adminKey) {
            const accountKey = PrivateKey.fromString(adminKey.toString());
            transaction = await transaction.sign(accountKey);
        }

        const receipt = await this.executeAndReceipt(client, transaction, 'TopicCreateTransaction');
        const topicId = receipt.topicId;

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
    public async submitMessage(
        topicId: string | TopicId,
        message: string,
        privateKey?: string | PrivateKey
    ): Promise<string> {
        const client = this.client;

        let messageTransaction: Transaction = new TopicMessageSubmitTransaction({
            topicId,
            message,
        });
        if (privateKey) {
            messageTransaction = messageTransaction.freezeWith(client);
            if (typeof privateKey === 'string') {
                messageTransaction = await messageTransaction.sign(PrivateKey.fromString(privateKey));
            } else {
                messageTransaction = await messageTransaction.sign(privateKey);
            }
        }
        const rec = await this.executeAndRecord(client, messageTransaction, 'TopicMessageSubmitTransaction');
        const seconds = rec.consensusTimestamp.seconds.toString();
        const nanos = rec.consensusTimestamp.nanos.toString();

        return (seconds + '.' + ('000000000' + nanos).slice(-9));
    }

    /**
     * Returns topic message
     * @param timeStamp Message identifier
     * @returns Message
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
    public async getTopicMessage(timeStamp: string): Promise<{
        /**
         * Topic ID
         */
        topicId: string,
        /**
         * Message
         */
        message: string
    }> {
        const res = await axios.get(
            `${Environment.HEDERA_MESSAGE_API}/${timeStamp}`,
            { responseType: 'json' }
        );
        if (!res || !res.data || !res.data.message) {
            throw new Error(`Invalid message '${timeStamp}'`);
        }
        const buffer = Buffer.from(res.data.message, 'base64').toString();
        const topicId = res.data.topic_id;
        return {
            topicId,
            message: buffer
        }
    }

    /**
     * Returns topic messages
     * @param topicId Topic identifier
     * @returns Messages
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
    public async getTopicMessages(topicId: string): Promise<{
        /**
         * ID
         */
        id: string,
        /**
         * Message
         */
        message: string
    }[]> {
        const res = await axios.get(`${Environment.HEDERA_TOPIC_API}${topicId}/messages`, {
            params: { limit: Number.MAX_SAFE_INTEGER },
            responseType: 'json'
        });

        if (!res || !res.data || !res.data.messages) {
            throw new Error(`Invalid topicId '${topicId}'`);
        }

        const result = [];
        const messages = res.data.messages;
        if (messages.length === 0) {
            return result;
        }

        for (const m of messages) {
            const buffer = Buffer.from(m.message, 'base64').toString();
            const id = m.consensus_timestamp;
            result.push({
                id,
                message: buffer
            });
        }

        return result;
    }

    /**
     * Execute and receipt
     * @param client
     * @param transaction
     * @param type
     * @param metadata
     * @private
     */
    private async executeAndReceipt(
        client: Client, transaction: Transaction, type: string, metadata?: any
    ): Promise<TransactionReceipt> {
        if (this.dryRun) {
            await this.virtualTransactionLog(this.dryRun, type, client);
            return {
                status: Status.Success,
                topicId: new TokenId(Date.now()),
                tokenId: new TokenId(Date.now()),
                accountId: new AccountId(Date.now()),
                serials: [Long.fromInt(1)]
            } as any
        } else {
            const id = GenerateUUIDv4();
            try {
                await this.transactionStartLog(id, type);
                const result = await transaction.execute(client);
                const receipt = await result.getReceipt(client);
                await this.transactionEndLog(id, type, transaction, metadata);
                HederaSDKHelper.transactionResponse(client);
                return receipt;
            } catch (error) {
                await this.transactionErrorLog(id, type, transaction, error);
                throw error;
            }
        }
    }

    /**
     * Execute and record
     * @param client
     * @param transaction
     * @param type
     * @param metadata
     * @private
     */
    private async executeAndRecord(
        client: Client, transaction: Transaction, type: string, metadata?: any
    ): Promise<TransactionRecord> {
        if (this.dryRun) {
            await this.virtualTransactionLog(this.dryRun, type, client);
            return {
                consensusTimestamp: Timestamp.fromDate(Date.now())
            } as any
        } else {
            const id = GenerateUUIDv4();
            try {
                await this.transactionStartLog(id, type);
                const result = await transaction.execute(client);
                const record = await result.getRecord(client);
                await this.transactionEndLog(id, type, transaction, metadata);
                HederaSDKHelper.transactionResponse(client);
                return record;
            } catch (error) {
                await this.transactionErrorLog(id, type, transaction, error);
                throw error;
            }
        }
    }

    /**
     * Set transaction response callback
     * @param fn
     */
    public static setTransactionResponseCallback(fn: Function) {
        HederaSDKHelper.fn = fn;
    }

    /**
     * Transaction response
     * @param client
     * @private
     */
    private static transactionResponse(client: Client) {
        if (HederaSDKHelper.fn) {
            HederaSDKHelper.fn(client);
        }
    }

    /**
     * Crate client
     * @param operatorId
     * @param operatorKey
     */
    public static client(operatorId?: string | AccountId, operatorKey?: string | PrivateKey) {
        const client = Environment.createClient();
        if (operatorId && operatorKey) {
            client.setOperator(operatorId, operatorKey);
        }
        return client;
    }

    /**
     * Get balance account (AccountBalanceQuery)
     *
     * @param {string | AccountId} accountId - Account Id
     *
     * @returns {string} - balance
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
    public static async balance(client: Client, accountId: string | AccountId): Promise<number> {
        const query = new AccountBalanceQuery()
            .setAccountId(accountId);
        const accountBalance = await query.execute(client);
        if (accountBalance && accountBalance.hbars) {
            return accountBalance.hbars.to(HbarUnit.Hbar).toNumber();
        }
        return NaN;
    }

    /**
     * Check Account
     * @param accountId
     */
    public static checkAccount(accountId: string): boolean {
        if (accountId) {
            try {
                AccountId.fromString(accountId);
                return true;
            } catch (error) {
                return false;
            }
        }
        return false;
    }

    /**
     * Create Virtual Account
     */
    public static async createVirtualAccount(): Promise<{
        /**
         * Account ID
         */
        id: AccountId;
        /**
         * Private key
         */
        key: PrivateKey;
    }> {
        const newPrivateKey = PrivateKey.generate();
        const newAccountId = new AccountId(Date.now());
        return {
            id: newAccountId,
            key: newPrivateKey
        };
    }
}
