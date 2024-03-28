import { AnyBlockType } from '@policy-engine/policy-engine.interface';
import {
    ContractParamType,
    ExternalMessageEvents,
    GenerateUUIDv4,
    IRootConfig,
    NotificationAction,
    TokenType,
    WorkerTaskType,
} from '@guardian/interfaces';
import {
    DatabaseServer,
    ExternalEventChannel,
    KeyType,
    Logger,
    MessageAction,
    MessageServer,
    MintRequest,
    MultiPolicy,
    NotificationHelper,
    SynchronizationMessage,
    Token,
    TopicConfig,
    Users,
    VcDocumentDefinition as VcDocument,
    Wallet,
    Workers,
} from '@guardian/common';
import { AccountId, PrivateKey, TokenId } from '@hashgraph/sdk';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { IHederaCredentials, IPolicyUser } from '@policy-engine/policy-user';
import { TokenConfig } from './configs/token-config';
import { MintNFT } from './types/mint-nft';
import { MintFT } from './types/mint-ft';

/**
 * Mint Service
 */
export class MintService {
    /**
     * Wallet service
     */
    private static readonly wallet = new Wallet();
    /**
     * Logger service
     */
    private static readonly logger = new Logger();

    /**
     * Active mint processes
     */
    public static activeMintProcesses = new Set<string>();

    /**
     * Get token keys
     * @param ref
     * @param token
     */
    private static async getTokenConfig(
        ref: AnyBlockType,
        token: Token
    ): Promise<TokenConfig> {
        const tokenConfig: TokenConfig = {
            treasuryId: token.draftToken ? '0.0.0' : token.adminId,
            tokenId: token.draftToken ? '0.0.0' : token.tokenId,
            supplyKey: null,
            treasuryKey: null,
            tokenName: token.tokenName,
        };
        if (ref.dryRun) {
            const tokenPK = PrivateKey.generate().toString();
            tokenConfig.supplyKey = tokenPK;
            tokenConfig.treasuryKey = tokenPK;
        } else {
            const [treasuryKey, supplyKey] = await Promise.all([
                MintService.wallet.getUserKey(
                    token.owner,
                    KeyType.TOKEN_TREASURY_KEY,
                    token.tokenId
                ),
                MintService.wallet.getUserKey(
                    token.owner,
                    KeyType.TOKEN_SUPPLY_KEY,
                    token.tokenId
                ),
            ]);
            tokenConfig.supplyKey = supplyKey;
            tokenConfig.treasuryKey = treasuryKey;
        }
        return tokenConfig;
    }

    /**
     * Send Synchronization Message
     * @param ref
     * @param multipleConfig
     * @param root
     * @param data
     */
    private static async sendMessage(
        ref: AnyBlockType,
        multipleConfig: MultiPolicy,
        root: IHederaCredentials,
        data: any
    ) {
        const message = new SynchronizationMessage(MessageAction.Mint);
        message.setDocument(multipleConfig, data);
        const messageServer = new MessageServer(
            root.hederaAccountId,
            root.hederaAccountKey,
            ref.dryRun
        );
        const topic = new TopicConfig(
            { topicId: multipleConfig.synchronizationTopicId },
            null,
            null
        );
        await messageServer.setTopicObject(topic).sendMessage(message);
    }

    /**
     * Retry mint
     * @param vpMessageId VP message identifer
     * @param userDId User did
     * @param rootDid Root did
     * @param ref Block ref
     */
    public static async retry(
        vpMessageId: string,
        userDId: string,
        rootDid: string,
        ref?: any
    ) {
        const db = new DatabaseServer(ref?.dryRun);
        const vp = await db.getVpDocument({
            messageId: vpMessageId,
        });
        const users = new Users();
        const documentOwnerUser = await users.getUserById(vp.owner);
        const user = await users.getUserById(userDId);
        if (MintService.activeMintProcesses.has(vpMessageId)) {
            NotificationHelper.warn(
                'Retry mint',
                `Mint process for ${vpMessageId} is already in progress`,
                user.id
            );
            return;
        }
        MintService.activeMintProcesses.add(vpMessageId);
        try {
            const root = await new Users().getHederaAccount(rootDid);
            const requests = await new DatabaseServer(
                ref?.dryRun
            ).getMintRequests({
                $and: [
                    {
                        vpMessageId,
                    },
                    {
                        $or: [
                            {
                                isMintNeeded: true,
                            },
                            {
                                isTransferNeeded: true,
                            },
                        ],
                    },
                ],
            });

            let processed = false;

            for (const request of requests) {
                processed = await MintService.retryRequest(
                    request,
                    user.id,
                    root,
                    documentOwnerUser.id,
                    ref
                );
            }

            if (!processed) {
                NotificationHelper.success(
                    'All tokens already have been minted and transferred',
                    `Retry is not needed`,
                    user.id
                );
            }
        } catch (error) {
            throw error;
        } finally {
            MintService.activeMintProcesses.delete(vpMessageId);
        }
    }

    /**
     * Retry mint request
     * @param request Mint request
     * @param userId User identifier
     * @param root Root
     * @param ownerId Owner identifier
     * @param ref Block ref
     * @returns Mint or transfer is processed
     */
    public static async retryRequest(
        request: MintRequest,
        userId: string,
        root: IRootConfig,
        ownerId: string,
        ref?: any
    ) {
        let processed = false;

        if (!request) {
            throw new Error('There is no mint request');
        }

        let token = await new DatabaseServer().getToken(request.tokenId);
        if (!token) {
            token = await new DatabaseServer().getToken(request.tokenId, ref);
        }
        const tokenConfig: TokenConfig = await MintService.getTokenConfig(
            ref,
            token
        );

        switch (token.tokenType) {
            case TokenType.FUNGIBLE:
                processed = await (
                    await MintFT.init(
                        request,
                        root,
                        tokenConfig,
                        ref,
                        NotificationHelper.init([
                            root.id,
                            userId,
                            ownerId,
                        ])
                    )
                ).mint();
                break;
            case TokenType.NON_FUNGIBLE:
                processed = await (
                    await MintNFT.init(
                        request,
                        root,
                        tokenConfig,
                        ref,
                        NotificationHelper.init([
                            root.id,
                            userId,
                            ownerId,
                        ])
                    )
                ).mint();
                break;
            default:
                throw new Error('Unknown token type');
        }

        return processed;
    }

    /**
     * Mint
     * @param ref
     * @param token
     * @param tokenValue
     * @param documentOwner
     * @param root
     * @param targetAccount
     * @param uuid
     */
    public static async mint(
        ref: AnyBlockType,
        token: Token,
        tokenValue: number,
        documentOwner: IPolicyUser,
        root: IHederaCredentials,
        targetAccount: string,
        vpMessageId: string,
        transactionMemo: string,
        documents: VcDocument[]
    ): Promise<void> {
        if (MintService.activeMintProcesses.has(vpMessageId)) {
            return;
        }
        MintService.activeMintProcesses.add(vpMessageId);
        try {
            const multipleConfig = await MintService.getMultipleConfig(
                ref,
                documentOwner
            );
            const users = new Users();
            const documentOwnerUser = await users.getUserById(
                documentOwner.did
            );
            const policyOwner = await users.getUserById(ref.policyOwner);
            const notifier = NotificationHelper.init([
                documentOwnerUser?.id,
                policyOwner?.id,
            ]);
            if (multipleConfig) {
                const hash = VcDocument.toCredentialHash(
                    documents,
                    (value: any) => {
                        delete value.id;
                        delete value.policyId;
                        delete value.ref;
                        return value;
                    }
                );
                await MintService.sendMessage(ref, multipleConfig, root, {
                    hash,
                    messageId: vpMessageId,
                    tokenId: token.tokenId,
                    amount: tokenValue,
                    memo: transactionMemo,
                    target: targetAccount,
                });
                if (multipleConfig.type === 'Main') {
                    const user = await PolicyUtils.getUserCredentials(
                        ref,
                        documentOwner.did
                    );
                    await DatabaseServer.createMultiPolicyTransaction({
                        uuid: GenerateUUIDv4(),
                        policyId: ref.policyId,
                        owner: documentOwner.did,
                        user: user.hederaAccountId,
                        hash,
                        vpMessageId,
                        tokenId: token.tokenId,
                        amount: tokenValue,
                        target: targetAccount,
                        status: 'Waiting',
                    });
                }
                notifier.success(
                    `Multi mint`,
                    `Request to mint is submitted`,
                    NotificationAction.POLICY_VIEW,
                    ref.policyId
                );
            } else {
                const tokenConfig = await MintService.getTokenConfig(
                    ref,
                    token
                );
                if (token.tokenType === 'non-fungible') {
                    await (
                        await MintNFT.create(
                            {
                                target: targetAccount,
                                amount: tokenValue,
                                vpMessageId,
                                tokenId: token.tokenId,
                                metadata: vpMessageId,
                                memo: transactionMemo,
                            },
                            root,
                            tokenConfig,
                            ref,
                            notifier
                        )
                    ).mint();
                } else {
                    await (
                        await MintFT.create(
                            {
                                target: targetAccount,
                                amount: tokenValue,
                                vpMessageId,
                                tokenId: token.tokenId,
                                memo: transactionMemo,
                            },
                            root,
                            tokenConfig,
                            ref,
                            notifier
                        )
                    ).mint();
                }
            }

            new ExternalEventChannel().publishMessage(
                ExternalMessageEvents.TOKEN_MINTED,
                {
                    tokenId: token.tokenId,
                    tokenValue,
                    memo: transactionMemo,
                }
            );
        } catch (error) {
            throw error;
        } finally {
            MintService.activeMintProcesses.delete(vpMessageId);
        }
    }

    /**
     * Mint
     * @param ref
     * @param token
     * @param tokenValue
     * @param documentOwner
     * @param root
     * @param targetAccount
     * @param uuid
     */
    public static async multiMint(
        root: IHederaCredentials,
        token: Token,
        tokenValue: number,
        targetAccount: string,
        ids: string[],
        vpMessageId: string,
        notifier?: NotificationHelper
    ): Promise<void> {
        if (MintService.activeMintProcesses.has(vpMessageId)) {
            return;
        }
        MintService.activeMintProcesses.add(vpMessageId);
        try {
            const messageIds = ids.join(',');
            const memo = messageIds;
            const tokenConfig: TokenConfig = {
                treasuryId: token.adminId,
                tokenId: token.tokenId,
                supplyKey: null,
                treasuryKey: null,
                tokenName: token.tokenName,
            };
            const [treasuryKey, supplyKey] = await Promise.all([
                MintService.wallet.getUserKey(
                    token.owner,
                    KeyType.TOKEN_TREASURY_KEY,
                    token.tokenId
                ),
                MintService.wallet.getUserKey(
                    token.owner,
                    KeyType.TOKEN_SUPPLY_KEY,
                    token.tokenId
                ),
            ]);
            tokenConfig.supplyKey = supplyKey;
            tokenConfig.treasuryKey = treasuryKey;

            if (token.tokenType === 'non-fungible') {
                await (
                    await MintNFT.create(
                        {
                            target: targetAccount,
                            amount: tokenValue,
                            vpMessageId,
                            metadata: messageIds,
                            secondaryVPs: ids,
                            memo,
                            tokenId: token.tokenId,
                        },
                        root,
                        tokenConfig,
                        null,
                        notifier
                    )
                ).mint();
            } else {
                await (
                    await MintFT.create(
                        {
                            target: targetAccount,
                            amount: tokenValue,
                            vpMessageId,
                            secondaryVPs: ids,
                            memo,
                            tokenId: token.tokenId,
                        },
                        root,
                        tokenConfig,
                        null
                    )
                ).mint();
            }

            new ExternalEventChannel().publishMessage(
                ExternalMessageEvents.TOKEN_MINTED,
                {
                    tokenId: token.tokenId,
                    tokenValue,
                    memo,
                }
            );
        } catch (error) {
            throw error;
        } finally {
            MintService.activeMintProcesses.delete(vpMessageId);
        }
    }

    /**
     * Wipe
     * @param token
     * @param tokenValue
     * @param root
     * @param targetAccount
     * @param uuid
     */
    public static async wipe(
        ref: AnyBlockType,
        token: Token,
        tokenValue: number,
        root: IHederaCredentials,
        targetAccount: string,
        uuid: string
    ): Promise<void> {
        const workers = new Workers();
        if (token.wipeContractId) {
            await workers.addNonRetryableTask(
                {
                    type: WorkerTaskType.CONTRACT_CALL,
                    data: {
                        contractId: token.wipeContractId,
                        hederaAccountId: root.hederaAccountId,
                        hederaAccountKey: root.hederaAccountKey,
                        functionName: 'wipe',
                        gas: 1000000,
                        parameters: [
                            {
                                type: ContractParamType.ADDRESS,
                                value: TokenId.fromString(
                                    token.tokenId
                                ).toSolidityAddress(),
                            },
                            {
                                type: ContractParamType.ADDRESS,
                                value: AccountId.fromString(
                                    targetAccount
                                ).toSolidityAddress(),
                            },
                            {
                                type: ContractParamType.INT64,
                                value: tokenValue,
                            },
                        ],
                    },
                },
                20
            );
        } else {
            const wipeKey = await MintService.wallet.getUserKey(
                token.owner,
                KeyType.TOKEN_WIPE_KEY,
                token.tokenId
            );
            await workers.addRetryableTask(
                {
                    type: WorkerTaskType.WIPE_TOKEN,
                    data: {
                        hederaAccountId: root.hederaAccountId,
                        hederaAccountKey: root.hederaAccountKey,
                        dryRun: ref.dryRun,
                        token,
                        wipeKey,
                        targetAccount,
                        tokenValue,
                        uuid,
                    },
                },
                10
            );
        }
    }

    /**
     * Get Multiple Link
     * @param ref
     * @param documentOwner
     */
    private static async getMultipleConfig(
        ref: AnyBlockType,
        documentOwner: IPolicyUser
    ) {
        return await DatabaseServer.getMultiPolicy(
            ref.policyInstance.instanceTopicId,
            documentOwner.did
        );
    }

    /**
     * Write log message
     * @param message
     */
    public static log(message: string, ref?: AnyBlockType) {
        if (ref) {
            MintService.logger.info(message, [
                'GUARDIAN_SERVICE',
                ref.uuid,
                ref.blockType,
                ref.tag,
                ref.policyId,
            ]);
        } else {
            MintService.logger.info(message, ['GUARDIAN_SERVICE']);
        }
    }

    /**
     * Write error message
     * @param message
     */
    public static error(message: string, ref?: AnyBlockType) {
        if (ref) {
            MintService.logger.error(message, [
                'GUARDIAN_SERVICE',
                ref.uuid,
                ref.blockType,
                ref.tag,
                ref.policyId,
            ]);
        } else {
            MintService.logger.error(message, ['GUARDIAN_SERVICE']);
        }
    }

    /**
     * Write warn message
     * @param message
     */
    public static warn(message: string, ref?: AnyBlockType) {
        if (ref) {
            MintService.logger.warn(message, [
                'GUARDIAN_SERVICE',
                ref.uuid,
                ref.blockType,
                ref.tag,
                ref.policyId,
            ]);
        } else {
            MintService.logger.warn(message, ['GUARDIAN_SERVICE']);
        }
    }
}
