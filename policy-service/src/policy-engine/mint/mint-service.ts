import { AnyBlockType } from '../policy-engine.interface.js';
import { ContractParamType, ExternalMessageEvents, GenerateUUIDv4, IRootConfig, ISignOptions, NotificationAction, TokenType, WorkerTaskType, } from '@guardian/interfaces';
import { DatabaseServer, ExternalEventChannel, KeyType, MessageAction, MessageServer, MintRequest, MultiPolicy, MultiPolicyTransaction, NotificationHelper, PinoLogger, SynchronizationMessage, Token, TopicConfig, Users, VcDocumentDefinition as VcDocument, Wallet, Workers } from '@guardian/common';
import { AccountId, PrivateKey, TokenId } from '@hiero-ledger/sdk';
import { PolicyUtils } from '../helpers/utils.js';
import { IHederaCredentials, PolicyUser } from '../policy-user.js';
import { TokenConfig } from './configs/token-config.js';
import { MintNFT } from './types/mint-nft.js';
import { MintFT } from './types/mint-ft.js';
import { FilterObject } from '@mikro-orm/core';

/**
 * Mint Service
 */
export class MintService {
    /**
     * Wallet service
     */
    private static readonly walletHelper = new Wallet();
    /**
     * Logger service
     */
    private static readonly logger = new PinoLogger();

    /**
     * Active mint processes
     */
    public static activeMintProcesses = new Set<string>();

    /**
     * Retry mint interval
     */
    public static readonly RETRY_MINT_INTERVAL = process.env.RETRY_MINT_INTERVAL
        ? parseInt(process.env.RETRY_MINT_INTERVAL, 10)
        : 10;

    /**
     * Get token keys
     * @param ref
     * @param token
     * @param userId
     */
    private static async getTokenConfig(
        ref: AnyBlockType,
        token: Token,
        userId: string | null
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
                MintService.walletHelper.getUserKey(
                    token.owner,
                    KeyType.TOKEN_TREASURY_KEY,
                    token.tokenId,
                    userId
                ),
                MintService.walletHelper.getUserKey(
                    token.owner,
                    KeyType.TOKEN_SUPPLY_KEY,
                    token.tokenId,
                    userId
                ),
            ]);
            tokenConfig.supplyKey = supplyKey;
            tokenConfig.treasuryKey = treasuryKey;
        }
        return tokenConfig;
    }

    /**
     * Mint
     * @param ref
     * @param token
     * @param tokenValue
     * @param documentOwner
     * @param root
     * @param targetAccount
     * @param vpMessageId
     * @param transactionMemo
     * @param documents
     * @param signOptions
     * @param userId
     */
    public static async mint(options: {
        ref: AnyBlockType,
        token: Token,
        tokenValue: number,
        documentOwner: PolicyUser,
        policyOwnerHederaCred: IHederaCredentials,
        targetAccount: string,
        vpMessageId: string,
        transactionMemo: string,
        documents: VcDocument[],
        policyOwnerSignOptions: ISignOptions,
        relayerAccount: string,
        userId: string | null
    }): Promise<void> {
        const {
            ref,
            token,
            tokenValue,
            documentOwner,
            policyOwnerHederaCred,
            targetAccount,
            vpMessageId,
            transactionMemo,
            documents,
            policyOwnerSignOptions,
            relayerAccount,
            userId
        } = options;

        const multipleConfig = await MintService.getMultipleConfig(ref, documentOwner);
        const users = new Users();
        const documentOwnerUser = await users.getUserById(documentOwner.did, userId);
        const policyOwner = await users.getUserById(ref.policyOwner, userId);
        const notifier = NotificationHelper.init([documentOwnerUser?.id, policyOwner?.id]);
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
            await MintService.sendMessage(ref, multipleConfig, policyOwnerHederaCred, {
                hash,
                messageId: vpMessageId,
                tokenId: token.tokenId,
                amount: tokenValue,
                memo: transactionMemo,
                target: targetAccount,
            }, policyOwnerSignOptions, userId);
            if (multipleConfig.type === 'Main') {
                const user = await PolicyUtils.getUserCredentials(
                    ref,
                    documentOwner.did,
                    userId
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
                    relayerAccount,
                    status: 'Waiting',
                } as FilterObject<MultiPolicyTransaction>);
            }
            notifier.success(
                `Multi mint`,
                multipleConfig.type === 'Main'
                    ? 'Mint transaction created'
                    : `Request to mint is submitted`,
                NotificationAction.POLICY_VIEW,
                ref.policyId
            );
        } else {
            const tokenConfig = await MintService.getTokenConfig(ref, token, userId);
            if (token.tokenType === 'non-fungible') {
                const mintNFT = await MintNFT.create(
                    {
                        target: targetAccount,
                        amount: tokenValue,
                        vpMessageId,
                        tokenId: token.tokenId,
                        metadata: vpMessageId,
                        tokenType: token.tokenType,
                        decimals: token.decimals,
                        memo: transactionMemo,
                        policyId: ref.policyId,
                        owner: documentOwner.did,
                        relayerAccount
                    },
                    policyOwnerHederaCred,
                    tokenConfig,
                    ref,
                    notifier
                );
                MintService.activeMintProcesses.add(mintNFT.mintRequestId);
                mintNFT
                    .mint({
                        userId,
                        interception: null
                    })
                    .catch((error) =>
                        MintService.error(PolicyUtils.getErrorMessage(error), null, userId)
                    )
                    .finally(() => {
                        MintService.activeMintProcesses.delete(
                            mintNFT.mintRequestId
                        );
                    });
            } else {
                const mintFT = await MintFT.create(
                    {
                        target: targetAccount,
                        amount: tokenValue,
                        vpMessageId,
                        tokenId: token.tokenId,
                        tokenType: token.tokenType,
                        decimals: token.decimals,
                        memo: transactionMemo,
                        policyId: ref.policyId,
                        owner: documentOwner.did,
                        relayerAccount
                    },
                    policyOwnerHederaCred,
                    tokenConfig,
                    ref,
                    notifier
                );
                MintService.activeMintProcesses.add(mintFT.mintRequestId);
                mintFT
                    .mint({
                        userId,
                        interception: null
                    })
                    .catch((error) =>
                        MintService.error(PolicyUtils.getErrorMessage(error), null, userId)
                    )
                    .finally(() => {
                        MintService.activeMintProcesses.delete(
                            mintFT.mintRequestId
                        );
                    });
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
    }

    /**
     * Retry mint
     * @param vpMessageId VP message identifer
     * @param userDId User did
     * @param rootDid Root did
     * @param ref Block ref
     * @param userId
     */
    public static async retry(
        vpMessageId: string,
        userDId: string,
        rootDid: string,
        ref: any,
        userId: string | null
    ) {
        const db = new DatabaseServer(ref?.dryRun);
        const requests = await db.getMintRequests({
            $and: [
                {
                    vpMessageId,
                },
            ],
        } as FilterObject<MintRequest>);
        if (requests.length === 0) {
            throw new Error('There are no requests to retry');
        }
        const vp = await db.getVpDocument({
            messageId: vpMessageId,
        });
        const users = new Users();
        const documentOwner = await users.getUserById(vp.owner, userId);
        const actor = await users.getUserById(userDId, userId);
        const policyOwner = await users.getUserById(rootDid, userId);
        const policyOwnerCred = await users.getHederaAccount(rootDid, userId);

        let processed = false;
        for (const request of requests) {
            processed ||= await MintService.retryRequest(
                request,
                actor?.id,
                policyOwner?.id,
                policyOwnerCred,
                documentOwner?.id,
                ref,
                userId
            );
        }

        if (!processed) {
            NotificationHelper.success(
                `All tokens for ${vpMessageId} are minted and transferred`,
                `Retry is not needed`,
                ref?.dryRun ? policyOwner?.id : actor?.id
            );
        }
    }

    /**
     * Retry mint request
     * @param request Mint request
     * @param actorId User identifier
     * @param policyOwnerId
     * @param root Root
     * @param ownerId Owner identifier
     * @param ref Block ref
     * @returns Mint or transfer is processed
     */
    public static async retryRequest(
        request: MintRequest,
        actorId: string,
        policyOwnerId: string,
        policyOwnerCred: IRootConfig,
        documentOwnerId: string,
        ref: any,
        userId: string | null
    ) {
        if (!request) {
            throw new Error('There is no mint request');
        }
        if (MintService.activeMintProcesses.has(request.id)) {
            NotificationHelper.warn(
                'Retry mint',
                `Mint process for ${request.vpMessageId} is already in progress`,
                actorId
            );
            return true;
        }
        if (
            request.processDate &&
            Date.now() - request.processDate.getTime() <
            MintService.RETRY_MINT_INTERVAL * (60 * 1000)
        ) {
            NotificationHelper.warn(
                `Retry mint`,
                `Mint process for ${request.vpMessageId
                } can't be retried. Try after ${Math.ceil(
                    (request.processDate.getTime() +
                        MintService.RETRY_MINT_INTERVAL * (60 * 1000) -
                        Date.now()) /
                    (60 * 1000)
                )} minutes`,
                actorId
            );
            return true;
        }

        MintService.activeMintProcesses.add(request.id);
        try {
            let token = await new DatabaseServer().getToken(request.tokenId);
            if (!token) {
                token = await new DatabaseServer().getToken(
                    request.tokenId,
                    ref
                );
            }
            const tokenConfig: TokenConfig = await MintService.getTokenConfig(
                ref,
                token,
                userId
            );
            let processed = false;

            switch (token.tokenType) {
                case TokenType.FUNGIBLE:
                    processed = await (
                        await MintFT.init(
                            request,
                            policyOwnerCred,
                            tokenConfig,
                            ref,
                            NotificationHelper.init([policyOwnerId, actorId, documentOwnerId]),
                            actorId
                        )
                    ).mint({
                        userId,
                        interception: null
                    });
                    break;
                case TokenType.NON_FUNGIBLE:
                    processed = await (
                        await MintNFT.init(
                            request,
                            policyOwnerCred,
                            tokenConfig,
                            ref,
                            NotificationHelper.init([policyOwnerId, actorId, documentOwnerId]),
                            actorId
                        )
                    ).mint({
                        userId,
                        interception: null
                    });
                    break;
                default:
                    throw new Error('Unknown token type');
            }

            return processed;
        } catch (error) {
            throw error;
        } finally {
            MintService.activeMintProcesses.delete(request.id);
        }
    }

    /**
     * Send Synchronization Message
     * @param ref
     * @param multipleConfig
     * @param root
     * @param data
     * @param signOptions
     * @param userId
     */
    private static async sendMessage(
        ref: AnyBlockType,
        multipleConfig: MultiPolicy,
        policyOwnerHederaCred: IHederaCredentials,
        data: any,
        policyOwnerSignOptions: ISignOptions,
        userId?: string | null
    ) {
        const message = new SynchronizationMessage(MessageAction.Mint);
        message.setDocument(multipleConfig, data);
        const messageServer = new MessageServer({
            operatorId: policyOwnerHederaCred.hederaAccountId,
            operatorKey: policyOwnerHederaCred.hederaAccountKey,
            encryptKey: policyOwnerHederaCred.hederaAccountKey,
            signOptions: policyOwnerSignOptions,
            dryRun: ref.dryRun
        });
        const topic = new TopicConfig(
            { topicId: multipleConfig.synchronizationTopicId },
            null,
            null
        );
        await messageServer
            .setTopicObject(topic)
            .sendMessage(message, {
                sendToIPFS: true,
                memo: null,
                userId,
                interception: null
            });
    }

    /**
     * Mint
     * @param root
     * @param token
     * @param tokenValue
     * @param targetAccount
     * @param ids
     * @param vpMessageId
     * @param policyId
     * @param userId
     * @param notifier
     */
    public static async multiMint(options: {
        root: IHederaCredentials,
        token: Token,
        tokenValue: number,
        targetAccount: string,
        ids: string[],
        vpMessageId: string,
        policyId: string,
        owner: string;
        relayerAccount: string;
        userId: string | null,
        notifier?: NotificationHelper
    }): Promise<void> {
        const {
            root,
            token,
            tokenValue,
            targetAccount,
            ids,
            vpMessageId,
            policyId,
            userId,
            owner,
            relayerAccount,
            notifier
        } = options;
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
            MintService.walletHelper.getUserKey(
                token.owner,
                KeyType.TOKEN_TREASURY_KEY,
                token.tokenId,
                userId
            ),
            MintService.walletHelper.getUserKey(
                token.owner,
                KeyType.TOKEN_SUPPLY_KEY,
                token.tokenId,
                userId
            ),
        ]);
        tokenConfig.supplyKey = supplyKey;
        tokenConfig.treasuryKey = treasuryKey;

        if (token.tokenType === 'non-fungible') {
            const mintNFT = await MintNFT.create(
                {
                    target: targetAccount,
                    amount: tokenValue,
                    vpMessageId,
                    metadata: messageIds,
                    secondaryVpIds: ids,
                    memo,
                    tokenId: token.tokenId,
                    tokenType: token.tokenType,
                    decimals: token.decimals,
                    policyId,
                    owner,
                    relayerAccount
                },
                root,
                tokenConfig,
                null,
                notifier
            );
            MintService.activeMintProcesses.add(mintNFT.mintRequestId);
            mintNFT
                .mint({
                    userId,
                    interception: null
                })
                .catch((error) =>
                    MintService.error(PolicyUtils.getErrorMessage(error), null, userId)
                )
                .finally(() => {
                    MintService.activeMintProcesses.delete(
                        mintNFT.mintRequestId
                    );
                });
        } else {
            const mintFT = await MintFT.create(
                {
                    target: targetAccount,
                    amount: tokenValue,
                    vpMessageId,
                    secondaryVpIds: ids,
                    memo,
                    tokenId: token.tokenId,
                    tokenType: token.tokenType,
                    decimals: token.decimals,
                    policyId,
                    owner,
                    relayerAccount
                },
                root,
                tokenConfig,
                null
            );
            MintService.activeMintProcesses.add(mintFT.mintRequestId);
            mintFT
                .mint({
                    userId,
                    interception: null
                })
                .catch((error) =>
                    MintService.error(PolicyUtils.getErrorMessage(error), null, userId)
                )
                .finally(() => {
                    MintService.activeMintProcesses.delete(
                        mintFT.mintRequestId
                    );
                });
        }

        new ExternalEventChannel().publishMessage(
            ExternalMessageEvents.TOKEN_MINTED,
            {
                tokenId: token.tokenId,
                tokenValue,
                memo,
            }
        );
    }

    /**
     * Wipe
     * @param ref
     * @param token
     * @param tokenValue
     * @param root
     * @param targetAccount
     * @param uuid
     * @param userId
     * @param serialNumbers
     */
    public static async wipe(options: {
        ref: AnyBlockType,
        token: Token,
        tokenValue: number,
        root: IHederaCredentials,
        targetAccount: string,
        relayerAccount: string,
        uuid: string,
        userId: string | null,
        serialNumbers?: number[]
    }): Promise<void> {
        const { ref, token, tokenValue, root, targetAccount, uuid, userId, serialNumbers } = options;
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
                            }
                        ],
                        payload: { userId }
                    },
                },
                {
                    priority: 20
                }
            );
        } else {
            const wipeKey = await MintService.walletHelper.getUserKey(
                token.owner,
                KeyType.TOKEN_WIPE_KEY,
                token.tokenId,
                userId
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
                        serialNumbers,
                        payload: { userId }
                    },
                },
                {
                    priority: 10
                }
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
        documentOwner: PolicyUser
    ) {
        return await DatabaseServer.getMultiPolicy(
            ref.policyInstance.instanceTopicId,
            documentOwner.did
        );
    }

    /**
     * Write log message
     * @param message
     * @param ref
     * @param userId
     */
    public static log(message: string, ref: AnyBlockType, userId: string | null) {
        if (ref) {
            MintService.logger.info(message, [
                'POLICY_SERVICE',
                ref.uuid,
                ref.blockType,
                ref.tag,
                ref.policyId,
            ], userId);
        } else {
            MintService.logger.info(message, ['POLICY_SERVICE'], userId);
        }
    }

    /**
     * Write error message
     * @param message
     * @param ref
     * @param userId
     */
    public static error(message: string, ref: AnyBlockType, userId: string | null) {
        if (ref) {
            MintService.logger.error(message, [
                'POLICY_SERVICE',
                ref.uuid,
                ref.blockType,
                ref.tag,
                ref.policyId,
            ], userId);
        } else {
            MintService.logger.error(message, ['POLICY_SERVICE'], userId);
        }
    }

    /**
     * Write warn message
     * @param message
     * @param ref
     * @param userId
     */
    public static warn(message: string, ref: AnyBlockType, userId: string | null) {
        if (ref) {
            MintService.logger.warn(message, [
                'POLICY_SERVICE',
                ref.uuid,
                ref.blockType,
                ref.tag,
                ref.policyId,
            ], userId);
        } else {
            MintService.logger.warn(message, ['POLICY_SERVICE'], userId);
        }
    }
}
