import {
    DatabaseServer,
    MintRequest,
    NotificationHelper,
} from '@guardian/common';
import { IHederaCredentials } from '../../policy-user.js';
import { TokenConfig } from '../configs/token-config.js';
import { MintService } from '../mint-service.js';
import { PolicyUtils } from '../../helpers/utils.js';
import {
    MintTransactionStatus,
    NotificationAction,
    TokenType
} from '@guardian/interfaces';

/**
 * Typed mint
 */
export abstract class TypedMint {
    /**
     * Mint request identifier
     */
    public readonly mintRequestId: string;

    /**
     * Initialize
     * @param _mintRequest Mint request
     * @param _root Root
     * @param _token Token
     * @param _db Database Server
     * @param _ref Block ref
     * @param _notifier Notifier
     */
    protected constructor(
        protected _mintRequest: MintRequest,
        protected _root: IHederaCredentials,
        protected _token: TokenConfig,
        protected _db: DatabaseServer,
        protected _ref?: any,
        protected _notifier?: NotificationHelper,
    ) {
        this.mintRequestId = this._mintRequest.id;
    }

    /**
     * Init request
     * @param mintRequest Mint request
     * @param root Root
     * @param token Token
     * @param ref Block ref
     * @param notifier Notifier
     * @returns Parameters
     */
    protected static async initRequest(
        mintRequest: MintRequest,
        root: IHederaCredentials,
        token: TokenConfig,
        ref?: any,
        notifier?: NotificationHelper
    ): Promise<
        [
            MintRequest,
            IHederaCredentials,
            TokenConfig,
            DatabaseServer,
            any,
            NotificationHelper
        ]
    > {
        const db = new DatabaseServer(ref?.dryRun);
        return [mintRequest, root, token, db, ref, notifier];
    }

    /**
     * Create request
     * @param request Request
     * @param root Root
     * @param token Token
     * @param ref Block ref
     * @param notifier Notifier
     * @returns Parameters
     */
    protected static async createRequest(
        request: {
            target: string;
            amount: number;
            vpMessageId: string;
            memo: string;
            tokenId: string;
            tokenType: TokenType;
            decimals: number;
            metadata?: string;
        },
        root: IHederaCredentials,
        token: TokenConfig,
        ref?: any,
        notifier?: NotificationHelper
    ): Promise<
        [
            MintRequest,
            IHederaCredentials,
            TokenConfig,
            DatabaseServer,
            any,
            NotificationHelper
        ]
    > {
        const db = new DatabaseServer(ref?.dryRun);
        const isTransferNeeded = request.target !== token.treasuryId;
        const mintRequest = await db.saveMintRequest(
            Object.assign(request, { isTransferNeeded, wasTransferNeeded: isTransferNeeded })
        );
        return [mintRequest, root, token, db, ref, notifier];
    }

    /**
     * Mint tokens
     * @param args Arguments
     */
    protected abstract mintTokens(...args): Promise<void>;

    /**
     * Transfer tokens
     * @param args Arguments
     */
    protected abstract transferTokens(...args): Promise<void>;

    /**
     * Resolve pending transactions
     */
    protected abstract resolvePendingTransactions(): Promise<void>;

    /**
     * Resolve pending transactions check
     * @returns Is resolving needed
     */
    private async _resolvePendingTransactionsCheck(): Promise<boolean> {
        const pendingTransactions = await this._db.getMintTransactions({
            $and: [
                {
                    mintRequestId: this._mintRequest.id,
                },
                {
                    $or: [
                        {
                            mintStatus: MintTransactionStatus.PENDING,
                        },
                        {
                            transferStatus: MintTransactionStatus.PENDING,
                        },
                    ],
                },
            ],
        });
        if (pendingTransactions.length === 0) {
            return false;
        }

        if (this._ref?.dryRun) {
            for (const pendingTransaction of pendingTransactions) {
                if (this._mintRequest.isMintNeeded) {
                    pendingTransaction.mintStatus = MintTransactionStatus.NEW;
                }
                if (this._mintRequest.isTransferNeeded) {
                    pendingTransaction.transferStatus =
                        MintTransactionStatus.NEW;
                }
                await this._db.saveMintTransaction(pendingTransaction);
            }
            return false;
        }

        return true;
    }

    /**
     * Handle resolve result
     */
    private async _handleResolveResult() {
        const notCompletedMintTransactions =
            await this._db.getTransactionsCount({
                mintRequestId: this._mintRequest.id,
                mintStatus: {
                    $nin: [
                        MintTransactionStatus.SUCCESS,
                        MintTransactionStatus.NONE,
                    ],
                },
            });
        this._mintRequest.isMintNeeded = notCompletedMintTransactions > 0;
        const notCompletedTransferTransactions =
            await this._db.getTransactionsCount({
                mintRequestId: this._mintRequest.id,
                transferStatus: {
                    $nin: [
                        MintTransactionStatus.SUCCESS,
                        MintTransactionStatus.NONE,
                    ],
                },
            });
        this._mintRequest.isTransferNeeded =
            notCompletedTransferTransactions > 0;
        await this._db.saveMintRequest(this._mintRequest);
    }

    /**
     * Progress
     * @param title Title
     * @param message Message
     * @returns Notification
     */
    private progressResult(title: string, message: string) {
        if (!this._notifier) {
            return;
        }
        const notification: any = {};
        notification.title = title;
        notification.message = message;
        if (this._ref) {
            notification.action = NotificationAction.POLICY_VIEW;
            notification.result = this._ref.policyId;
        }
        return notification;
    }

    /**
     * Mint tokens
     * @param isProgressNeeded Is progress needed
     * @returns Processed
     */
    protected async mint(isProgressNeeded: boolean): Promise<boolean> {
        if (
            !this._mintRequest.isMintNeeded &&
            !this._mintRequest.isTransferNeeded
        ) {
            return false;
        }

        if (await this._resolvePendingTransactionsCheck()) {
            await this.resolvePendingTransactions();
            await this._handleResolveResult();
        }

        let processed = false;
        if (this._mintRequest.isMintNeeded) {
            MintService.log(`Mint (${this._token.tokenId}) started`, this._ref);

            let notifier;
            if (isProgressNeeded) {
                notifier = await this._notifier?.progress(
                    'Minting tokens',
                    `Start minting ${this._token.tokenName}`
                );
            }

            try {
                this._mintRequest.processDate = new Date();
                await this._db.saveMintRequest(this._mintRequest);
                await this.mintTokens(notifier);
            } catch (error) {
                const errorMessage = PolicyUtils.getErrorMessage(error);
                notifier?.stop();
                // tslint:disable-next-line:no-shadowed-variable
                const progressResult = this.progressResult(
                    'Minting tokens',
                    errorMessage
                );
                await this._notifier?.error(
                    progressResult.title,
                    progressResult.message,
                    progressResult.action,
                    progressResult.result
                );
                this._mintRequest.error = errorMessage;
                this._mintRequest.processDate = new Date();
                await this._db.saveMintRequest(this._mintRequest);
                throw error;
            }

            this._mintRequest.isMintNeeded = false;
            await this._db.saveMintRequest(this._mintRequest);

            MintService.log(
                `Mint (${this._token.tokenId}) completed`,
                this._ref
            );
            notifier?.finish();

            const progressResult = this.progressResult(
                `Mint completed`,
                `All ${this._token.tokenName} tokens have been minted`
            );
            await this._notifier?.success(
                progressResult.title,
                progressResult.message,
                progressResult.action,
                progressResult.result
            );
            processed = true;
        }

        if (this._mintRequest.isTransferNeeded) {
            MintService.log(
                `Transfer (${this._token.tokenId}) started`,
                this._ref
            );

            let notifier;
            if (isProgressNeeded) {
                notifier = await this._notifier?.progress(
                    'Transferring tokens',
                    `Start transfer ${this._token.tokenName}`
                );
            }

            try {
                this._mintRequest.processDate = new Date();
                await this._db.saveMintRequest(this._mintRequest);
                await this.transferTokens(notifier);
            } catch (error) {
                const errorMessage = PolicyUtils.getErrorMessage(error);
                notifier?.stop();
                // tslint:disable-next-line:no-shadowed-variable
                const progressResult = this.progressResult(
                    'Transferring tokens',
                    errorMessage
                );
                await this._notifier?.error(
                    progressResult.title,
                    progressResult.message,
                    progressResult.action,
                    progressResult.result
                );
                this._mintRequest.error = errorMessage;
                this._mintRequest.processDate = new Date();
                await this._db.saveMintRequest(this._mintRequest);
                throw error;
            }

            this._mintRequest.isTransferNeeded = false;
            await this._db.saveMintRequest(this._mintRequest);

            MintService.log(
                `Transfer (${this._token.tokenId}) completed`,
                this._ref
            );
            notifier?.finish();

            const progressResult = this.progressResult(
                `Transfer completed`,
                `All ${this._token.tokenName} tokens have been transferred`
            );
            await this._notifier?.success(
                progressResult.title,
                progressResult.message,
                progressResult.action,
                progressResult.result
            );
            processed = true;
        }

        this._mintRequest.error = undefined;
        this._mintRequest.processDate = undefined;
        await this._db.saveMintRequest(this._mintRequest);

        return processed;
    }
}
