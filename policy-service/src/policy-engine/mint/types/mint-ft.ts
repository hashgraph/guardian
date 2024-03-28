import { MintRequest, NotificationHelper, Workers } from '@guardian/common';
import { WorkerTaskType, MintTransactionStatus } from '@guardian/interfaces';
import { TypedMint } from './typed-mint';
import { IHederaCredentials } from '@policy-engine/policy-user';
import { TokenConfig } from '../configs/token-config';

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
     * @returns Instance
     */
    static async init(
        mintRequest: MintRequest,
        root: IHederaCredentials,
        token: TokenConfig,
        ref?: any,
        notifier?: NotificationHelper
    ) {
        return new MintFT(
            ...(await super.initRequest(
                mintRequest,
                root,
                token,
                ref,
                notifier
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
            secondaryVPs?: string[];
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
    protected override async resolvePendingTransactions(): Promise<void> {
        if (this._mintRequest.isMintNeeded) {
            const mintTransaction = await this._db.getMintTransaction({
                mintRequestId: this._mintRequest.id,
                mintStatus: MintTransactionStatus.PENDING,
            });
            const mintTransactions = await new Workers().addRetryableTask(
                {
                    type: WorkerTaskType.GET_TRANSACTIONS,
                    data: {
                        accountId: this._token.treasuryId,
                        limit: 1,
                        type: 'TOKENMINT',
                        timestamp: `gt:${this._mintRequest.startTransaction}`,
                        filter: {
                            memo: this._mintRequest.memo,
                        },
                    },
                },
                1,
                10
            );

            mintTransaction.mintStatus =
                mintTransactions.length > 0
                    ? MintTransactionStatus.NEW
                    : MintTransactionStatus.SUCCESS;
            await this._db.saveMintTransaction(mintTransaction);
        }

        if (this._mintRequest.isTransferNeeded) {
            const transferTrasaction = await this._db.getMintTransaction({
                mintRequestId: this._mintRequest.id,
                transferStatus: MintTransactionStatus.PENDING,
            });
            const transferTransactions = await new Workers().addRetryableTask(
                {
                    type: WorkerTaskType.GET_TRANSACTIONS,
                    data: {
                        accountId: this._token.treasuryId,
                        limit: 1,
                        type: 'CRYPTOTRANSFER',
                        timestamp: `gt:${this._mintRequest.startTransaction}`,
                        filter: {
                            memo: this._mintRequest.memo,
                        },
                    },
                },
                1,
                10
            );

            transferTrasaction.transferStatus =
                transferTransactions.length > 0
                    ? MintTransactionStatus.NEW
                    : MintTransactionStatus.SUCCESS;
            await this._db.saveMintTransaction(transferTrasaction);
        }
    }

    /**
     * Mint tokens
     */
    override async mintTokens(): Promise<void> {
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
            const startTransactions = await workers.addRetryableTask(
                {
                    type: WorkerTaskType.GET_TRANSACTIONS,
                    data: {
                        accountId: this._token.treasuryId,
                        limit: 1,
                        order: 'desc',
                    },
                },
                1,
                10
            );

            this._mintRequest.startTransaction = startTransactions[0];
            await this._db.saveMintRequest(this._mintRequest);
        }

        try {
            await workers.addNonRetryableTask(
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
                    },
                },
                10
            );
            transaction.mintStatus = MintTransactionStatus.SUCCESS;
        } catch (error) {
            transaction.mintStatus = MintTransactionStatus.ERROR;
        } finally {
            await this._db.saveMintTransaction(transaction);
        }
    }

    /**
     * Transfer tokens
     */
    override async transferTokens(): Promise<void> {
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
            const startTransactions = await workers.addRetryableTask(
                {
                    type: WorkerTaskType.GET_TRANSACTIONS,
                    data: {
                        accountId: this._token.treasuryId,
                        limit: 1,
                        order: 'desc',
                    },
                },
                1,
                10
            );

            this._mintRequest.startTransaction = startTransactions[0];
            await this._db.saveMintRequest(this._mintRequest);
        }

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
                    },
                },
                10
            );
            transaction.transferStatus = MintTransactionStatus.SUCCESS;
        } catch (error) {
            transaction.transferStatus = MintTransactionStatus.ERROR;
        } finally {
            await this._db.saveMintTransaction(transaction);
        }
    }

    /**
     * Mint tokens
     * @returns Processed
     */
    override async mint(): Promise<boolean> {
        return await super.mint(false);
    }
}
