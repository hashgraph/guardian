import { MintRequest, MintTransaction, NotificationHelper, Workers, } from '@guardian/common';
import { MintTransactionStatus, TokenType, WorkerTaskType } from '@guardian/interfaces';
import { PolicyUtils } from '../../helpers/utils.js';
import { IHederaCredentials } from '../../policy-user.js';
import { TypedMint } from './typed-mint.js';
import { TokenConfig } from '../configs/token-config.js';
import { PolicyComponentsUtils } from '../../policy-components-utils.js';

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
     * @param userId
     * @returns Instance
     */
    public static async init(
        mintRequest: MintRequest,
        root: IHederaCredentials,
        token: TokenConfig,
        ref?: any,
        notifier?: NotificationHelper,
        userId?: string
    ) {
        return new MintNFT(
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
            tokenType: TokenType;
            decimals: number;
            policyId: string;
            owner: string;
            relayerAccount: string;
            metadata?: string;
            secondaryVpIds?: string[];
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
     * @param userId
     */
    protected override async mintTokens(
        notifier: NotificationHelper,
        options: {
            interception?: string | boolean;
            userId?: string;
        }
    ): Promise<void> {
        const mintedTransactionsSerials = await this._db.getTransactionsSerialsCount(this._mintRequest.id);
        let mintedCount = 0;
        const tokensToMint = Math.floor(this._mintRequest.amount - mintedTransactionsSerials);

        const transactionsCount = await this._db.getTransactionsCount({ mintRequestId: this._mintRequest.id, });
        if (transactionsCount === 0) {
            const naturalCount = Math.floor(tokensToMint / 10);
            const restCount = tokensToMint % 10;

            if (naturalCount > 0) {
                await this._db.createMintTransactions(
                    {
                        mintRequestId: this._mintRequest.id,
                        policyId: this._mintRequest.policyId,
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
                    policyId: this._mintRequest.policyId,
                    amount: restCount,
                    mintStatus: MintTransactionStatus.NEW,
                    transferStatus: this._mintRequest.isTransferNeeded
                        ? MintTransactionStatus.NEW
                        : MintTransactionStatus.NONE,
                    serials: [],
                });
                PolicyComponentsUtils.backup(this._mintRequest.policyId);
            }
        }

        if (
            !this._ref?.dryRun &&
            !Number.isInteger(this._mintRequest.startSerial)
        ) {
            try {
                new Workers().addRetryableTask(
                    {
                        type: WorkerTaskType.GET_TOKEN_NFTS,
                        data: {
                            tokenId: this._token.tokenId,
                            limit: 1,
                            order: 'desc',
                            payload: { userId: options.userId },
                        },
                    },
                    {
                        priority: 1,
                        attempts: 10,
                        userId: options.userId,
                        interception: options.interception
                    }
                ).then(async (startSerial) => {
                    try {
                        this._mintRequest.startSerial = startSerial[0] || 0;
                        await this._db.saveMintRequest(this._mintRequest);
                    } catch (error) {
                        this.error(error, options.userId);
                    }
                }).catch((error) => this.error(error, options.userId));
            } catch (error) {
                this.error(error, options.userId);
            }
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
        const relayerAccount = await this.getRelayerAccount();
        while (transactions.length > 0) {
            const mintNFT = async (transaction: MintTransaction): Promise<void> => {
                transaction.mintStatus = MintTransactionStatus.PENDING;
                await this._db.saveMintTransaction(transaction);
                try {
                    const serials = await new Workers().addRetryableTask(
                        {
                            type: WorkerTaskType.MINT_NFT,
                            data: {
                                hederaAccountId: relayerAccount.hederaAccountId,
                                hederaAccountKey: relayerAccount.hederaAccountKey,
                                dryRun: this._db.getDryRun(),
                                tokenId: this._token.tokenId,
                                supplyKey: this._token.supplyKey,
                                metaData: new Array(
                                    transaction.amount -
                                    transaction.serials.length
                                ).fill(this._mintRequest.metadata),
                                transactionMemo: this._mintRequest.memo,
                                payload: { userId: options.userId }
                            },
                        },
                        {
                            priority: 1,
                            attempts: 0,
                            userId: options.userId,
                            interception: options.interception
                        }
                    );
                    transaction.serials.push(...serials);
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
     * @param userId
     */
    protected override async transferTokens(
        notifier: NotificationHelper,
        options: {
            interception?: string | boolean;
            userId?: string;
        }
    ): Promise<void> {
        let transferCount = 0;
        const tokensToTransfer = await this._db.getTransactionsSerialsCount(
            this._mintRequest.id,
            { $in: [MintTransactionStatus.ERROR, MintTransactionStatus.NEW] }
        );
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
        const relayerAccount = await this.getRelayerAccount();
        while (transactions.length > 0) {
            const transferNFT = async (
                transaction: MintTransaction
            ): Promise<number[] | null> => {
                try {
                    transaction.transferStatus = MintTransactionStatus.PENDING;
                    await this._db.saveMintTransaction(transaction);
                    const result = await new Workers().addRetryableTask(
                        {
                            type: WorkerTaskType.TRANSFER_NFT,
                            data: {
                                hederaAccountId: relayerAccount.hederaAccountId,
                                hederaAccountKey: relayerAccount.hederaAccountKey,
                                dryRun: this._ref && this._ref.dryRun,
                                tokenId: this._token.tokenId,
                                targetAccount: this._mintRequest.target,
                                treasuryId: this._token.treasuryId,
                                treasuryKey: this._token.treasuryKey,
                                element: transaction.serials,
                                transactionMemo: this._mintRequest.memo,
                                payload: { userId: options.userId }
                            },
                        },
                        {
                            priority: 1,
                            attempts: 10,
                            userId: options.userId,
                            interception: options.interception
                        }
                    );

                    transaction.transferStatus = MintTransactionStatus.SUCCESS;
                    return result;
                } catch (error) {
                    if (!error?.isTimeoutError) {
                        transaction.error = PolicyUtils.getErrorMessage(error);
                        transaction.transferStatus =
                            MintTransactionStatus.ERROR;
                    }
                    throw error;
                } finally {
                    await this._db.saveMintTransaction(transaction);
                    PolicyComponentsUtils.backup(transaction.policyId);
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
    protected override async resolvePendingTransactions(userId: string | null) {
        if (this._mintRequest.isMintNeeded) {
            const mintedSerials = await new Workers().addRetryableTask(
                {
                    type: WorkerTaskType.GET_TOKEN_NFTS,
                    data: {
                        tokenId: this._token.tokenId,
                        filter: {
                            metadata: btoa(this._mintRequest.metadata),
                        },
                        serialnumber: this._mintRequest.startSerial
                            ? `gte:${this._mintRequest.startSerial}`
                            : null,
                        payload: { userId }
                    },
                },
                {
                    priority: 1,
                    attempts: 10
                }
            );

            const mintPendingTransactions = await this._db.getMintTransactions({
                mintRequestId: this._mintRequest.id,
                mintStatus: MintTransactionStatus.PENDING,
            });

            const mintedSerialsLocal = await this._db.getMintRequestSerials(
                this._mintRequest.id
            );
            const missedSerials = mintedSerials.filter(
                (serial) => !mintedSerialsLocal.includes(serial)
            );

            for (const mintPendingTransaction of mintPendingTransactions) {
                if (missedSerials.length !== 0) {
                    mintPendingTransaction.serials = missedSerials.splice(
                        0,
                        mintPendingTransaction.amount
                    );
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
                PolicyComponentsUtils.backup(mintPendingTransaction.policyId);
            }
        }
        if (this._mintRequest.isTransferNeeded) {
            const treasurySerials = await new Workers().addRetryableTask(
                {
                    type: WorkerTaskType.GET_TOKEN_NFTS,
                    data: {
                        accountId: this._token.treasuryId,
                        tokenId: this._token.tokenId,
                        filter: {
                            metadata: btoa(this._mintRequest.metadata),
                        },
                        serialnumber: this._mintRequest.startSerial
                            ? `gte:${this._mintRequest.startSerial}`
                            : null,
                        payload: { userId }
                    },
                },
                {
                    priority: 1,
                    attempts: 10
                }
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
                PolicyComponentsUtils.backup(transferPendingTransaction.policyId);
            }
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
            isProgressNeeded: true,
            interception: options.interception,
            userId: options.userId
        });
    }
}
