import { AnyBlockType } from '../policy-engine.interface.js';
import { ContractParamType, ExternalMessageEvents, GenerateUUIDv4, ISignOptions, NotificationAction, WorkerTaskType } from '@guardian/interfaces';
import { DatabaseServer, ExternalEventChannel, KeyType, Logger, MessageAction, MessageServer, MultiPolicy, NotificationHelper, SynchronizationMessage, Token, TopicConfig, Users, VcDocumentDefinition as VcDocument, Wallet, Workers, } from '@guardian/common';
import { AccountId, PrivateKey, TokenId } from '@hashgraph/sdk';
import { PolicyUtils } from '../helpers/utils.js';
import { IHederaCredentials, IPolicyUser } from '../policy-user.js';

/**
 * Token Config
 */
interface TokenConfig {
    /**
     * Token name
     */
    tokenName: string
    /**
     * Treasury Account Id
     */
    treasuryId: any;
    /**
     * Token ID
     */
    tokenId: any;
    /**
     * Supply Key
     */
    supplyKey: string;
    /**
     * Treasury Account Key
     */
    treasuryKey: string;
}

/**
 * Mint Service
 */
export class MintService {
    /**
     * Size of mint NFT batch
     */
    public static readonly BATCH_NFT_MINT_SIZE =
        Math.floor(Math.abs(+process.env.BATCH_NFT_MINT_SIZE)) || 10;

    /**
     * Wallet service
     */
    private static readonly wallet = new Wallet();
    /**
     * Logger service
     */
    private static readonly logger = new Logger();

    /**
     * Mint Non Fungible Tokens
     * @param token
     * @param tokenValue
     * @param root
     * @param targetAccount
     * @param uuid
     * @param transactionMemo
     * @param ref
     */
    private static async mintNonFungibleTokens(
        token: TokenConfig,
        tokenValue: number,
        root: IHederaCredentials,
        targetAccount: string,
        uuid: string,
        transactionMemo: string,
        ref?: AnyBlockType,
        notifier?: NotificationHelper,
    ): Promise<any[]> {
        const mintNFT = (metaData: string[]): Promise<number[]> =>
            workers.addRetryableTask(
                {
                    type: WorkerTaskType.MINT_NFT,
                    data: {
                        hederaAccountId: root.hederaAccountId,
                        hederaAccountKey: root.hederaAccountKey,
                        dryRun: ref && ref.dryRun,
                        tokenId: token.tokenId,
                        supplyKey: token.supplyKey,
                        metaData,
                        transactionMemo,
                    },
                },
                1, 10
            );
        const transferNFT = (serials: number[]): Promise<number[] | null> => {
            MintService.logger.debug(
                `Transfer ${token?.tokenId} serials: ${JSON.stringify(serials)}`,
                ['POLICY_SERVICE', mintId.toString()]
            );
            return workers.addRetryableTask(
                {
                    type: WorkerTaskType.TRANSFER_NFT,
                    data: {
                        hederaAccountId:
                            root.hederaAccountId,
                        hederaAccountKey:
                            root.hederaAccountKey,
                        dryRun: ref && ref.dryRun,
                        tokenId: token.tokenId,
                        targetAccount,
                        treasuryId: token.treasuryId,
                        treasuryKey: token.treasuryKey,
                        element: serials,
                        transactionMemo,
                    },
                },
                1, 10
            );
        };
        const mintAndTransferNFT = async (metaData: string[]) => {
            try {
                return await transferNFT(await mintNFT(metaData));
            } catch (e) {
                return null;
            }
        }
        const mintId = Date.now();
        MintService.log(`Mint(${mintId}): Start (Count: ${tokenValue})`, ref);

        const result: number[] = [];
        const workers = new Workers();
        const data = new Array<string>(Math.floor(tokenValue));
        data.fill(uuid);
        const dataChunks = PolicyUtils.splitChunk(data, 10);
        const tasks = PolicyUtils.splitChunk(
            dataChunks,
            MintService.BATCH_NFT_MINT_SIZE
        );
        for (let i = 0; i < tasks.length; i++) {
            const dataChunk = tasks[i];
            MintService.log(
                `Mint(${mintId}): Minting and transferring (Chunk: ${i * MintService.BATCH_NFT_MINT_SIZE + 1
                }/${tasks.length * MintService.BATCH_NFT_MINT_SIZE})`,
                ref
            );
            notifier?.step(
                `Mint(${token.tokenName}): Minting and transferring (Chunk: ${i * MintService.BATCH_NFT_MINT_SIZE + 1
                }/${tasks.length * MintService.BATCH_NFT_MINT_SIZE})`,
                (i * MintService.BATCH_NFT_MINT_SIZE +
                    1) / (tasks.length * MintService.BATCH_NFT_MINT_SIZE) *
                100
            );
            try {
                const results = await Promise.all(dataChunk.map(mintAndTransferNFT));
                for (const serials of results) {
                    if (Array.isArray(serials)) {
                        for (const n of serials) {
                            result.push(n);
                        }
                    }
                }
            } catch (error) {
                notifier?.stop({
                    title: 'Minting tokens',
                    message: `Mint(${token.tokenName
                        }): Error (${PolicyUtils.getErrorMessage(error)})`,
                });
                MintService.error(
                    `Mint(${mintId}): Error (${PolicyUtils.getErrorMessage(
                        error
                    )})`,
                    ref
                );
                throw error;
            }
        }

        notifier?.finish();

        MintService.log(
            `Mint(${mintId}): Minted (Count: ${Math.floor(tokenValue)})`,
            ref
        );
        MintService.log(
            `Mint(${mintId}): Transferred ${token.treasuryId} -> ${targetAccount} `,
            ref
        );
        MintService.log(`Mint(${mintId}): End`, ref);

        return result;
    }

    /**
     * Mint Fungible Tokens
     * @param token
     * @param tokenValue
     * @param root
     * @param targetAccount
     * @param uuid
     * @param transactionMemo
     * @param ref
     */
    private static async mintFungibleTokens(
        token: TokenConfig,
        tokenValue: number,
        root: IHederaCredentials,
        targetAccount: string,
        uuid: string,
        transactionMemo: string,
        ref?: AnyBlockType,
    ): Promise<number | null> {
        const mintId = Date.now();
        MintService.log(`Mint(${mintId}): Start (Count: ${tokenValue})`, ref);

        let result: number | null = null;
        try {
            const workers = new Workers();
            await workers.addRetryableTask({
                type: WorkerTaskType.MINT_FT,
                data: {
                    hederaAccountId: root.hederaAccountId,
                    hederaAccountKey: root.hederaAccountKey,
                    dryRun: ref && ref.dryRun,
                    tokenId: token.tokenId,
                    supplyKey: token.supplyKey,
                    tokenValue,
                    transactionMemo
                }
            }, 10);
            await workers.addRetryableTask({
                type: WorkerTaskType.TRANSFER_FT,
                data: {
                    hederaAccountId: root.hederaAccountId,
                    hederaAccountKey: root.hederaAccountKey,
                    dryRun: ref && ref.dryRun,
                    tokenId: token.tokenId,
                    targetAccount,
                    treasuryId: token.treasuryId,
                    treasuryKey: token.treasuryKey,
                    tokenValue,
                    transactionMemo
                }
            }, 10);
            result = tokenValue;
        } catch (error) {
            result = null;
            MintService.error(`Mint FT(${mintId}): Mint/Transfer Error (${PolicyUtils.getErrorMessage(error)})`, ref);
        }

        MintService.log(`Mint(${mintId}): End`, ref);

        return result;
    }

    /**
     * Get token keys
     * @param ref
     * @param token
     */
    private static async getTokenConfig(ref: AnyBlockType, token: Token): Promise<TokenConfig> {
        const tokenConfig: TokenConfig = {
            treasuryId: token.draftToken ? '0.0.0' : token.adminId,
            tokenId: token.draftToken ? '0.0.0' : token.tokenId,
            supplyKey: null,
            treasuryKey: null,
            tokenName: token.tokenName,
        }
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
     * @param uuid
     */
    public static async mint(
        ref: AnyBlockType,
        token: Token,
        tokenValue: number,
        documentOwner: IPolicyUser,
        root: IHederaCredentials,
        targetAccount: string,
        messageId: string,
        transactionMemo: string,
        documents: VcDocument[],
    ): Promise<void> {
        const multipleConfig = await MintService.getMultipleConfig(ref, documentOwner);
        const users = new Users();
        const documentOwnerUser = await users.getUserById(documentOwner.did);
        const wallet = new Wallet();
        const signOptions = await wallet.getUserSignOptions(documentOwnerUser);
        const policyOwner = await users.getUserById(ref.policyOwner);
        const notifier = NotificationHelper.init(
            [documentOwnerUser?.id, policyOwner?.id],
        );
        if (multipleConfig) {
            const hash = VcDocument.toCredentialHash(documents, (value: any) => {
                delete value.id;
                delete value.policyId;
                delete value.ref;
                return value;
            });
            await MintService.sendMessage(ref, multipleConfig, root, {
                hash,
                messageId,
                tokenId: token.tokenId,
                amount: tokenValue,
                memo: transactionMemo,
                target: targetAccount,
            }, signOptions);
            if (multipleConfig.type === 'Main') {
                const user = await PolicyUtils.getUserCredentials(ref, documentOwner.did);
                await DatabaseServer.createMultiPolicyTransaction({
                    uuid: GenerateUUIDv4(),
                    policyId: ref.policyId,
                    owner: documentOwner.did,
                    user: user.hederaAccountId,
                    hash,
                    tokenId: token.tokenId,
                    amount: tokenValue,
                    target: targetAccount,
                    status: 'Waiting'
                });
            }
        } else {
            const tokenConfig = await MintService.getTokenConfig(ref, token);
            if (token.tokenType === 'non-fungible') {
                const serials = await MintService.mintNonFungibleTokens(
                    tokenConfig,
                    tokenValue,
                    root,
                    targetAccount,
                    messageId,
                    transactionMemo,
                    ref,
                    await notifier.progress(
                        'Minting tokens',
                        `Start minting ${token.tokenName}`
                    )
                );
                await MintService.updateDocuments(messageId, { tokenId: token.tokenId, serials }, ref);
            } else {
                const amount = await MintService.mintFungibleTokens(
                    tokenConfig, tokenValue, root, targetAccount, messageId, transactionMemo, ref
                );
                await MintService.updateDocuments(messageId, { tokenId: token.tokenId, amount }, ref);
            }
        }

        notifier.success(
            multipleConfig ? `Multi mint` : `Mint completed`,
            multipleConfig
                ? `Request to mint is submitted`
                : `All ${token.tokenName} tokens have been minted and transferred`,
            NotificationAction.POLICY_VIEW,
            ref.policyId
        );

        new ExternalEventChannel().publishMessage(
            ExternalMessageEvents.TOKEN_MINTED,
            {
                tokenId: token.tokenId,
                tokenValue,
                memo: transactionMemo
            }
        );
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
        const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey, signOptions, ref.dryRun);
        const topic = new TopicConfig({ topicId: multipleConfig.synchronizationTopicId }, null, null);
        await messageServer
            .setTopicObject(topic)
            .sendMessage(message);
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
        notifier?: NotificationHelper,
    ): Promise<void> {
        const messageIds = ids.join(',');
        const memo = messageIds;
        const tokenConfig: TokenConfig = {
            treasuryId: token.adminId,
            tokenId: token.tokenId,
            supplyKey: null,
            treasuryKey: null,
            tokenName: token.tokenName,
        }
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
            const serials = await MintService.mintNonFungibleTokens(
                tokenConfig,
                tokenValue,
                root,
                targetAccount,
                messageIds,
                memo,
                null,
                await notifier?.progress(
                    'Minting tokens',
                    `Start minting ${token.tokenName}`
                )
            );
            await MintService.updateDocuments(ids, { tokenId: token.tokenId, serials }, null);
        } else {
            const amount = await MintService.mintFungibleTokens(
                tokenConfig, tokenValue, root, targetAccount, messageIds, memo, null
            );
            await MintService.updateDocuments(ids, { tokenId: token.tokenId, amount }, null);
        }

        notifier?.success(
            `Mint completed`,
            `All ${token.tokenName} tokens have been minted and transferred`
        );

        new ExternalEventChannel().publishMessage(
            ExternalMessageEvents.TOKEN_MINTED,
            {
                tokenId: token.tokenId,
                tokenValue,
                memo
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
                                value: tokenValue
                            }
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
            await workers.addRetryableTask({
                type: WorkerTaskType.WIPE_TOKEN,
                data: {
                    hederaAccountId: root.hederaAccountId,
                    hederaAccountKey: root.hederaAccountKey,
                    dryRun: ref.dryRun,
                    token,
                    wipeKey,
                    targetAccount,
                    tokenValue,
                    uuid
                }
            }, 10);
        }
    }

    /**
     * Update VP Documents
     * @param ids
     * @param value
     * @param ref
     */
    private static async updateDocuments(ids: string | string[], value: any, ref: AnyBlockType) {
        const dryRunId = ref ? ref.dryRun : null;
        const filter = Array.isArray(ids) ? {
            where: { messageId: { $in: ids } }
        } : {
            where: { messageId: { $eq: ids } }
        }
        await DatabaseServer.updateVpDocuments(value, filter, dryRunId);
    }

    /**
     * Get Multiple Link
     * @param ref
     * @param documentOwner
     */
    private static async getMultipleConfig(ref: AnyBlockType, documentOwner: IPolicyUser) {
        return await DatabaseServer.getMultiPolicy(ref.policyInstance.instanceTopicId, documentOwner.did);
    }

    /**
     * Write log message
     * @param message
     */
    public static log(message: string, ref?: AnyBlockType,) {
        if (ref) {
            MintService.logger.info(message, ['GUARDIAN_SERVICE', ref.uuid, ref.blockType, ref.tag, ref.policyId]);
        } else {
            MintService.logger.info(message, ['GUARDIAN_SERVICE']);
        }

    }

    /**
     * Write error message
     * @param message
     */
    public static error(message: string, ref?: AnyBlockType,) {
        if (ref) {
            MintService.logger.error(message, ['GUARDIAN_SERVICE', ref.uuid, ref.blockType, ref.tag, ref.policyId]);
        } else {
            MintService.logger.error(message, ['GUARDIAN_SERVICE']);
        }

    }

    /**
     * Write warn message
     * @param message
     */
    public static warn(message: string, ref?: AnyBlockType,) {
        if (ref) {
            MintService.logger.warn(message, ['GUARDIAN_SERVICE', ref.uuid, ref.blockType, ref.tag, ref.policyId]);
        } else {
            MintService.logger.warn(message, ['GUARDIAN_SERVICE']);
        }

    }
}
