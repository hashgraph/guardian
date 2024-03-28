import {
    NotificationHelper,
    Workers,
    MintTransaction,
    MintRequest,
} from '@guardian/common';
import {
    MintTransactionStatus,
    TimeoutError,
    WorkerTaskType,
} from '@guardian/interfaces';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { IHederaCredentials } from '@policy-engine/policy-user';
import { TypedMint } from './typed-mint';
import { TokenConfig } from '../configs/token-config';

/**
 * Mint NFT
 */
export class MintNFT extends TypedMint {
    /**
     * Batch NFT mint size setting
     */
    public static readonly BATCH_NFT_MINT_SIZE =
        Math.floor(Math.abs(+process.env.BATCH_NFT_MINT_SIZE)) || 10;

        /**
         * Init mint request
         * @param mintRequest Mint request
         * @param root Root
         * @param token Token
         * @param ref Block ref
         * @param notifier Notifier
         * @returns Instance
         */
    public static async init(
        mintRequest: MintRequest,
        root: IHederaCredentials,
        token: TokenConfig,
        ref?: any,
        notifier?: NotificationHelper
    ) {
        return new MintNFT(
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
     * @param request Mint request
     * @param root Root
     * @param token Token
     * @param ref Block ref
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
            metadata?: string;
            secondaryVPs?: string[];
        },
        root: IHederaCredentials,
        token: TokenConfig,
        ref?: any,
        notifier?: NotificationHelper
    ) {
        return new MintNFT(
            ...(await super.createRequest(request, root, token, ref, notifier))
        );
    }

    /**
     * Mint tokens
     * @param notifier Notifier
     */
    protected override async mintTokens(
        notifier?: NotificationHelper
    ): Promise<void> {
        const mintedTransactionsSerials =
            await this._db.getTransactionsSerialsCount(this._mintRequest.id);
        let mintedCount = 0;
        const tokensToMint = Math.floor(
            this._mintRequest.amount - mintedTransactionsSerials
        );

        const transactionsCount = await this._db.getTransactionsCount(
            this._mintRequest.id
        );
        if (transactionsCount === 0) {
            const naturalCount = Math.floor(tokensToMint / 10);
            const restCount = tokensToMint % 10;

            if (naturalCount > 0) {
                await this._db.createMintTransactions(
                    {
                        mintRequestId: this._mintRequest.id,
                        amount: 10,
                        mintStatus: MintTransactionStatus.NEW,
                        transferStatus: this._mintRequest.isTransferNeeded
                            ? MintTransactionStatus.NEW
                            : MintTransactionStatus.NONE,
                        serials: [],
                    },
                    naturalCount
                );
            }
            if (restCount > 0) {
                await this._db.saveMintTransaction({
                    mintRequestId: this._mintRequest.id,
                    amount: restCount,
                    mintStatus: MintTransactionStatus.NEW,
                    transferStatus: this._mintRequest.isTransferNeeded
                        ? MintTransactionStatus.NEW
                        : MintTransactionStatus.NONE,
                    serials: [],
                });
            }
        }

        if (!this._ref.dryRun) {
            const startSerial = await new Workers().addRetryableTask(
                {
                    type: WorkerTaskType.GET_TOKEN_NFTS,
                    data: {
                        tokenId: this._token.tokenId,
                        metadata: this._mintRequest.metadata,
                        limit: 1,
                        order: 'desc',
                    },
                },
                1,
                10
            );
            this._mintRequest.startSerial = startSerial;
            await this._db.saveMintRequest(this._mintRequest);
        }

        let transactions = await this._db.getMintTransactions(
            {
                mintRequestId: this._mintRequest.id,
                mintStatus: {
                    $in: [
                        MintTransactionStatus.ERROR,
                        MintTransactionStatus.NEW,
                    ],
                },
            },
            {
                limit: MintNFT.BATCH_NFT_MINT_SIZE,
            }
        );
        while (transactions.length > 0) {
            const mintNFT = async (
                transaction: MintTransaction
            ): Promise<void> => {
                try {
                    const serials = await new Workers().addNonRetryableTask(
                        {
                            type: WorkerTaskType.MINT_NFT,
                            data: {
                                hederaAccountId: this._root.hederaAccountId,
                                hederaAccountKey: this._root.hederaAccountKey,
                                dryRun: this._db.getDryRun(),
                                tokenId: this._token.tokenId,
                                supplyKey: this._token.supplyKey,
                                metaData: new Array(
                                    transaction.amount -
                                        transaction.serials.length
                                ).fill(this._mintRequest.metadata),
                                transactionMemo: this._mintRequest.memo,
                            },
                        },
                        1
                    );
                    transaction.serials.push(...serials);
                    transaction.mintStatus = MintTransactionStatus.SUCCESS;
                } catch (error) {
                    if (!(error instanceof TimeoutError)) {
                        transaction.error = PolicyUtils.getErrorMessage(error);
                        transaction.mintStatus = MintTransactionStatus.ERROR;
                    }
                    throw error;
                } finally {
                    await this._db.saveMintTransaction(transaction);
                }
            };

            await Promise.all(transactions.map(mintNFT));

            mintedCount += transactions.reduce(
                (sum, item) => sum + item.amount,
                0
            );
            notifier?.step(
                `Minting (${this._token.tokenId}) progress: ${mintedCount}/${tokensToMint}`,
                (mintedCount / tokensToMint) * 100
            );

            transactions = await this._db.getMintTransactions(
                {
                    mintRequestId: this._mintRequest.id,
                    mintStatus: MintTransactionStatus.NEW,
                },
                {
                    limit: MintNFT.BATCH_NFT_MINT_SIZE,
                }
            );
        }
    }

    /**
     * Transfer tokens
     * @param notifier Notifier
     */
    protected override async transferTokens(notifier: NotificationHelper): Promise<void> {
        const mintedSerials = await this._db.getMintRequestSerials(
            this._mintRequest.id
        );
        let transferCount = 0;
        const tokensToTransfer = mintedSerials.length;

        let transactions = await this._db.getMintTransactions(
            {
                mintRequestId: this._mintRequest.id,
                transferStatus: {
                    $in: [
                        MintTransactionStatus.ERROR,
                        MintTransactionStatus.NEW,
                    ],
                },
            },
            {
                limit: MintNFT.BATCH_NFT_MINT_SIZE,
            }
        );
        while (transactions.length > 0) {
            const transferNFT = async (
                transaction: MintTransaction
            ): Promise<number[] | null> => {
                try {
                    const result = await new Workers().addRetryableTask(
                        {
                            type: WorkerTaskType.TRANSFER_NFT,
                            data: {
                                hederaAccountId: this._root.hederaAccountId,
                                hederaAccountKey: this._root.hederaAccountKey,
                                dryRun: this._ref && this._ref.dryRun,
                                tokenId: this._token.tokenId,
                                targetAccount: this._mintRequest.target,
                                treasuryId: this._token.treasuryId,
                                treasuryKey: this._token.treasuryKey,
                                element: transaction.serials,
                                transactionMemo: this._mintRequest.memo,
                            },
                        },
                        1,
                        10
                    );

                    transaction.transferStatus = MintTransactionStatus.SUCCESS;
                    return result;
                } catch (error) {
                    if (!(error instanceof TimeoutError)) {
                        transaction.error = PolicyUtils.getErrorMessage(error);
                        transaction.transferStatus =
                            MintTransactionStatus.ERROR;
                    }
                    throw error;
                } finally {
                    await this._db.saveMintTransaction(transaction);
                }
            };
            notifier?.step(
                `Transfer (${this._token.tokenId}) progress: ${transferCount}/${tokensToTransfer}`,
                (transferCount / tokensToTransfer) * 100
            );

            await Promise.all(transactions.map(transferNFT));

            transferCount += transactions.reduce(
                (sum, item) => sum + item.amount,
                0
            );

            transactions = await this._db.getMintTransactions(
                {
                    mintRequestId: this._mintRequest.id,
                    transferStatus: MintTransactionStatus.NEW,
                },
                {
                    limit: MintNFT.BATCH_NFT_MINT_SIZE,
                }
            );
        }
    }

    /**
     * Resolve pending transactions
     */
    protected override async resolvePendingTransactions() {
        if (this._mintRequest.isMintNeeded) {
            const mintedSerials = await new Workers().addRetryableTask(
                {
                    type: WorkerTaskType.GET_TOKEN_NFTS,
                    data: {
                        hederaAccountId: this._root.hederaAccountId,
                        hederaAccountKey: this._root.hederaAccountKey,
                        dryRun: this._ref && this._ref.dryRun,
                        tokenId: this._token.tokenId,
                        metadata: this._mintRequest.metadata,
                        serialnumber: `gt:${this._mintRequest.startSerial}`,
                    },
                },
                1,
                10
            );

            const mintPendingTransactions = await this._db.getMintTransactions({
                mintRequestId: this._mintRequest.id,
                mintStatus: MintTransactionStatus.PENDING,
            });

            const missedSerials = (
                await this._db.getMintRequestSerials(this._mintRequest.id)
            ).map((serial) => mintedSerials.includes(serial));

            for (const mintPendingTransaction of mintPendingTransactions) {
                if (missedSerials.length !== 0) {
                    mintPendingTransaction.serials =
                        missedSerials.length / mintPendingTransaction.amount > 0
                            ? missedSerials.splice(
                                  0,
                                  mintPendingTransaction.amount
                              )
                            : missedSerials.splice(0, missedSerials.length);
                    mintPendingTransaction.mintStatus =
                        mintPendingTransaction.amount ===
                        mintPendingTransaction.serials.length
                            ? MintTransactionStatus.SUCCESS
                            : MintTransactionStatus.NEW;
                } else {
                    mintPendingTransaction.mintStatus =
                        MintTransactionStatus.NEW;
                }
                await this._db.saveMintTransaction(mintPendingTransaction);
            }
        }
        if (this._mintRequest.isTransferNeeded) {
            const treasurySerials = await new Workers().addRetryableTask(
                {
                    type: WorkerTaskType.GET_TOKEN_NFTS,
                    data: {
                        accountId: this._token.treasuryId,
                        tokenId: this._token.tokenId,
                        metadata: this._mintRequest.metadata,
                        serialnumber: `gt:${this._mintRequest.startSerial}`,
                    },
                },
                1,
                10
            );
            const transferPendingTransactions =
                await this._db.getMintTransactions({
                    mintRequestId: this._mintRequest.id,
                    transferStatus: MintTransactionStatus.PENDING,
                });
            for (const transferPendingTransaction of transferPendingTransactions) {
                transferPendingTransaction.transferStatus =
                    transferPendingTransaction.serials.some((serial) =>
                        treasurySerials.includes(serial)
                    )
                        ? MintTransactionStatus.NEW
                        : MintTransactionStatus.SUCCESS;
                await this._db.saveMintTransaction(transferPendingTransaction);
            }
        }
    }

    /**
     * Mint tokens
     * @returns Processed
     */
    override async mint(): Promise<boolean> {
        return await super.mint(true);
    }
}
