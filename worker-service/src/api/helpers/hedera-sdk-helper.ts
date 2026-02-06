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
    ContractLogInfo,
    DelegateContractId,
    FileAppendTransaction,
    FileContentsQuery,
    FileCreateTransaction,
    FileId,
    Hbar,
    HbarUnit,
    PrivateKey,
    PublicKey,
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
    TransactionId,
    TransactionReceipt,
    TransactionReceiptQuery,
    TransactionRecord,
    TransactionRecordQuery,
    TransferTransaction
} from '@hiero-ledger/sdk';
import { HederaUtils, timeout } from './utils.js';
import axios, { AxiosResponse } from 'axios';
import { Environment } from './environment.js';
import { ContractParamType, FireblocksCreds, GenerateUUIDv4, HederaResponseCode, ISignOptions, SignType } from '@guardian/interfaces';
import Long from 'long';
import { TransactionLogger } from './transaction-logger.js';
import process from 'process';
import { FireblocksHelper } from './fireblocks-helper.js';

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
    public static readonly MAX_TIMEOUT: number = (process.env.MAX_HEDERA_TIMEOUT) ? parseInt(process.env.MAX_HEDERA_TIMEOUT, 10) * 1000 : 10 * 60 * 1000;
    /**
     * Rest API max limit
     */
    public static readonly REST_API_MAX_LIMIT: number = 100;
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

    /**
     * Network Name
     * @private
     */
    private readonly network: string;

    constructor(
        operatorId: string | AccountId | null,
        operatorKey: string | PrivateKey | null,
        dryRun: string = null,
        networkOptions: NetworkOptions
    ) {
        Environment.setLocalNodeAddress(networkOptions.localNodeAddress);
        Environment.setLocalNodeProtocol(networkOptions.localNodeProtocol);
        Environment.setNodes(networkOptions.nodes);
        Environment.setMirrorNodes(networkOptions.mirrorNodes);
        Environment.setNetwork(networkOptions.network);
        this.dryRun = dryRun || null;
        this.client = Environment.createClient();
        this.network = this.client?.ledgerId?.toString();
        if (operatorId && operatorKey) {
            this.client.setOperator(operatorId, operatorKey);
        }
    }

    /**
     * Set Network
     * @param networkOptions
     * @private
     */
    public static setNetwork(networkOptions: NetworkOptions) {
        Environment.setLocalNodeAddress(networkOptions.localNodeAddress);
        Environment.setLocalNodeProtocol(networkOptions.localNodeProtocol);
        Environment.setNodes(networkOptions.nodes);
        Environment.setMirrorNodes(networkOptions.mirrorNodes);
        Environment.setNetwork(networkOptions.network);
        return HederaSDKHelper;
    }

    /**
     * Transaction starting
     * @param id
     * @param transactionName
     * @param userId
     * @private
     */
    private async transactionStartLog(id: string, transactionName: string, userId: string | null): Promise<void> {
        if (HederaSDKHelper.sendTransactionLogMessage) {
            await HederaSDKHelper.sendTransactionLogMessage({
                type: 'start-log',
                data: TransactionLogger.getTransactionData(id, this.client, this.network, transactionName, userId),
            });
        }
    }

    /**
     * Transaction end log
     * @param id
     * @param transactionName
     * @param transaction
     * @param metadata
     * @param userId
     * @private
     */
    private async transactionEndLog(id: string, transactionName: string, userId: string | null, transaction?: Transaction, metadata?: any): Promise<void> {
        if (HederaSDKHelper.sendTransactionLogMessage) {
            await HederaSDKHelper.sendTransactionLogMessage({
                type: 'end-log',
                data: TransactionLogger.getTransactionData(id, this.client, this.network, transactionName, userId),
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
     * @param userId
     * @private
     */
    private async transactionErrorLog(id: string, transactionName: string, transaction: Transaction, error: Error, userId: string | null): Promise<void> {
        if (HederaSDKHelper.sendTransactionLogMessage) {
            await HederaSDKHelper.sendTransactionLogMessage({
                type: 'error-log',
                data: TransactionLogger.getTransactionData(id, this.client, this.network, transactionName, userId),
                metadata: TransactionLogger.getTransactionMetadata(transactionName, transaction),
                error: typeof error === 'string' ? error : error.message
            });
        }
    }

    /**
     * Save Virtual Transaction log
     * @param id
     * @param transactionName
     * @param userId
     * @private
     */
    private async virtualTransactionLog(id: string, transactionName: string, userId: string | null): Promise<void> {
        if (HederaSDKHelper.sendTransactionLogMessage) {
            await HederaSDKHelper.sendTransactionLogMessage({
                type: 'virtual-function-log',
                data: TransactionLogger.getTransactionData(id, this.client, this.network, transactionName, userId),
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
     * @param userId
     * @returns {string} - Token id
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Token create transaction timeout exceeded')
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
        wipeKey: PrivateKey | ContractId | DelegateContractId | null,
        userId: string | null
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

        const receipt = await this.executeAndReceipt(client, signTx, 'TokenCreateTransaction', userId);
        const tokenId = receipt.tokenId;

        return tokenId.toString();
    }

    /**
     * Update token (TokenUpdateTransaction)
     *
     * @param {TokenId} tokenId - Token Id
     * @param {PrivateKey} adminKey - Admin Key
     * @param {any} changes - changes
     *
     * @param userId
     * @returns {boolean} - status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Token update transaction timeout exceeded')
    public async updateToken(
        tokenId: TokenId,
        adminKey: PrivateKey,
        changes: { [x: string]: any },
        userId: string | null
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
        const receipt = await this.executeAndReceipt(client, signTx, 'TokenUpdateTransaction', userId);
        const transactionStatus = receipt.status;
        return transactionStatus === Status.Success;
    }

    /**
     * Delete token (TokenDeleteTransaction)
     *
     * @param {TokenId} tokenId - Token Id
     * @param {PrivateKey} adminKey - Admin Key
     *
     * @param userId
     * @returns {boolean} - status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Token delete transaction timeout exceeded')
    public async deleteToken(
        tokenId: TokenId,
        adminKey: PrivateKey,
        userId: string | null
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

        const receipt = await this.executeAndReceipt(client, signTx, 'TokenDeleteTransaction', userId);
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
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Balance query timeout exceeded')
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
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Account info query timeout exceeded')
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
     * @param userId
     * @returns {boolean} - Status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Token associate transaction timeout exceeded')
    public async associate(tokenId: string | TokenId, id: string, key: string, userId: string | null): Promise<boolean> {
        const client = this.client;

        const accountId = AccountId.fromString(id);
        const accountKey = HederaUtils.parsPrivateKey(key);
        const transaction = new TokenAssociateTransaction()
            .setAccountId(accountId)
            .setTokenIds([tokenId])
            .setMaxTransactionFee(MAX_FEE)
            .freezeWith(client);
        const signTx = await transaction.sign(accountKey);
        const receipt = await this.executeAndReceipt(client, signTx, 'TokenAssociateTransaction', userId);
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
     * @param userId
     * @returns {boolean} - Status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Token dissociate transaction timeout exceeded')
    public async dissociate(tokenId: string | TokenId, id: string, key: string, userId: string | null): Promise<boolean> {
        const client = this.client;

        const accountId = AccountId.fromString(id);
        const accountKey = HederaUtils.parsPrivateKey(key);
        const transaction = new TokenDissociateTransaction()
            .setAccountId(accountId)
            .setTokenIds([tokenId])
            .setMaxTransactionFee(MAX_FEE)
            .freezeWith(client);
        const signTx = await transaction.sign(accountKey);
        const receipt = await this.executeAndReceipt(client, signTx, 'TokenDissociateTransaction', userId);
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
     * @param userId
     * @returns {boolean} - Status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Token freeze transaction timeout exceeded')
    public async freeze(tokenId: string | TokenId, accountId: string, freezeKey: string, userId: string | null): Promise<boolean> {
        const client = this.client;

        const _freezeKey = HederaUtils.parsPrivateKey(freezeKey, true, 'Freeze Key');
        const transaction = new TokenFreezeTransaction()
            .setAccountId(accountId)
            .setTokenId(tokenId)
            .setMaxTransactionFee(MAX_FEE)
            .freezeWith(client);
        const signTx = await transaction.sign(_freezeKey);
        const receipt = await this.executeAndReceipt(client, signTx, 'TokenFreezeTransaction', userId);
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
     * @param userId
     * @returns {boolean} - Status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Token unfreeze transaction timeout exceeded')
    public async unfreeze(tokenId: string | TokenId, accountId: string, freezeKey: string, userId: string | null): Promise<boolean> {
        const client = this.client;

        const _freezeKey = HederaUtils.parsPrivateKey(freezeKey, true, 'Freeze Key');
        const transaction = new TokenUnfreezeTransaction()
            .setAccountId(accountId)
            .setTokenId(tokenId)
            .setMaxTransactionFee(MAX_FEE)
            .freezeWith(client);
        const signTx = await transaction.sign(_freezeKey);
        const receipt = await this.executeAndReceipt(client, signTx, 'TokenUnfreezeTransaction', userId);
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
     * @param userId
     * @returns {boolean} - Status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Token grant KYC transaction timeout exceeded')
    public async grantKyc(tokenId: string | TokenId, accountId: string, kycKey: string, userId: string | null): Promise<boolean> {
        const client = this.client;

        const _kycKey = HederaUtils.parsPrivateKey(kycKey, true, 'KYC Key');
        const transaction = new TokenGrantKycTransaction()
            .setAccountId(accountId)
            .setTokenId(tokenId)
            .setMaxTransactionFee(MAX_FEE)
            .freezeWith(client);
        const signTx = await transaction.sign(_kycKey);
        const receipt = await this.executeAndReceipt(client, signTx, 'TokenGrantKycTransaction', userId);
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
     * @param userId
     * @returns {boolean} - Status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Token revoke KYC transaction timeout exceeded')
    public async revokeKyc(tokenId: string | TokenId, accountId: string, kycKey: string, userId: string | null): Promise<boolean> {
        const client = this.client;

        const _kycKey = HederaUtils.parsPrivateKey(kycKey, true, 'KYC Key');
        const transaction = new TokenRevokeKycTransaction()
            .setAccountId(accountId)
            .setTokenId(tokenId)
            .setMaxTransactionFee(MAX_FEE)
            .freezeWith(client);
        const signTx = await transaction.sign(_kycKey);
        const receipt = await this.executeAndReceipt(client, signTx, 'TokenRevokeKycTransaction', userId);
        const transactionStatus = receipt.status;

        return transactionStatus === Status.Success;
    }

    /**
     * Minting fungible token allows you to increase the total supply of the token (TokenMintTransaction)
     *
     * @param {string | TokenId} tokenId - Token Id
     * @param {string | PrivateKey} supplyKey - Token Supply key
     * @param {number} amount - amount
     * @param userId
     * @param {string} [transactionMemo] - Memo field
     *
     * @returns {boolean} - Status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Token(FT) mint transaction timeout exceeded')
    public async mint(
        tokenId: string | TokenId,
        supplyKey: string | PrivateKey,
        amount: number,
        userId: string | null,
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
        const receipt = await this.executeAndReceipt(client, signTx, 'TokenMintTransaction', userId);
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
     * @param userId
     * @param {string} [transactionMemo] - Memo field
     *
     * @returns {number[]} - serials
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Token(NFT) mint transaction timeout exceeded')
    public async mintNFT(
        tokenId: string | TokenId,
        supplyKey: string | PrivateKey,
        data: Uint8Array[],
        userId: string | null,
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
        const receipt = await this.executeAndReceipt(client, signTx, 'TokenMintNFTTransaction', userId, data);
        const transactionStatus = receipt.status;

        if (transactionStatus === Status.Success) {
            return receipt.serials ? receipt.serials.map(e => e.toNumber()) : []
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
     * @param userId
     * @param {string} tokenType - token type
     * @param {number[]} [serialNumbers] - serial numbers
     * @param {string} [transactionMemo] - Memo field
     *
     * @returns {boolean} - Status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Token(FT) wipe transaction timeout exceeded')
    public async wipe(
        tokenId: string | TokenId,
        targetId: string | AccountId,
        wipeKey: string | PrivateKey,
        amount: number,
        userId: string | null,
        tokenType: string,
        serialNumbers?: number[],
        transactionMemo?: string
    ): Promise<boolean> {
        const client = this.client;

        const _wipeKey = HederaUtils.parsPrivateKey(wipeKey, true, 'Wipe Key');
        let transaction = new TokenWipeTransaction()
            .setAccountId(targetId)
            .setTokenId(tokenId)
            .setTransactionMemo(transactionMemo)
            .setMaxTransactionFee(MAX_FEE);

        if (tokenType === 'non-fungible') {
            if (serialNumbers && serialNumbers.length > 0) {
                transaction = transaction.setSerials(serialNumbers);
            } else {
                throw new Error('Serial numbers are required for non-fungible token wipe operations');
            }
        }
        else {
            transaction = transaction.setAmount(amount);
        }

        transaction = transaction.freezeWith(client);

        const signTx = await transaction.sign(_wipeKey);
        const receipt = await this.executeAndReceipt(client, signTx, 'TokenWipeTransaction', userId);
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
     * @param userId
     * @param {string} [transactionMemo] - Memo field
     *
     * @returns {boolean} - Status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Transfer transaction timeout exceeded')
    public async transfer(
        tokenId: string | TokenId,
        targetId: string | AccountId,
        scoreId: string | AccountId,
        scoreKey: string | PrivateKey,
        amount: number,
        userId: string | null,
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
        const receipt = await this.executeAndReceipt(client, signTx, 'TransferTransaction', userId, amount);
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
     * @param userId
     * @param {string} [transactionMemo] - Memo field
     *
     * @returns {boolean} - Status
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Transfer NFT transaction timeout exceeded')
    public async transferNFT(
        tokenId: string | TokenId,
        targetId: string | AccountId,
        scoreId: string | AccountId,
        scoreKey: string | PrivateKey,
        serials: number[],
        userId: string | null,
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
        const receipt = await this.executeAndReceipt(client, signTx, 'NFTTransferTransaction', userId, serials);
        const transactionStatus = receipt.status;

        return transactionStatus === Status.Success;
    }

    /**
     * Create new Account (AccountCreateTransaction)
     *
     * @param {number} initialBalance - Initial Balance
     *
     * @param userId
     * @returns {any} - Account Id and Account Private Key
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Account create transaction timeout exceeded')
    public async newAccount(initialBalance: number, userId: string | null): Promise<{
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
        if (!Number.isFinite(initialBalance) || initialBalance < 0) {
            initialBalance = INITIAL_BALANCE;
        }
        const newPrivateKey = PrivateKey.generate();
        const transaction = new AccountCreateTransaction()
            .setKey(newPrivateKey.publicKey)
            .setMaxTransactionFee(MAX_FEE)
            .setInitialBalance(new Hbar(initialBalance));
        const receipt = await this.executeAndReceipt(client, transaction, 'AccountCreateTransaction', userId);
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
     * @param userId
     * @param {PrivateKey | string} [adminKey] - Topic Admin Key
     * @param {PrivateKey | string} [submitKey] - Topic Submit Key
     * @param {string} [topicMemo] - Topic Memo
     * @returns {string} - Topic Id
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Topic create transaction timeout exceeded')
    public async newTopic(
        userId: string | null,
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

        const receipt = await this.executeAndReceipt(client, transaction, 'TopicCreateTransaction', userId);
        const topicId = receipt.topicId;

        return topicId.toString();
    }

    /**
     * Submit message to the topic (TopicMessageSubmitTransaction)
     *
     * @param topicId Topic identifier
     * @param message Message to publish
     *
     * @param userId
     * @param privateKey
     * @param transactionMemo
     * @param signOptions
     * @returns Message timestamp
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Topic message submit transaction timeout exceeded')
    public async submitMessage(
        topicId: string | TopicId,
        message: string,
        userId: string | null,
        privateKey?: string | PrivateKey,
        transactionMemo?: string,
        signOptions?: ISignOptions
    ): Promise<string> {
        const client = this.client;

        const maxChunks = (process.env.HEDERA_MAX_CHUNKS) ? parseInt(process.env.HEDERA_MAX_CHUNKS, 10) : 20;
        let messageTransaction: Transaction = new TopicMessageSubmitTransaction({
            topicId,
            message,
            maxChunks
        }).setMaxTransactionFee(MAX_FEE);

        if (transactionMemo) {
            messageTransaction = messageTransaction.setTransactionMemo(transactionMemo.substring(0, 100));
        }

        let signType = SignType.INTERNAL;
        if (signOptions?.signType) {
            signType = signOptions.signType;
        }

        if (privateKey) {
            switch (signType) {
                case SignType.FIREBLOCKS: {
                    const signData = (signOptions as any).data as FireblocksCreds;

                    const fireblocksClient = new FireblocksHelper(
                        signData.apiKey,
                        signData.privateKey,
                        signData.vaultId,
                        signData.assetId,
                    );
                    const accountIds = Object.values(this.client.network) as AccountId[];
                    messageTransaction.setNodeAccountIds([accountIds[0]]);
                    messageTransaction = messageTransaction.freezeWith(client);
                    messageTransaction = await messageTransaction.sign(HederaUtils.parsPrivateKey(privateKey));
                    const tx = await fireblocksClient.createTransaction(messageTransaction.toBytes());

                    if (!tx || !Array.isArray(tx.signedMessages)) {
                        throw new Error(`Fireblocks signing failed`);
                    }

                    const signedMessage = tx.signedMessages[0];
                    if (signedMessage) {
                        const pubKey = PublicKey.fromStringED25519(signedMessage.publicKey);
                        const signature = Buffer.from(signedMessage.signature.fullSig, 'hex');
                        try {
                            messageTransaction.addSignature(pubKey, signature as any);
                        } catch (error) {
                            throw new Error(error);
                        }
                    }
                    break;
                }

                case SignType.INTERNAL: {
                    messageTransaction = messageTransaction.freezeWith(client);
                    messageTransaction = await messageTransaction.sign(HederaUtils.parsPrivateKey(privateKey));
                    break;
                }

                default:
                    messageTransaction = messageTransaction.freezeWith(client);
                    messageTransaction = await messageTransaction.sign(HederaUtils.parsPrivateKey(privateKey));
            }
        }

        const rec = await this.executeAndRecord(client, messageTransaction, 'TopicMessageSubmitTransaction', userId);
        const seconds = rec.consensusTimestamp.seconds.toString();
        const nanos = rec.consensusTimestamp.nanos.toString();

        return (seconds + '.' + ('000000000' + nanos).slice(-9));
    }

    /**
     * Returns token info
     * @param tokenId token id
     * @returns info
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Get token info request timeout exceeded')
    public static async getTokenInfo(tokenId: string): Promise<any> {
        const res = await axios.get(
            `${Environment.HEDERA_TOKENS_API}/${tokenId}`,
            { responseType: 'json' }
        );
        if (!res || !res.data) {
            throw new Error(`Invalid token info: '${tokenId}'`);
        }
        return res.data;
    }

    /**
     * Returns topic message
     * @param timeStamp Message identifier
     * @returns Message
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Get topic message request timeout exceeded')
    public static async getTopicMessage(timeStamp: string): Promise<any> {
        const res = await axios.get(
            `${Environment.HEDERA_MESSAGE_API}/${timeStamp}`,
            { responseType: 'json' }
        );
        if (!res || !res.data || !res.data.message) {
            throw new Error(`Invalid message '${timeStamp}'`);
        }
        const buffer = Buffer.from(res.data.message, 'base64').toString();
        return {
            id: res.data.consensus_timestamp,
            payer_account_id: res.data.payer_account_id,
            sequence_number: res.data.sequence_number,
            topicId: res.data.topic_id,
            message: buffer
        }
    }

    /**
     * Returns topic messages
     * @param topicId Topic identifier
     * @param startTimestamp start timestamp
     * @returns Messages
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Get topic messages request timeout exceeded')
    public static async getTopicMessages(
        topicId: string,
        startTimestamp?: string
    ): Promise<any[]> {
        let goNext = true;
        let url = `${Environment.HEDERA_TOPIC_API}${topicId}/messages`;
        if (startTimestamp) {
            url += `?timestamp=gt:${startTimestamp}`;
        }

        const params: any = {
            params: { limit: HederaSDKHelper.REST_API_MAX_LIMIT },
            responseType: 'json'
        }

        const messageMap = new Map<string, any[]>();
        while (goNext) {
            const res = await axios.get(url, params);
            delete params.params;

            if (!res || !res.data || !res.data.messages) {
                throw new Error(`Invalid topicId '${topicId}'`);
            }

            const messages = res.data.messages;
            if (messages.length !== 0) {
                for (const m of messages) {
                    let messageId: string;
                    if (m?.chunk_info?.total !== 1) {
                        messageId = m.chunk_info?.initial_transaction_id?.transaction_valid_start || m.consensus_timestamp;
                    } else {
                        messageId = m.consensus_timestamp;
                    }
                    const items = messageMap.get(messageId) || [];
                    items.push(m);
                    messageMap.set(messageId, items);
                }
                if (res.data.links?.next) {
                    url = `${res.request.protocol}//${res.request.host}${res.data.links?.next}`;
                } else {
                    goNext = false;
                }
            } else {
                goNext = false;
            }
        }

        const result = [];
        for (const items of messageMap.values()) {
            if (items.length > 1) {
                items.sort((a, b) => a.chunk_info.number > b.chunk_info.number ? 1 : -1);
            }
            const start = items[0];
            const message = {
                id: start.consensus_timestamp,
                payer_account_id: start.payer_account_id,
                sequence_number: start.sequence_number,
                topicId: start.topic_id,
                message: ''
            }
            for (const item of items) {
                const buffer = Buffer.from(item.message, 'base64').toString();
                message.message += buffer;
            }
            result.push(message);
        }
        result.sort((a, b) => a.sequence_number > b.sequence_number ? 1 : -1);
        return result;
    }

    /**
     * Returns topic message
     * @param topicId Topic identifier
     * @param index message index
     * @returns Message
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Get topic message request (by index) timeout exceeded')
    public static async getTopicMessageByIndex(topicId: string, index: number): Promise<any> {
        const url = `${Environment.HEDERA_TOPIC_API}${topicId}/messages/${index}`;
        const res = await axios.get(url, { responseType: 'json' });
        if (!res || !res.data || !res.data.message) {
            throw new Error(`Invalid message. TopicId: '${topicId}', index: '${index}'`);
        }
        const buffer = Buffer.from(res.data.message, 'base64').toString();
        return {
            id: res.data.consensus_timestamp,
            payer_account_id: res.data.payer_account_id,
            sequence_number: res.data.sequence_number,
            topicId: res.data.topic_id,
            message: buffer
        }
    }

    /**
     * Execute and receipt
     * @param client
     * @param transaction
     * @param type
     * @param userId
     * @param metadata
     * @private
     */
    private async executeAndReceipt(
        client: Client,
        transaction: Transaction,
        type: string,
        userId: string | null,
        metadata?: any
    ): Promise<TransactionReceipt> {
        if (this.dryRun) {
            await this.virtualTransactionLog(this.dryRun, type, userId);
            let serials = [];
            if (type === 'TokenMintNFTTransaction') {
                if (metadata && metadata.length) {
                    serials = new Array(Math.min(10, metadata?.length));
                    const id = Date.now() % 1000000000;
                    for (let i = 0; i < serials.length; i++) {
                        serials[i] = Long.fromInt(id + i);
                    }
                }
            }
            if (type === 'NFTTransferTransaction') {
                serials = metadata;
            }
            return {
                status: Status.Success,
                topicId: new TokenId(Date.now()),
                tokenId: new TokenId(Date.now()),
                accountId: new AccountId(Date.now()),
                serials
            } as any
        } else {
            const id = GenerateUUIDv4();
            try {
                const account = client.operatorAccountId.toString();
                await this.transactionStartLog(id, type, userId);
                let receipt;
                try {
                    const result = await transaction.execute(client);
                    receipt = await result.getReceipt(client);
                } catch (error) {
                    const errorMessage =
                        typeof error === 'string' ? error : error?.message;
                    if (
                        !errorMessage ||
                        errorMessage.indexOf(
                            HederaResponseCode.DUPLICATE_TRANSACTION
                        ) === -1
                    ) {
                        throw error;
                    }
                    receipt = await this.receiptQuery(
                        client,
                        transaction.transactionId
                    );
                }
                await this.transactionEndLog(id, type, userId, transaction, metadata);
                HederaSDKHelper.transactionResponse(account);
                return receipt;
            } catch (error) {
                await this.transactionErrorLog(id, type, transaction, error, userId);
                throw error;
            }
        }
    }

    /**
     * Receipt query
     * @param client Client
     * @param transacationId Transaction identifier
     * @returns Transaction result
     */
    private async receiptQuery(
        client: Client,
        transactionId: string | TransactionId,
        count = 0
    ): Promise<TransactionReceipt> {
        try {
            let receiptQuery = new TransactionReceiptQuery()
                .setMaxQueryPayment(new Hbar(MAX_FEE))
                .setTransactionId(transactionId);
            const transactionCost = await receiptQuery.getCost(client);
            const newCost = transactionCost.toTinybars().multiply(2);
            receiptQuery = receiptQuery.setQueryPayment(
                Hbar.fromTinybars(newCost)
            );
            return await receiptQuery.execute(client);
        } catch (error) {
            const errorMessage =
                typeof error === 'string' ? error : error?.message;
            if (
                count < 10 &&
                errorMessage &&
                errorMessage.indexOf(HederaResponseCode.DUPLICATE_TRANSACTION) >
                -1
            ) {
                return await this.receiptQuery(client, transactionId, count++);
            }
            throw error;
        }
    }

    /**
     * Execute and record
     * @param client
     * @param transaction
     * @param type
     * @param userId
     * @param metadata
     * @private
     */
    private async executeAndRecord(
        client: Client,
        transaction: Transaction,
        type: string,
        userId: string | null,
        metadata?: any
    ): Promise<TransactionRecord> {
        if (this.dryRun) {
            await this.virtualTransactionLog(this.dryRun, type, userId);
            return {
                consensusTimestamp: Timestamp.fromDate(Date.now())
            } as any
        } else {
            const id = GenerateUUIDv4();
            try {
                const account = client.operatorAccountId.toString();
                await this.transactionStartLog(id, type, userId);
                let record;
                try {
                    const result = await transaction.execute(client);
                    record = await result.getRecord(client);
                } catch (error) {
                    const errorMessage =
                        typeof error === 'string' ? error : error?.message;
                    if (
                        !errorMessage ||
                        errorMessage.indexOf(
                            HederaResponseCode.DUPLICATE_TRANSACTION
                        ) === -1
                    ) {
                        throw error;
                    }
                    record = await this.recordQuery(
                        client,
                        transaction.transactionId
                    );
                }
                await this.transactionEndLog(id, type, userId, transaction, metadata);
                HederaSDKHelper.transactionResponse(account);
                return record;
            } catch (error) {
                await this.transactionErrorLog(id, type, transaction, error, userId);
                throw error;
            }
        }
    }

    /**
     * Record query
     * @param client Client
     * @param transacationId Transaction identifier
     * @returns Transaction result
     */
    private async recordQuery(
        client: Client,
        transactionId: string | TransactionId,
        count = 0
    ): Promise<TransactionRecord> {
        try {
            let recordQuery = new TransactionRecordQuery()
                .setMaxQueryPayment(new Hbar(MAX_FEE))
                .setTransactionId(transactionId);
            const transactionCost = await recordQuery.getCost(client);
            const newCost = transactionCost.toTinybars().multiply(2);
            recordQuery = recordQuery.setQueryPayment(
                Hbar.fromTinybars(newCost)
            );
            return await recordQuery.execute(client);
        } catch (error) {
            const errorMessage =
                typeof error === 'string' ? error : error?.message;
            if (
                count < 10 &&
                errorMessage &&
                errorMessage.indexOf(HederaResponseCode.DUPLICATE_TRANSACTION) >
                -1
            ) {
                return await this.recordQuery(client, transactionId, count++);
            }
            throw error;
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
     * @param account
     * @private
     */
    private static transactionResponse(account: string) {
        if (HederaSDKHelper.fn) {
            try {
                const result = HederaSDKHelper.fn(account);
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
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Account balance query timeout exceeded')
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
     * Ensures the contents of a Hedera file are stored as ASCII hex.
     *
     * If the current file's contents are raw binary (not ASCII hex), this method:
     *  1. Reads the binary contents.
     *  2. Converts them into a hex string.
     *  3. Creates a new Hedera file initialized with the first 4 KiB chunk.
     *  4. Appends the remaining hex data in 4 KiB chunks.
     *
     * Returns the FileId pointing to a file containing ASCII hex data suitable
     * for contract deployment. If the original file was already ASCII hex,
     * the original FileId is returned.
     *
     * @param fileId - The FileId of the existing Hedera file.
     * @returns The FileId of the ASCII‑hex‑encoded file (original or newly created).
     * @private
     */
    private async ensureHexBytecodeFile(fileId: FileId): Promise<FileId> {
        const client = this.client;

        const bytes = await new FileContentsQuery()
            .setFileId(fileId)
            .execute(client);

        const isAsciiHex = bytes.every(
            (b) =>
                (b >= 0x30 && b <= 0x39) ||
                (b >= 0x41 && b <= 0x46) ||
                (b >= 0x61 && b <= 0x66) ||
                b === 0x0a || b === 0x0d
        );

        if (isAsciiHex) {
            return fileId;
        }

        const hex = Buffer.from(bytes).toString('hex');
        const CHUNK = 4096;

        const create = await new FileCreateTransaction()
            .setKeys([client.operatorPublicKey])
            .setContents(hex.slice(0, CHUNK))
            .execute(client);

        const newFileId = (await create.getReceipt(client)).fileId;

        for (let i = CHUNK; i < hex.length; i += CHUNK) {
            await new FileAppendTransaction()
                .setFileId(newFileId)
                .setContents(hex.slice(i, i + CHUNK))
                .setMaxChunks(Number.MAX_SAFE_INTEGER)
                .execute(client);
        }

        return newFileId;
    }

    /**
     * Create Hedera Smart Contract
     *
     * @param {string | FileId} bytecodeFileId - Code File Id
     * @param {ContractFunctionParameters} parameters - Contract Parameters
     * @param {string} contractMemo - Memo
     *
     * @returns {string} - Contract Id
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Contract create transaction timeout exceeded')
    public async createContract(
        bytecodeFileId: string | FileId,
        parameters: ContractFunctionParameters,
        gas: number = 1000000,
        contractMemo?: string
    ): Promise<[string, ContractLogInfo]> {
        const client = this.client;
        const contractInstantiateTx = new ContractCreateTransaction()
            .setBytecodeFileId(bytecodeFileId)
            .setGas(gas)
            .setConstructorParameters(parameters)
            .setContractMemo(contractMemo)
            .setMaxTransactionFee(MAX_FEE);
        const contractInstantiateSubmit = await contractInstantiateTx.execute(
            client
        );
        const contractInstantiateRx =
            await contractInstantiateSubmit.getReceipt(client);
        const contractId = contractInstantiateRx.contractId;
        const contractRecord =
            await contractInstantiateSubmit.getRecord(client);

        return [`${contractId}`, contractRecord.contractFunctionResult.logs?.[0]];
    }

    /**
     * Create Hedera Smart Contract V2 22.07.2025
     *
     * @param {string | FileId} bytecodeFileId - Code File Id
     * @param {ContractFunctionParameters} parameters - Contract Parameters
     * @param {string} contractMemo - Memo
     *
     * @returns {string} - Contract Id
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Contract create transaction timeout exceeded')
    public async createContractV2(
        bytecodeFileId: string | FileId,
        parameters: ContractFunctionParameters,
        gas: number = 1000000,
        contractMemo?: string
    ): Promise<[string, ContractLogInfo]> {
        if (typeof bytecodeFileId === 'string') {
            bytecodeFileId = FileId.fromString(bytecodeFileId);
        }
        bytecodeFileId = await this.ensureHexBytecodeFile(bytecodeFileId as FileId);

        const client = this.client;
        const contractInstantiateTx = new ContractCreateTransaction()
            .setBytecodeFileId(bytecodeFileId)
            .setGas(gas)
            .setConstructorParameters(parameters)
            .setContractMemo(contractMemo)
            .setMaxTransactionFee(MAX_FEE);
        const contractInstantiateSubmit = await contractInstantiateTx.execute(
            client
        );
        const contractInstantiateRx =
            await contractInstantiateSubmit.getReceipt(client);
        const contractId = contractInstantiateRx.contractId;
        const contractRecord =
            await contractInstantiateSubmit.getRecord(client);

        return [`${contractId}`, contractRecord.contractFunctionResult.logs?.[0]];
    }

    /**
     * Parse contract parameters
     * @param params Contract parameters
     * @returns Contract parameters
     */
    private _parseContractParameters(
        params: { type: ContractParamType; value: any }[]
    ): ContractFunctionParameters {
        let contractParams = new ContractFunctionParameters();
        for (const param of params) {
            switch (param.type) {
                case ContractParamType.ADDRESS_ARRAY:
                    contractParams = contractParams.addAddressArray(param.value);
                    break;
                case ContractParamType.ADDRESS:
                    contractParams = contractParams.addAddress(param.value);
                    break;
                case ContractParamType.BOOL:
                    contractParams = contractParams.addBool(param.value);
                    break;
                case ContractParamType.UINT8:
                    contractParams = contractParams.addUint8(param.value);
                    break;
                case ContractParamType.INT64:
                    contractParams = contractParams.addInt64(param.value);
                    break;
                case ContractParamType.INT64_ARRAY:
                    contractParams = contractParams.addInt64Array(param.value);
                    break;
                default:
            }
        }
        return contractParams;
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
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Contract call query timeout exceeded')
    public async contractQuery(
        contractId: string | ContractId,
        gas: number,
        functionName: string,
        parameters: { type: ContractParamType; value: any }[] = []
    ): Promise<ContractFunctionResult> {
        const client = this.client;
        const contractQueryTx = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(gas)
            .setFunction(functionName, this._parseContractParameters(parameters))
        const contractQueryResult = await contractQueryTx.execute(client);
        return contractQueryResult;
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
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Contract call query timeout exceeded')
    public async customContractQuery(
        contractId: string | ContractId,
        gas: number,
        parameters: Uint8Array
    ): Promise<ContractFunctionResult> {
        const client = this.client;
        const contractQueryTx = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(gas)
            .setFunctionParameters(parameters)
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
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Contract execute transaction timeout exceeded')
    public async contractCall(
        contractId: string | ContractId,
        gas: number,
        functionName: string,
        parameters: { type: ContractParamType; value: any }[] = [],
    ): Promise<boolean> {
        const client = this.client;
        const contractExecuteTx = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(gas)
            .setFunction(functionName, this._parseContractParameters(parameters))
            .setMaxTransactionFee(MAX_FEE)
            .freezeWith(client);
        const contractExecuteSubmit = await contractExecuteTx.execute(client);
        const contractExecuteRx = await contractExecuteSubmit.getReceipt(
            client
        );
        return contractExecuteRx.status === Status.Success;
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
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Contract execute transaction timeout exceeded')
    public async customContractCall(
        contractId: string | ContractId,
        gas: number,
        parameters: Uint8Array,
    ): Promise<boolean> {
        const client = this.client;
        const contractExecuteTx = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(gas)
            .setFunctionParameters(parameters)
            .setMaxTransactionFee(MAX_FEE)
            .freezeWith(client);
        const contractExecuteSubmit = await contractExecuteTx.execute(client);
        const contractExecuteRx = await contractExecuteSubmit.getReceipt(
            client
        );
        return contractExecuteRx.status === Status.Success;
    }

    /**
     * Hedera REST api
     * @param url Url
     * @param options Options
     * @param type Type
     * @param filters Filters
     * @returns Result
     */
    private static async hederaRestApi(
        url: string,
        options: { params?: any },
        type: 'nfts' | 'transactions' | 'logs',
        filters?: { [key: string]: any },
        limit?: number,
    ) {
        const params: any = {
            ...options,
            responseType: 'json',
        }
        let hasNext = true;
        const result = [];
        while (hasNext) {
            const res = await axios.get(url, params);
            delete params.params;

            if (!res || !res.data || !res.data[type]) {
                throw new Error(`Invalid ${type} response`);
            }

            const typedData = res.data[type];

            if (filters) {
                for (const item of typedData) {
                    for (const filter of Object.keys(filters)) {
                        if (item[filter] === filters[filter]) {
                            result.push(item);
                            if (result.length === limit) {
                                return result;
                            }
                        }
                    }
                }
            } else {
                for (const item of typedData) {
                    result.push(item);
                    if (result.length === limit) {
                        return result;
                    }
                }
            }
            url = `${res.request.protocol}//${res.request.host}${res.data.links?.next}`;
            hasNext = !!res.data.links?.next;
        }

        return result;
    }

    /**
     * Get Contract Info
     *
     * @param {string | ContractId} contractId - Contract Id
     *
     * @returns {any} - Contract Info
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Contract info query timeout exceeded')
    public static async getContractInfo(
        contractId: string | ContractId,
    ): Promise<{ memo: string }> {
        const url = `${Environment.HEDERA_CONTRACT_API}${contractId}`;
        const res = await axios.get(url, {
            responseType: 'json',
        });

        if (!res || !res.data) {
            throw new Error(`Invalid response`);
        }

        return res.data;
    }

    /**
     * Get contract events
     * @param contractId Contract identifier
     * @param timestamp Timestamp
     * @param order Order
     * @param limit Limit
     * @returns Logs
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Get contract events request timeout exceeded')
    public static async getContractEvents(
        contractId: string,
        timestamp?: string,
        order?: string,
    ): Promise<any[]> {
        const params: any = {
            limit: HederaSDKHelper.REST_API_MAX_LIMIT,
            order: order || 'asc',
        };
        if (timestamp) {
            params.timestamp = timestamp;
        }
        const p: any = {
            params,
            responseType: 'json',
        };
        const url = `${Environment.HEDERA_CONTRACT_API}${contractId}/results/logs`;
        return await HederaSDKHelper.hederaRestApi(url, p, 'logs');
    }

    /**
     * Get NFT serials
     * @param tokenId Token identifier
     * @returns Serials Info
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Get serials request timeout exceeded')
    public async getSerialsNFT(tokenId?: string): Promise<any[]> {
        const client = this.client;
        const params = {
            limit: HederaSDKHelper.REST_API_MAX_LIMIT,
        }
        if (tokenId) {
            params['token.id'] = tokenId;
        }
        const p: any = {
            params,
            responseType: 'json',
        };
        const url = `${Environment.HEDERA_ACCOUNT_API}${client.operatorAccountId}/nfts`;
        return await HederaSDKHelper.hederaRestApi(url, p, 'nfts');
    }

    /**
     * Get NFT serials
     * @param tokenId Token identifier
     * @returns Serials Info
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Get serials request timeout exceeded')
    public static async getSerialsNFT(hederaAccountId: string, tokenId?: string): Promise<any[]> {
        const params = {
            limit: HederaSDKHelper.REST_API_MAX_LIMIT,
        }
        if (tokenId) {
            params['token.id'] = tokenId;
        }
        const p: any = {
            params,
            responseType: 'json',
        };
        const url = `${Environment.HEDERA_ACCOUNT_API}${hederaAccountId}/nfts`;
        return await HederaSDKHelper.hederaRestApi(url, p, 'nfts');
    }

    /**
     * Get NFT token serials
     * @param tokenId Token identifier
     * @param accountId Account identifier
     * @param serialnumber Serial number
     * @param order Order
     * @param filter Filter
     * @param limit Limit
     * @returns Serials
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Get token serials request timeout exceeded')
    public static async getNFTTokenSerials(
        tokenId: string,
        accountId?: string,
        serialnumber?: string,
        order = 'asc',
        filter?: any,
        limit?: number
    ): Promise<any[]> {
        const params: any = {
            limit: HederaSDKHelper.REST_API_MAX_LIMIT,
            order,
        }
        if (accountId) {
            params['account.id'] = accountId;
        }
        if (serialnumber) {
            params.serialnumber = serialnumber;
        }
        const p: any = {
            params,
            responseType: 'json',
        };
        const url = `${Environment.HEDERA_TOKENS_API}/${tokenId}/nfts`;
        return await HederaSDKHelper.hederaRestApi(url, p, 'nfts', filter, limit);
    }

    /**
     * Get transactions
     * @param accountId Account identifier
     * @param type Type
     * @param timestamp Timestamp
     * @param order Order
     * @param filter Filter
     * @param limit Limit
     * @returns Transactions
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Get transactions request timeout exceeded')
    public static async getTransactions(
        accountId?: string,
        transactiontype?: string,
        timestamp?: string,
        order = 'asc',
        filter?: any,
        limit?: number,
    ): Promise<any[]> {
        const params: any = {
            limit: HederaSDKHelper.REST_API_MAX_LIMIT,
            order,
        }
        if (accountId) {
            params['account.id'] = accountId;
        }
        if (transactiontype) {
            params.transactiontype = transactiontype;
        }
        if (timestamp) {
            params.timestamp = timestamp;
        }
        const p: any = {
            params,
            responseType: 'json',
        };
        const url = `${Environment.HEDERA_TRANSACTIONS_API}`;
        return await HederaSDKHelper.hederaRestApi(url, p, 'transactions', filter, limit);
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

    /**
     * Get Contract Info
     *
     * @param {string | ContractId} contractId - Contract Id
     *
     * @returns {any} - Contract Info
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Get contract info request timeout exceeded')
    public async getContractInfoRest(contractId: string): Promise<any> {
        const res = await axios.get(
            `${Environment.HEDERA_CONTRACT_API}${contractId}`,
            { responseType: 'json' }
        );
        if (!res || !res.data) {
            throw new Error(`Invalid contract '${contractId}'`);
        }
        return res.data;
    }

    /**
     * Destroy client
     */
    public destroy() {
        this.client.close();
    }

    /**
     * Get balance account (Rest API)
     *
     * @param {string} accountId - Account Id
     *
     * @returns {string} - balance
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Get balance request timeout exceeded')
    public static async balanceRest(accountId: string): Promise<string> {
        const res = await axios.get(
            `${Environment.HEDERA_BALANCES_API}?account.id=${accountId}`,
            { responseType: 'json' }
        );
        if (!res || !res.data || !res.data.balances || !res.data.balances.length) {
            throw new Error(`Invalid balance '${accountId}'`);
        }
        const balances = res.data.balances[0];
        const hbars = new Hbar(balances.balance, HbarUnit.Tinybar);
        return hbars.toString();
    }

    private static async loadData(
        url: string,
        next: string,
        result: any[],
        error: string
    ) {
        const res = await axios.get(`${url}${next}`, { responseType: 'json' });
        if (!res || !res.data) {
            throw new Error(error);
        }
        result.push(res.data);
        if (res.data?.links?.next) {
            const _next = res.data.links.next.split('?')[1];
            if (_next) {
                await HederaSDKHelper.loadData(url, `?${_next}`, result, error);
            }
        }
        return result;
    }

    /**
     * Get balance account (Rest API)
     *
     * @param {string} accountId - Account Id
     *
     * @returns {any} - balances
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Get balance request timeout exceeded')
    public static async accountTokensInfo(accountId: string): Promise<any> {
        try {
            AccountId.fromString(accountId);
        } catch (error) {
            throw new Error(`Invalid account '${accountId}'`);
        }

        const error = `Invalid account '${accountId}'`;
        const responses = await HederaSDKHelper.loadData(`${Environment.HEDERA_ACCOUNT_API}${accountId}/tokens`, '', [], error);
        const result: { [tokenId: string]: any } = {};
        for (const response of responses) {
            const tokens: any[] = response.tokens;
            for (const token of tokens) {
                result[token.token_id] = {
                    tokenId: token.token_id,
                    balance: token.balance?.toString(),
                    frozen: token.freeze_status === 'FROZEN',
                    kyc: token.kyc_status === 'GRANTED',
                }
            }
        }
        return result;
    }

    /**
     * Get account (Rest API)
     *
     * @param {string} accountId - Account Id
     *
     * @returns {string} - balance
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Get balance request timeout exceeded')
    public static async accountInfo(accountId: string): Promise<any> {
        try {
            AccountId.fromString(accountId);
        } catch (error) {
            throw new Error(`Invalid account '${accountId}'`);
        }

        const res = await axios.get(
            `${Environment.HEDERA_ACCOUNT_API}${accountId}`,
            { responseType: 'json' }
        );
        if (!res || !res.data) {
            throw new Error(`Invalid account '${accountId}'`);
        }
        return {
            account: res.data.account,
            balance: res.data.balance?.balance,
            key: res.data.key,

        };
    }

    /**
     * Returns topic messages
     * @param topicId Topic identifier
     * @param startTimestamp start timestamp
     * @param next next chunk
     * @returns Messages
     */
    @timeout(HederaSDKHelper.MAX_TIMEOUT, 'Get messages request timeout exceeded')
    public static async getTopicMessageChunks(
        topicId: string,
        startTimestamp?: string,
        next?: string
    ): Promise<any> {
        let url: string;
        let requestParams: any;
        if (next) {
            url = next;
            requestParams = {
                responseType: 'json'
            }
        } else {
            url = `${Environment.HEDERA_TOPIC_API}${topicId}/messages`;
            if (startTimestamp) {
                requestParams = {
                    params: {
                        limit: HederaSDKHelper.REST_API_MAX_LIMIT,
                        timestamp: `gt:${startTimestamp}`
                    },
                    responseType: 'json'
                }
            } else {
                requestParams = {
                    params: {
                        limit: HederaSDKHelper.REST_API_MAX_LIMIT
                    },
                    responseType: 'json'
                }
            }
        }
        let response: AxiosResponse<any, any>;
        try {
            response = await axios.get(url, requestParams);
        } catch (error) {
            const messages = error?.response?.data?._status?.messages;
            if (messages && messages[0] && messages[0].message) {
                throw new Error(messages[0].message)
            }
            throw new Error(error.message);
        }
        if (!response || !response.data || !response.data.messages) {
            throw new Error(`Invalid topicId '${topicId}'`);
        }
        const items = response.data.messages;
        const result = {
            messages: [],
            next: null,
            lastTimestamp: startTimestamp
        }
        for (const item of items) {
            const buffer = Buffer.from(item.message, 'base64').toString();
            const message: any = {
                id: item.consensus_timestamp,
                payer_account_id: item.payer_account_id,
                sequence_number: item.sequence_number,
                topicId: item.topic_id,
                message: buffer
            }
            if (item.chunk_info) {
                message.chunk_number = item.chunk_info.number;
                message.chunk_total = item.chunk_info.total;
                if (item.chunk_info.initial_transaction_id) {
                    message.chunk_id = item.chunk_info.initial_transaction_id.transaction_valid_start;
                }
            }
            result.messages.push(message);
            result.lastTimestamp = item.consensus_timestamp;
        }
        if (response.data.links?.next) {
            result.next = `${response.request.protocol}//${response.request.host}${response.data.links?.next}`;
        }
        return result;
    }
}
