import { Token } from '@entity/token';
import { AnyBlockType } from '@policy-engine/policy-engine.interface';
import {
    ExternalMessageEvents,
    IRootConfig,
    WorkerTaskType
} from '@guardian/interfaces';
import { ExternalEventChannel } from '@guardian/common';
import { PrivateKey } from '@hashgraph/sdk';
import { KeyType, Wallet } from '@helpers/wallet';
import { Workers } from '@helpers/workers';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { IPolicyUser } from '@policy-engine/policy-user';
import { DatabaseServer } from '@database-modules';
import { MultiPolicy } from '@entity/multi-policy';
import { MessageAction, MessageServer, SynchronizationMessage, TopicConfig } from '@hedera-modules';

/**
 * Token Config
 */
interface TokenConfig {
    treasuryId: any;
    tokenId: any;
    supplyKey: string;
    treasuryKey: string;
}

/**
 * Mint Service
 */
export class MintService {
    /**
     * Wallet service
     */
    private static readonly wallet = new Wallet();
    /**
     * Mint Non Fungible Tokens
     * @param ref
     * @param token
     * @param tokenValue
     * @param root
     * @param targetAccount
     * @param uuid
     * @param transactionMemo
     */
    private static async mintNonFungibleTokens(
        ref: AnyBlockType,
        token: TokenConfig,
        tokenValue: number,
        root: IRootConfig,
        targetAccount: string,
        uuid: string,
        transactionMemo: string
    ) {
        const mintId = Date.now();
        ref.log(`Mint(${mintId}): Start (Count: ${tokenValue})`);

        const workers = new Workers();
        const data = new Array<string>(Math.floor(tokenValue));
        data.fill(uuid);
        const serials: number[] = [];
        const dataChunk = PolicyUtils.splitChunk(data, 10);
        const mintPromiseArray: Promise<any>[] = [];
        for (let i = 0; i < dataChunk.length; i++) {
            const metaData = dataChunk[i];
            if (i % 100 === 0) {
                ref.log(`Mint(${mintId}): Minting (Chunk: ${i + 1}/${dataChunk.length})`);
            }

            mintPromiseArray.push(workers.addRetryableTask({
                type: WorkerTaskType.MINT_NFT,
                data: {
                    hederaAccountId: root.hederaAccountId,
                    hederaAccountKey: root.hederaAccountKey,
                    dryRun: ref.dryRun,
                    tokenId: token.tokenId,
                    supplyKey: token.supplyKey,
                    metaData,
                    transactionMemo
                }
            }, 1));

        }
        try {
            for (const newSerials of await Promise.all(mintPromiseArray)) {
                for (const serial of newSerials) {
                    serials.push(serial)
                }
            }
        } catch (error) {
            ref.error(`Mint(${mintId}): Mint Error (${PolicyUtils.getErrorMessage(error)})`);
        }

        ref.log(`Mint(${mintId}): Minted (Count: ${serials.length})`);
        ref.log(`Mint(${mintId}): Transfer ${token.treasuryId} -> ${targetAccount} `);

        const serialsChunk = PolicyUtils.splitChunk(serials, 10);
        const transferPromiseArray: Promise<any>[] = [];
        for (let i = 0; i < serialsChunk.length; i++) {
            const element = serialsChunk[i];
            if (i % 100 === 0) {
                ref.log(`Mint(${mintId}): Transfer (Chunk: ${i + 1}/${serialsChunk.length})`);
            }
            transferPromiseArray.push(workers.addRetryableTask({
                type: WorkerTaskType.TRANSFER_NFT,
                data: {
                    hederaAccountId: root.hederaAccountId,
                    hederaAccountKey: root.hederaAccountKey,
                    dryRun: ref.dryRun,
                    tokenId: token.tokenId,
                    targetAccount,
                    treasuryId: token.treasuryId,
                    treasuryKey: token.treasuryKey,
                    element,
                    transactionMemo
                }
            }, 1));

        }
        try {
            await Promise.all(transferPromiseArray);
        } catch (error) {
            ref.error(`Mint(${mintId}): Transfer Error (${PolicyUtils.getErrorMessage(error)})`);
        }

        ref.log(`Mint(${mintId}): End`);
    }

    /**
     * Mint Fungible Tokens
     * @param ref
     * @param token
     * @param tokenValue
     * @param root
     * @param targetAccount
     * @param uuid
     * @param transactionMemo
     */
    private static async mintFungibleTokens(
        ref: AnyBlockType,
        token: TokenConfig,
        tokenValue: number,
        root: IRootConfig,
        targetAccount: string,
        uuid: string,
        transactionMemo: string
    ) {
        const mintId = Date.now();
        ref.log(`Mint(${mintId}): Start (Count: ${tokenValue})`);

        try {
            const workers = new Workers();
            await workers.addRetryableTask({
                type: WorkerTaskType.MINT_FT,
                data: {
                    hederaAccountId: root.hederaAccountId,
                    hederaAccountKey: root.hederaAccountKey,
                    dryRun: ref.dryRun,
                    tokenId: token.tokenId,
                    supplyKey: token.supplyKey,
                    tokenValue,
                    transactionMemo
                }
            }, 1);
            await workers.addRetryableTask({
                type: WorkerTaskType.TRANSFER_FT,
                data: {
                    hederaAccountId: root.hederaAccountId,
                    hederaAccountKey: root.hederaAccountKey,
                    dryRun: ref.dryRun,
                    tokenId: token.tokenId,
                    targetAccount,
                    treasuryId: token.treasuryId,
                    treasuryKey: token.treasuryKey,
                    tokenValue,
                    transactionMemo
                }
            }, 1);
        } catch (error) {
            ref.error(`Mint FT(${mintId}): Mint/Transfer Error (${PolicyUtils.getErrorMessage(error)})`);
        }

        ref.log(`Mint(${mintId}): End`);
    }

    /**
     * Get token keys
     * @param ref
     * @param token
     */
    private static async getTokenConfig(ref: AnyBlockType, token: Token): Promise<TokenConfig> {
        const tokenConfig: TokenConfig = {
            treasuryId: token.adminId,
            tokenId: token.tokenId,
            supplyKey: null,
            treasuryKey: null
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
            tokenConfig.supplyKey = treasuryKey;
            tokenConfig.treasuryKey = supplyKey;
        }
        return tokenConfig;
    }

    private static async sendMessage(ref: AnyBlockType, multipleConfig: MultiPolicy, root: IRootConfig) {
        const message = new SynchronizationMessage(MessageAction.Mint);
        message.setDocument();
        const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey, ref.dryRun);
        const topic = new TopicConfig({ topicId: multipleConfig.synchronizationTopicId }, null, null);
        const result = await messageServer
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
    public static async mint(
        ref: AnyBlockType,
        token: Token,
        tokenValue: number,
        documentOwner: IPolicyUser,
        root: IRootConfig,
        targetAccount: string,
        uuid: string,
        transactionMemo: string
    ): Promise<void> {
        const multipleConfig = await MintService.getMultipleConfig(ref, documentOwner);

        if (multipleConfig) {
            await MintService.sendMessage(ref, multipleConfig, root);
        } else {
            const tokenConfig = await MintService.getTokenConfig(ref, token)
            if (token.tokenType === 'non-fungible') {
                await MintService.mintNonFungibleTokens(
                    ref, tokenConfig, tokenValue, root, targetAccount, uuid, transactionMemo
                );
            } else {
                await MintService.mintFungibleTokens(
                    ref, tokenConfig, tokenValue, root, targetAccount, uuid, transactionMemo
                );
            }
        }

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
        root: IRootConfig,
        targetAccount: string,
        uuid: string
    ): Promise<void> {
        const workers = new Workers();
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
        }, 1);
    }

    private static async getMultipleConfig(ref: AnyBlockType, documentOwner: IPolicyUser) {
        return await DatabaseServer.getMultiPolicy(ref.policyInstance.instanceTopicId, documentOwner.did);
    }
}