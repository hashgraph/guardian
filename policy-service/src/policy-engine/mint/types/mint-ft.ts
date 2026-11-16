import { MintRequest } from '@guardian/common/entity/mint-request';
import { NotificationHelper } from '@guardian/common/notification/notification-helper';
import { Workers } from '@guardian/common/helpers/workers';
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
            owner: string;
            relayerAccount: string;
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
                const found = await this.findOwnTransaction('TOKENMINT', userId);

                mintTransaction.mintStatus =
                    found
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
                const found = await this.findOwnTransaction('CRYPTOTRANSFER', userId);

                transferTrasaction.transferStatus =
                    found
                        ? MintTransactionStatus.SUCCESS
                        : MintTransactionStatus.NEW;
                await this._db.saveMintTransaction(transferTrasaction);
                PolicyComponentsUtils.backup(transferTrasaction.policyId);
            }
        }
    }

    private async findOwnTransaction(
        transactiontype: 'TOKENMINT' | 'CRYPTOTRANSFER',
        userId: string | null
    ): Promise<boolean> {
        const entityId = (id: string) => String(id).split('-')[0].split('.').map(Number).join('.');
        let cursor = this._mintRequest.startTransaction;
        while (true) {
            const transactions = await new Workers().addRetryableTask(
                {
                    type: WorkerTaskType.GET_TRANSACTIONS,
                    data: {
                        accountId: this._token.treasuryId,
                        transactiontype,
                        timestamp: cursor
                            ? `gt:${cursor}`
                            : null,
                        filter: {
                            memo_base64: Buffer.from(this._mintRequest.memo, 'utf8').toString('base64'),
                        },
                        limit: 1,
                        payload: { userId }
                    },
                },
                {
                    priority: 1,
                    attempts: 10,
                    dryRun: null,
                    mockId: null
                }
            );
            const transaction = transactions[0];
            if (!transaction) {
                return false;
            }
            const timestamp = transaction.consensus_timestamp;
            if (typeof timestamp !== 'string' || !/^\d+\.\d{9}$/.test(timestamp)) {
                throw new Error('Invalid transaction consensus timestamp');
            }
            if (cursor && BigInt(timestamp.replace('.', '')) <= BigInt(cursor.replace('.', ''))) {
                throw new Error('Transaction consensus timestamp did not advance');
            }
            if (transaction.result === 'SUCCESS' && (
                transactiontype === 'TOKENMINT' ||
                transaction.token_transfers?.some((transfer) =>
                    entityId(transfer.token_id) === entityId(this._token.tokenId) &&
                    entityId(transfer.account) === entityId(this._mintRequest.target) &&
                    transfer.amount === this._mintRequest.amount
                )
            )) {
                return true;
            }
            cursor = timestamp;
        }
    }

    private async captureCheckpoint(
        transactiontype: 'TOKENMINT' | 'CRYPTOTRANSFER',
        options: {
            interception?: string | boolean;
            userId?: string;
        }
    ): Promise<void> {
        try {
            const startTransactions = await new Workers().addRetryableTask(
                {
                    type: WorkerTaskType.GET_TRANSACTIONS,
                    data: {
                        accountId: this._token.treasuryId,
                        limit: 1,
                        order: 'desc',
                        transactiontype,
                        payload: { userId: options.userId }
                    },
                },
                {
                    priority: 1,
                    attempts: 10,
                    userId: options.userId,
                    interception: options.interception,
                    dryRun: null,
                    mockId: null
                }
            );
            this._mintRequest.startTransaction = startTransactions[0]?.consensus_timestamp;
            await this._db.saveMintRequest(this._mintRequest);
        } catch (error) {
            this.error(error, options.userId);
            throw error;
        }
    }

    /**
     * Mint tokens
     */
    override async mintTokens(
        notifier: NotificationHelper,
        options: {
            interception?: string | boolean;
            userId?: string;
        }
    ): Promise<void> {
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
            if (transaction.mintStatus === MintTransactionStatus.ERROR &&
                await this.findOwnTransaction('TOKENMINT', options.userId)) {
                transaction.mintStatus = MintTransactionStatus.SUCCESS;
                transaction.error = undefined;
                await this._db.saveMintTransaction(transaction);
                PolicyComponentsUtils.backup(transaction.policyId);
                return;
            }
            await this.captureCheckpoint('TOKENMINT', options);
        }

        transaction.mintStatus = MintTransactionStatus.PENDING;
        await this._db.saveMintTransaction(transaction);

        const relayerAccount = await this.getRelayerAccount();
        try {
            await workers.addRetryableTask(
                {
                    type: WorkerTaskType.MINT_FT,
                    data: {
                        hederaAccountId: relayerAccount.hederaAccountId,
                        hederaAccountKey: relayerAccount.hederaAccountKey,
                        dryRun: this._ref && this._ref.dryRun,
                        tokenId: this._token.tokenId,
                        supplyKey: this._token.supplyKey,
                        tokenValue: this._mintRequest.amount,
                        transactionMemo: this._mintRequest.memo,
                        payload: { userId: options.userId }
                    },
                },
                {
                    priority: 10,
                    attempts: 0,
                    userId: options.userId,
                    interception: options.interception,
                    dryRun: this._ref && this._ref.dryRun,
                    mockId: null
                }
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
    override async transferTokens(
        notifier: NotificationHelper,
        options: {
            interception?: string | boolean;
            userId?: string;
        }
    ): Promise<void> {
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
            if (transaction.transferStatus === MintTransactionStatus.ERROR &&
                await this.findOwnTransaction('CRYPTOTRANSFER', options.userId)) {
                transaction.transferStatus = MintTransactionStatus.SUCCESS;
                transaction.error = undefined;
                await this._db.saveMintTransaction(transaction);
                PolicyComponentsUtils.backup(transaction.policyId);
                return;
            }
            await this.captureCheckpoint('CRYPTOTRANSFER', options);
        }

        transaction.transferStatus = MintTransactionStatus.PENDING;
        await this._db.saveMintTransaction(transaction);

        const relayerAccount = await this.getRelayerAccount();
        try {
            await workers.addRetryableTask(
                {
                    type: WorkerTaskType.TRANSFER_FT,
                    data: {
                        hederaAccountId: relayerAccount.hederaAccountId,
                        hederaAccountKey: relayerAccount.hederaAccountKey,
                        dryRun: this._ref && this._ref.dryRun,
                        tokenId: this._token.tokenId,
                        targetAccount: this._mintRequest.target,
                        treasuryId: this._token.treasuryId,
                        treasuryKey: this._token.treasuryKey,
                        tokenValue: this._mintRequest.amount,
                        transactionMemo: this._mintRequest.memo,
                        payload: { userId: options.userId }
                    },
                },
                {
                    priority: 10,
                    attempts: 0,
                    userId: options.userId,
                    interception: options.interception,
                    dryRun: this._ref && this._ref.dryRun,
                    mockId: null
                }
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
    override async mint(
        options: {
            interception?: string | boolean;
            userId?: string;
        }
    ): Promise<boolean> {
        return await super.mint({
            isProgressNeeded: false,
            interception: options.interception,
            userId: options.userId
        });
    }
}
