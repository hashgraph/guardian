import { AnyBlockType } from '../policy-engine.interface.js';
import { ContractParamType, ExternalMessageEvents, GenerateUUIDv4, IRootConfig, ISignOptions, NotificationAction, TokenType, WorkerTaskType, } from '@guardian/interfaces';
import { DatabaseServer, ExternalEventChannel, KeyType, Logger, MessageAction, MessageServer, MintRequest, MultiPolicy, NotificationHelper, SynchronizationMessage, Token, TopicConfig, Users, VcDocumentDefinition as VcDocument, Wallet, Workers, } from '@guardian/common';
import { AccountId, PrivateKey, TokenId } from '@hashgraph/sdk';
import { PolicyUtils } from '../helpers/utils.js';
import { IHederaCredentials, IPolicyUser } from '../policy-user.js';
import { TokenConfig } from './configs/token-config.js';
import { MintNFT } from './types/mint-nft.js';
import { MintFT } from './types/mint-ft.js';

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
     * Retry mint interval
     */
    public static readonly RETRY_MINT_INTERVAL = process.env.RETRY_MINT_INTERVAL
        ? parseInt(process.env.RETRY_MINT_INTERVAL, 10)
        : 10;

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
        documents: VcDocument[],
        signOptions: ISignOptions
    ): Promise<void> {
        const multipleConfig = await MintService.getMultipleConfig(
            ref,
            documentOwner
        );
        const users = new Users();
        const documentOwnerUser = await users.getUserById(documentOwner.did);
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
            }, signOptions);
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
                multipleConfig.type === 'Main'
                    ? 'Mint transaction created'
                    : `Request to mint is submitted`,
                NotificationAction.POLICY_VIEW,
                ref.policyId
            );
        } else {
            const tokenConfig = await MintService.getTokenConfig(ref, token);
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
                    },
                    root,
                    tokenConfig,
                    ref,
                    notifier
                );
                MintService.activeMintProcesses.add(mintNFT.mintRequestId);
                mintNFT
                    .mint()
                    .catch((error) =>
                        MintService.error(PolicyUtils.getErrorMessage(error))
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
                    },
                    root,
                    tokenConfig,
                    ref,
                    notifier
                );
                MintService.activeMintProcesses.add(mintFT.mintRequestId);
                mintFT
                    .mint()
                    .catch((error) =>
                        MintService.error(PolicyUtils.getErrorMessage(error))
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
     */
    public static async retry(
        vpMessageId: string,
        userDId: string,
        rootDid: string,
        ref?: any
    ) {
        const db = new DatabaseServer(ref?.dryRun);
        const requests = await db.getMintRequests({
            $and: [
                {
                    vpMessageId,
                },
            ],
        });
        if (requests.length === 0) {
            throw new Error('There are no requests to retry');
        }
        const vp = await db.getVpDocument({
            messageId: vpMessageId,
        });
        const users = new Users();
        const documentOwnerUser = await users.getUserById(vp.owner);
        const user = await users.getUserById(userDId);
        let processed = false;
        const root = await users.getHederaAccount(rootDid);
        const rootUser = await users.getUserById(rootDid);
        for (const request of requests) {
            processed ||= await MintService.retryRequest(
                request,
                user?.id,
                rootUser?.id,
                root,
                documentOwnerUser?.id,
                ref
            );
        }

        if (!processed) {
            NotificationHelper.success(
                `All tokens for ${vpMessageId} are minted and transferred`,
                `Retry is not needed`,
                ref?.dryRun ? rootUser?.id : user?.id
            );
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
        rootId: string,
        root: IRootConfig,
        ownerId: string,
        ref?: any
    ) {
        if (!request) {
            throw new Error('There is no mint request');
        }
        if (MintService.activeMintProcesses.has(request.id)) {
            NotificationHelper.warn(
                'Retry mint',
                `Mint process for ${request.vpMessageId} is already in progress`,
                userId
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
                `Mint process for ${
                    request.vpMessageId
                } can't be retried. Try after ${Math.ceil(
                    (request.processDate.getTime() +
                        MintService.RETRY_MINT_INTERVAL * (60 * 1000) -
                        Date.now()) /
                        (60 * 1000)
                )} minutes`,
                userId
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
                token
            );
            let processed = false;

            switch (token.tokenType) {
                case TokenType.FUNGIBLE:
                    processed = await (
                        await MintFT.init(
                            request,
                            root,
                            tokenConfig,
                            ref,
                            NotificationHelper.init([rootId, userId, ownerId])
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
                            NotificationHelper.init([rootId, userId, ownerId])
                        )
                    ).mint();
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
     */
    private static async sendMessage(
        ref: AnyBlockType,
        multipleConfig: MultiPolicy,
        root: IHederaCredentials,
        data: any,
        signOptions: ISignOptions
    ) {
        const message = new SynchronizationMessage(MessageAction.Mint);
        message.setDocument(multipleConfig, data);
        const messageServer = new MessageServer(
            root.hederaAccountId,
            root.hederaAccountKey,
            signOptions,
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
                },
                root,
                tokenConfig,
                null,
                notifier
            );
            MintService.activeMintProcesses.add(mintNFT.mintRequestId);
            mintNFT
                .mint()
                .catch((error) =>
                    MintService.error(PolicyUtils.getErrorMessage(error))
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
                },
                root,
                tokenConfig,
                null
            );
            MintService.activeMintProcesses.add(mintFT.mintRequestId);
            mintFT
                .mint()
                .catch((error) =>
                    MintService.error(PolicyUtils.getErrorMessage(error))
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
