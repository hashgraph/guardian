import { MintRequest, NotificationHelper, Workers } from '@guardian/common';
import { MintTransactionStatus, TokenType, WorkerTaskType, } from '@guardian/interfaces';
import { TypedMint } from './typed-mint.js';
import { IHederaCredentials } from '../../policy-user.js';
import { TokenConfig } from '../configs/token-config.js';
import { PolicyUtils } from '../../helpers/utils.js';
import { PolicyComponentsUtils } from '../../policy-components-utils.js';

/**
 * Mint FT
 */
export class MintFT extends TypedMint {
    /**
     * Init mint request
     * @param mintRequest Mint request
     * @param root Root
     * @param token Token
     * @param ref Block ref
     * @param notifier Notifier
     * @param userId
     * @returns Instance
     */
    static async init(
        mintRequest: MintRequest,
        root: IHederaCredentials,
        token: TokenConfig,
        ref?: any,
        notifier?: NotificationHelper,
        userId?: string
    ) {
        return new MintFT(
            ...(await super.initRequest(
                mintRequest,
                root,
                token,
                ref,
                notifier,
                userId
            ))
        );
    }

    /**
     * Create mint request
     * @param request Request
     * @param root Root
     * @param token Token
     * @param ref Ref
     * @param notifier Notifier
     * @returns Instance
     */
    static async create(
        request: {
            target: string;
            amount: number;
            vpMessageId: string;
            memo: string;
            tokenId: string;
            tokenType: TokenType;
            decimals: number;
            policyId: string;
            secondaryVpIds?: string[];
        },
        root: IHederaCredentials,
        token: TokenConfig,
        ref?: any,
        notifier?: NotificationHelper
    ) {
        return new MintFT(
            ...(await super.createRequest(request, root, token, ref, notifier))
        );
    }

    /**
     * Resolve pending transactions
     */
    protected override async resolvePendingTransactions(userId: string | null): Promise<void> {
        if (this._mintRequest.isMintNeeded) {
            const mintTransaction = await this._db.getMintTransaction({
                mintRequestId: this._mintRequest.id,
                mintStatus: MintTransactionStatus.PENDING,
            });
            if (mintTransaction) {
                const mintTransactions = await new Workers().addRetryableTask(
                    {
                        type: WorkerTaskType.GET_TRANSACTIONS,
                        data: {
                            accountId: this._token.treasuryId,
                            transactiontype: 'TOKENMINT',
                            timestamp: this._mintRequest.startTransaction
                                ? `gt:${this._mintRequest.startTransaction}`
                                : null,
                            filter: {
                                memo_base64: btoa(this._mintRequest.memo),
                            },
                            limit: 1,
                            payload: { userId }
                        },
                    },
                    1,
                    10
                );

                mintTransaction.mintStatus =
                    mintTransactions.length > 0
                        ? MintTransactionStatus.SUCCESS
                        : MintTransactionStatus.NEW;
                await this._db.saveMintTransaction(mintTransaction);
                PolicyComponentsUtils.backup(mintTransaction.policyId);
            }
        }

        if (this._mintRequest.isTransferNeeded) {
            const transferTrasaction = await this._db.getMintTransaction({
                mintRequestId: this._mintRequest.id,
                transferStatus: MintTransactionStatus.PENDING,
            });
            if (transferTrasaction) {
                const transferTransactions =
                    await new Workers().addRetryableTask(
                        {
                            type: WorkerTaskType.GET_TRANSACTIONS,
                            data: {
                                accountId: this._token.treasuryId,
                                transactiontype: 'CRYPTOTRANSFER',
                                timestamp: this._mintRequest.startTransaction
                                    ? `gt:${this._mintRequest.startTransaction}`
                                    : null,
                                filter: {
                                    memo_base64: btoa(this._mintRequest.memo),
                                },
                                limit: 1,
                                payload: { userId }
                            },
                        },
                        1,
                        10
                    );

                transferTrasaction.transferStatus =
                    transferTransactions.length > 0
                        ? MintTransactionStatus.SUCCESS
                        : MintTransactionStatus.NEW;
                await this._db.saveMintTransaction(transferTrasaction);
                PolicyComponentsUtils.backup(transferTrasaction.policyId);
            }
        }
    }

    /**
     * Mint tokens
     */
    override async mintTokens(userId?: string): Promise<void> {
        const workers = new Workers();

        let transaction = await this._db.getMintTransaction({
            mintRequestId: this._mintRequest.id,
            mintStatus: {
                $in: [MintTransactionStatus.NEW, MintTransactionStatus.ERROR],
            },
        });
        if (!transaction) {
            transaction = await this._db.saveMintTransaction({
                mintRequestId: this._mintRequest.id,
                policyId: this._mintRequest.policyId,
                mintStatus: MintTransactionStatus.NEW,
                transferStatus: this._mintRequest.isTransferNeeded
                    ? MintTransactionStatus.NEW
                    : MintTransactionStatus.NONE,
                amount: this._mintRequest.amount,
            });
        }

        if (!transaction) {
            throw new Error('There is no mint transaction');
        }

        if (!this._ref?.dryRun) {
            try {
                workers.addRetryableTask(
                    {
                        type: WorkerTaskType.GET_TRANSACTIONS,
                        data: {
                            accountId: this._token.treasuryId,
                            limit: 1,
                            order: 'desc',
                            transactiontype: 'TOKENMINT',
                            payload: { userId }
                        },
                    },
                    1,
                    10,
                    userId
                ).then(async startTransactions => {
                    try {
                        this._mintRequest.startTransaction =
                        startTransactions[0]?.consensus_timestamp;
                        await this._db.saveMintRequest(this._mintRequest);
                    } catch (error) {
                        this.error(error, userId);
                    }
                }).catch(error => this.error(error, userId));
            } catch (error) {
                this.error(error, userId);
            }
        }

        transaction.mintStatus = MintTransactionStatus.PENDING;
        await this._db.saveMintTransaction(transaction);

        try {
            await workers.addRetryableTask(
                {
                    type: WorkerTaskType.MINT_FT,
                    data: {
                        hederaAccountId: this._root.hederaAccountId,
                        hederaAccountKey: this._root.hederaAccountKey,
                        dryRun: this._ref && this._ref.dryRun,
                        tokenId: this._token.tokenId,
                        supplyKey: this._token.supplyKey,
                        tokenValue: this._mintRequest.amount,
                        transactionMemo: this._mintRequest.memo,
                        payload: { userId }
                    },
                },
                10, 0, userId
            );
            transaction.mintStatus = MintTransactionStatus.SUCCESS;
        } catch (error) {
            if (!error?.isTimeoutError) {
                transaction.error = PolicyUtils.getErrorMessage(error);
                transaction.mintStatus = MintTransactionStatus.ERROR;
            }
            throw error;
        } finally {
            await this._db.saveMintTransaction(transaction);
            PolicyComponentsUtils.backup(transaction.policyId);
        }
    }

    /**
     * Transfer tokens
     */
    override async transferTokens(userId?: string): Promise<void> {
        const workers = new Workers();

        const transaction = await this._db.getMintTransaction({
            mintRequestId: this._mintRequest.id,
            transferStatus: {
                $in: [MintTransactionStatus.NEW, MintTransactionStatus.ERROR],
            },
        });

        if (!transaction) {
            throw new Error('There is no transfer transaction');
        }

        if (!this._ref?.dryRun) {
            try {
                workers.addRetryableTask(
                    {
                        type: WorkerTaskType.GET_TRANSACTIONS,
                        data: {
                            accountId: this._token.treasuryId,
                            limit: 1,
                            order: 'desc',
                            transactiontype: 'CRYPTOTRANSFER',
                            payload: { userId }
                        },
                    },
                    1,
                    10,
                    userId
                ).then(async startTransactions => {
                    try {
                        this._mintRequest.startTransaction =
                        startTransactions[0]?.consensus_timestamp;
                        await this._db.saveMintRequest(this._mintRequest);
                    } catch (error) {
                        this.error(error, userId);
                    }
                }).catch(error => this.error(error, userId));
            } catch (error) {
                this.error(error, userId);
            }
        }

        transaction.transferStatus = MintTransactionStatus.PENDING;
        await this._db.saveMintTransaction(transaction);

        try {
            await workers.addRetryableTask(
                {
                    type: WorkerTaskType.TRANSFER_FT,
                    data: {
                        hederaAccountId: this._root.hederaAccountId,
                        hederaAccountKey: this._root.hederaAccountKey,
                        dryRun: this._ref && this._ref.dryRun,
                        tokenId: this._token.tokenId,
                        targetAccount: this._mintRequest.target,
                        treasuryId: this._token.treasuryId,
                        treasuryKey: this._token.treasuryKey,
                        tokenValue: this._mintRequest.amount,
                        transactionMemo: this._mintRequest.memo,
                        payload: { userId }
                    },
                },
                10, 0, userId
            );
            transaction.transferStatus = MintTransactionStatus.SUCCESS;
        } catch (error) {
            if (!error?.isTimeoutError) {
                transaction.error = PolicyUtils.getErrorMessage(error);
                transaction.transferStatus = MintTransactionStatus.ERROR;
            }
            throw error;
        } finally {
            await this._db.saveMintTransaction(transaction);
            PolicyComponentsUtils.backup(transaction.policyId);
        }
    }

    /**
     * Mint tokens
     * @returns Processed
     */
    override async mint(isProgressNeeded: boolean = false, userId: string | null): Promise<boolean> {
        return await super.mint(isProgressNeeded, userId);
    }
}
