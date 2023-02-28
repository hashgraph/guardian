import {
    AccountBalanceQuery,
    AccountCreateTransaction,
    AccountId,
    AccountInfoQuery,
    Client,
    ContractCallQuery,
    ContractCreateTransaction,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    ContractFunctionResult,
    ContractId,
    ContractInfo,
    ContractInfoQuery,
    FileId,
    Hbar,
    HbarUnit,
    PrivateKey,
    Status,
    Timestamp,
    TokenAssociateTransaction,
    TokenCreateTransaction,
    TokenDeleteTransaction,
    TokenDissociateTransaction,
    TokenFreezeTransaction,
    TokenGrantKycTransaction,
    TokenId,
    TokenMintTransaction,
    TokenRevokeKycTransaction,
    TokenType,
    TokenUnfreezeTransaction,
    TokenUpdateTransaction,
    TokenWipeTransaction,
    TopicCreateTransaction,
    TopicId,
    TopicMessageSubmitTransaction,
    Transaction,
    TransactionReceipt,
    TransactionRecord,
    TransferTransaction
} from '@hashgraph/sdk';
import { HederaUtils, timeout } from './utils';
import axios from 'axios';
import { Environment } from './environment';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import Long from 'long';
import { TransactionLogger } from './transaction-logger';

export const MAX_FEE = Math.abs(+process.env.MAX_TRANSACTION_FEE) || 30;
export const INITIAL_BALANCE = 30;

/**
 * Transaction event logger data
 */
export interface ITransactionLoggerData {
    /**
     * Transaction log event type
     */
    type: string;

    /**
     * Transaction log event data
     */
    data: unknown;
    /**
     * Transaction metadata
     */
    metadata?: string,
    /**
     * Transaction error
     */
    error?: string,
}

/**
 * Network options
 */
export class NetworkOptions {
    /**
     * Network
     */
    public network: string = 'testnet';
    /**
     * Local node address
     */
    public localNodeAddress: string = '';
    /**
     * Local node protocol
     */
    public localNodeProtocol: string = '';

    /**
     * Hedera nodes
     */
    public nodes: any = {};

    /**
     * Hedera mirror nodes
     */
    public mirrorNodes: string[] = [];
}

/**
 * Contains methods to simplify work with hashgraph sdk
 */
export class HederaSDKHelper {
    /**
     * Send transaction log message
     * @private
     */
    private static sendTransactionLogMessage: (data: ITransactionLoggerData) => Promise<void>

    /**
     * Set transaction log function
     * @param fn
     */
    public static setTransactionLogSender(fn: (data: ITransactionLoggerData) => Promise<void>): void {
        HederaSDKHelper.sendTransactionLogMessage = fn;
    }

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
        dryRun: string = null,
        networkOptions: NetworkOptions
    ) {
        Environment.setNetwork(networkOptions.network);
        Environment.setLocalNodeAddress(networkOptions.localNodeAddress);
        Environment.setLocalNodeProtocol(networkOptions.localNodeProtocol);
        Environment.setNodes(networkOptions.nodes);
        Environment.setMirrorNodes(networkOptions.mirrorNodes);
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
        if (HederaSDKHelper.sendTransactionLogMessage) {
            await HederaSDKHelper.sendTransactionLogMessage({
                type: 'start-log',
                data: TransactionLogger.getTransactionData(id, this.client, transactionName),
            });
        }
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
        if (HederaSDKHelper.sendTransactionLogMessage) {
            await HederaSDKHelper.sendTransactionLogMessage({
                type: 'end-log',
                data: TransactionLogger.getTransactionData(id, this.client, transactionName),
                metadata: TransactionLogger.getTransactionMetadata(transactionName, transaction, metadata),
            });
        }
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
        if (HederaSDKHelper.sendTransactionLogMessage) {
            await HederaSDKHelper.sendTransactionLogMessage({
                type: 'error-log',
                data: TransactionLogger.getTransactionData(id, this.client, transactionName),
                metadata: TransactionLogger.getTransactionMetadata(transactionName, transaction),
                error: typeof error === 'string' ? error : error.message
            });
        }
    }

    /**
     * Save Virtual Transaction log
     * @param id
     * @param transactionName
     * @private
     */
    private async virtualTransactionLog(id: string, transactionName: string): Promise<void> {
        if (HederaSDKHelper.sendTransactionLogMessage) {
            await HederaSDKHelper.sendTransactionLogMessage({
                type: 'virtual-function-log',
                data: TransactionLogger.getTransactionData(id, this.client, transactionName),
            });
        }
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
     * @param {AccountId} treasuryId - treasury account
     * @param {PrivateKey} treasuryKey - treasury account
     * @param {PrivateKey} [supplyKey] - set supply key
     * @param {PrivateKey} [adminKey] - set admin key
     * @param {PrivateKey} [kycKey] - set kyc key
     * @param {PrivateKey} [freezeKey] - set freeze key
     * @param {PrivateKey} [wipeKey] - set wipe key
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
        treasuryId: AccountId,
        treasuryKey: PrivateKey,
        supplyKey: PrivateKey,
        adminKey: PrivateKey | null,
        kycKey: PrivateKey | null,
        freezeKey: PrivateKey | null,
        wipeKey: PrivateKey | null
    ): Promise<string> {
        const client = this.client;
        let transaction = new TokenCreateTransaction()
            .setTokenName(name)
            .setTokenSymbol(symbol)
            .setTreasuryAccountId(treasuryId)
            .setDecimals(decimals)
            .setInitialSupply(initialSupply)
            .setTokenMemo(tokenMemo)
            .setMaxTransactionFee(MAX_FEE);

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

        let signTx: Transaction = transaction;
        if (adminKey) {
            signTx = await signTx.sign(adminKey);
        }
        if (treasuryKey) {
            signTx = await signTx.sign(treasuryKey);
        }

        const receipt = await this.executeAndReceipt(client, signTx, 'TokenCreateTransaction');
        const tokenId = receipt.tokenId;

        return tokenId.toString();
    }

    /**
     * Update token (TokenUpdateTransaction)
     *
     * @param {TokenId} tokenId - Token Id
     * @param {PrivateKey} adminKey - Admin Key
     * @param {PrivateKey} treasuryKey - Treasury Key
     * @param {any} changes - changes
     *
     * @returns {boolean} - status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
    public async updateToken(
        tokenId: TokenId,
        adminKey: PrivateKey,
        changes: { [x: string]: any }
    ): Promise<boolean> {
        const client = this.client;
        let transaction = new TokenUpdateTransaction()
            .setTokenId(tokenId)
            .setMaxTransactionFee(MAX_FEE)

        if (changes.hasOwnProperty('tokenName')) {
            transaction = transaction.setTokenName(changes.tokenName);
        }
        if (changes.hasOwnProperty('tokenSymbol')) {
            transaction = transaction.setTokenName(changes.tokenSymbol);
        }
        if (changes.hasOwnProperty('freezeKey')) {
            transaction = transaction.setFreezeKey(changes.freezeKey);
        }
        if (changes.hasOwnProperty('kycKey')) {
            transaction = transaction.setKycKey(changes.kycKey);
        }
        if (changes.hasOwnProperty('wipeKey')) {
            transaction = transaction.setWipeKey(changes.wipeKey);
        }
        transaction = transaction.freezeWith(client);
        let signTx: Transaction = transaction;
        if (adminKey) {
            signTx = await signTx.sign(adminKey);
        }
        const receipt = await this.executeAndReceipt(client, signTx, 'TokenUpdateTransaction');
        const transactionStatus = receipt.status;
        return transactionStatus === Status.Success;
    }

    /**
     * Delete token (TokenDeleteTransaction)
     *
     * @param {TokenId} tokenId - Token Id
     * @param {PrivateKey} adminKey - Admin Key
     *
     * @returns {boolean} - status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
    public async deleteToken(
        tokenId: TokenId,
        adminKey: PrivateKey
    ): Promise<boolean> {
        const client = this.client;
        const transaction = new TokenDeleteTransaction()
            .setTokenId(tokenId)
            .setMaxTransactionFee(MAX_FEE)
            .freezeWith(client);

        let signTx: Transaction = transaction;
        if (adminKey) {
            signTx = await signTx.sign(adminKey);
        }

        const receipt = await this.executeAndReceipt(client, signTx, 'TokenDeleteTransaction');
        const transactionStatus = receipt.status;
        return transactionStatus === Status.Success;
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
        const accountKey = HederaUtils.parsPrivateKey(key);
        const transaction = new TokenAssociateTransaction()
            .setAccountId(accountId)
            .setTokenIds([tokenId])
            .setMaxTransactionFee(MAX_FEE)
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
        const accountKey = HederaUtils.parsPrivateKey(key);
        const transaction = new TokenDissociateTransaction()
            .setAccountId(accountId)
            .setTokenIds([tokenId])
            .setMaxTransactionFee(MAX_FEE)
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

        const _freezeKey = HederaUtils.parsPrivateKey(freezeKey, true, 'Freeze Key');
        const transaction = new TokenFreezeTransaction()
            .setAccountId(accountId)
            .setTokenId(tokenId)
            .setMaxTransactionFee(MAX_FEE)
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

        const _freezeKey = HederaUtils.parsPrivateKey(freezeKey, true, 'Freeze Key');
        const transaction = new TokenUnfreezeTransaction()
            .setAccountId(accountId)
            .setTokenId(tokenId)
            .setMaxTransactionFee(MAX_FEE)
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

        const _kycKey = HederaUtils.parsPrivateKey(kycKey, true, 'KYC Key');
        const transaction = new TokenGrantKycTransaction()
            .setAccountId(accountId)
            .setTokenId(tokenId)
            .setMaxTransactionFee(MAX_FEE)
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

        const _kycKey = HederaUtils.parsPrivateKey(kycKey, true, 'KYC Key');
        const transaction = new TokenRevokeKycTransaction()
            .setAccountId(accountId)
            .setTokenId(tokenId)
            .setMaxTransactionFee(MAX_FEE)
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

        const _supplyKey = HederaUtils.parsPrivateKey(supplyKey, true, 'Supply Key');
        const transaction = new TokenMintTransaction()
            .setTokenId(tokenId)
            .setAmount(amount)
            .setTransactionMemo(transactionMemo)
            .setMaxTransactionFee(MAX_FEE)
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

        const _supplyKey = HederaUtils.parsPrivateKey(supplyKey, true, 'Supply Key');
        const transaction = new TokenMintTransaction()
            .setTokenId(tokenId)
            .setMetadata(data)
            .setTransactionMemo(transactionMemo)
            .setMaxTransactionFee(MAX_FEE)
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

        const _wipeKey = HederaUtils.parsPrivateKey(wipeKey, true, 'Wipe Key');
        const transaction = new TokenWipeTransaction()
            .setAccountId(targetId)
            .setTokenId(tokenId)
            .setAmount(amount)
            .setTransactionMemo(transactionMemo)
            .setMaxTransactionFee(MAX_FEE)
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

        const _scoreKey = HederaUtils.parsPrivateKey(scoreKey);
        const transaction = new TransferTransaction()
            .addTokenTransfer(tokenId, scoreId, -amount)
            .addTokenTransfer(tokenId, targetId, amount)
            .setTransactionMemo(transactionMemo)
            .setMaxTransactionFee(MAX_FEE)
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

        const _scoreKey = HederaUtils.parsPrivateKey(scoreKey);
        let transaction = new TransferTransaction()
            .setTransactionMemo(transactionMemo)
            .setMaxTransactionFee(MAX_FEE);

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
            .setMaxTransactionFee(MAX_FEE)
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
            .setMaxTransactionFee(MAX_FEE);

        if (topicMemo) {
            transaction = transaction.setTopicMemo(topicMemo.substring(0, 100));
        }

        if (submitKey) {
            const accountKey = HederaUtils.parsPrivateKey(submitKey, true, 'Submit Key');
            transaction = transaction.setSubmitKey(accountKey);
        }

        if (adminKey) {
            const accountKey = HederaUtils.parsPrivateKey(adminKey, true, 'Admin Key');
            transaction = transaction.setAdminKey(accountKey)
        }

        transaction = transaction.freezeWith(client);

        if (adminKey) {
            const accountKey = HederaUtils.parsPrivateKey(adminKey, true, 'Admin Key');
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
        privateKey?: string | PrivateKey,
        transactionMemo?: string
    ): Promise<string> {
        const client = this.client;

        let messageTransaction: Transaction = new TopicMessageSubmitTransaction({
            topicId,
            message,
        }).setMaxTransactionFee(MAX_FEE);

        if (transactionMemo) {
            messageTransaction = messageTransaction.setTransactionMemo(transactionMemo.substring(0, 100));
        }

        if (privateKey) {
            messageTransaction = messageTransaction.freezeWith(client);
            messageTransaction = await messageTransaction.sign(HederaUtils.parsPrivateKey(privateKey));
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
        let goNext = true;
        let url = `${Environment.HEDERA_TOPIC_API}${topicId}/messages`;
        const result = [];
        const p = {
            params: { limit: Number.MAX_SAFE_INTEGER },
            responseType: 'json'
        }

        while (goNext) {
            const res = await axios.get(url, p as any);
            delete p.params

            if (!res || !res.data || !res.data.messages) {
                throw new Error(`Invalid topicId '${topicId}'`);
            }

            const messages = res.data.messages;
            if (messages.length === 0) {
                return result;
            }

            for (const m of messages) {
                const buffer = Buffer.from(m.message, 'base64').toString();
                const id = m.consensus_timestamp;
                const payer_account_id = m.payer_account_id;
                result.push({
                    id,
                    payer_account_id,
                    message: buffer
                });
            }
            if (res.data.links?.next) {
                url = `${res.request.protocol}//${res.request.host}${res.data.links?.next}`;
            } else {
                goNext = false;
            }
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
            await this.virtualTransactionLog(this.dryRun, type);
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
            await this.virtualTransactionLog(this.dryRun, type);
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
            try {
                const result = HederaSDKHelper.fn(client);
                if (typeof result.then === 'function') {
                    result.then(null, (error) => {
                        console.error(error);
                    });
                }
            } catch (e) {
                console.error(e);
            }
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
     * Create Hedera Smart Contract
     *
     * @param {string | FileId} bytecodeFileId - Code File Id
     * @param {ContractFunctionParameters} parameters - Contract Parameters
     *
     * @returns {string} - Contract Id
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
    public async createContract(
        bytecodeFileId: string | FileId,
        parameters: ContractFunctionParameters
    ): Promise<string> {
        const client = this.client;
        const contractInstantiateTx = new ContractCreateTransaction()
            .setBytecodeFileId(bytecodeFileId)
            .setGas(1000000)
            .setConstructorParameters(parameters)
            .setMaxTransactionFee(MAX_FEE);
        const contractInstantiateSubmit = await contractInstantiateTx.execute(
            client
        );
        const contractInstantiateRx =
            await contractInstantiateSubmit.getReceipt(client);
        const contractId = contractInstantiateRx.contractId;
        return `${contractId}`;
    }

    /**
     * Query Contract Hedera
     *
     * @param {string | ContractId} contractId - Contract Id
     * @param {string} functionName - Function Name
     * @param {ContractFunctionParameters} parameters - Contract Parameters
     *
     * @returns {ContractFunctionResult} - Contract Query Result
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
    public async contractQuery(
        contractId: string | ContractId,
        functionName: string,
        parameters: ContractFunctionParameters
    ): Promise<ContractFunctionResult> {
        const client = this.client;
        const contractQueryTx = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction(functionName, parameters)
        const contractQueryResult = await contractQueryTx.execute(client);
        return contractQueryResult;
    }

    /**
     * Call Contract Hedera
     *
     * @param {string | ContractId} contractId - Contract Id
     * @param {string} functionName - Function Name
     * @param {ContractFunctionParameters} parameters - Contract Parameters
     * @param {string[]} additionalKeys - Additional Keys
     *
     * @returns {boolean} - Status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
    public async contractCall(
        contractId: string | ContractId,
        functionName: string,
        parameters: ContractFunctionParameters,
        additionalKeys?: string[]
    ): Promise<boolean> {
        const client = this.client;
        let contractExecuteTx: any = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(2000000)
            .setFunction(functionName, parameters)
            .setMaxTransactionFee(MAX_FEE)
            .freezeWith(client);
        if (additionalKeys && additionalKeys.length) {
            for (const key of additionalKeys) {
                contractExecuteTx = await contractExecuteTx.sign(
                    HederaUtils.parsPrivateKey(key, true)
                );
            }
        }
        const contractExecuteSubmit = await contractExecuteTx.execute(client);
        const contractExecuteRx = await contractExecuteSubmit.getReceipt(
            client
        );
        return contractExecuteRx.status === Status.Success;
    }

    /**
     * Get Contract Info
     *
     * @param {string | ContractId} contractId - Contract Id
     *
     * @returns {any} - Contract Info
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
    public async getContractInfo(
        contractId: string | ContractId,
    ): Promise<ContractInfo> {
        const client = this.client;
        const query = new ContractInfoQuery().setContractId(contractId);
        return await query.execute(client);
    }

    /**
     * Get NFT serials
     * @param tokenId Token identifier
     * @returns Serials Info
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT)
    public async getSerialsNFT(tokenId?: string): Promise<any[]> {
        let goNext = true;
        const client = this.client;
        let url = `${Environment.HEDERA_ACCOUNT_API}${client.operatorAccountId}/nfts`;
        const result = [];
        const p = {
            params: {
                limit: Number.MAX_SAFE_INTEGER,
                tokenId,
            },
            responseType: 'json',
        };
        while (goNext) {
            const res = await axios.get(url, p as any);
            delete p.params;

            if (!res || !res.data || !res.data.nfts) {
                throw new Error(`Invalid nfts serials response`);
            }

            const nfts = res.data.nfts;
            if (nfts.length === 0) {
                return result;
            }

            result.push(...nfts);
            if (res.data.links?.next) {
                url = `${res.request.protocol}//${res.request.host}${res.data.links?.next}`;
            } else {
                goNext = false;
            }
        }

        return result;
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
