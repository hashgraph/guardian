import {
    ExternalMessageEvents, IRootConfig,
    WorkerTaskType
} from '@guardian/interfaces';
import { ExternalEventChannel, Logger, Token, KeyType, Wallet, Workers} from '@guardian/common';

/**
 * Token Config
 */
interface TokenConfig {
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
     * Get error message
     * @param error
     */
    private static getErrorMessage(error: string | Error | any): string {
        if (typeof error === 'string') {
            return error;
        } else if (error.message) {
            return error.message;
        } else if (error.error) {
            return error.error;
        } else if (error.name) {
            return error.name;
        } else {
            console.error(error);
            return 'Unidentified error';
        }
    }

    /**
     * Split chunk
     * @param array
     * @param chunk
     */
    private static splitChunk<T>(array: T[], chunk: number): T[][] {
        const res: T[][] = [];
        let i: number;
        let j: number;
        for (i = 0, j = array.length; i < j; i += chunk) {
            res.push(array.slice(i, i + chunk));
        }
        return res;
    }

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
        root: IRootConfig,
        targetAccount: string,
        uuid: string,
        transactionMemo: string
    ) {
        const mintNFT = (metaData) =>
            workers.addRetryableTask(
                {
                    type: WorkerTaskType.MINT_NFT,
                    data: {
                        hederaAccountId: root.hederaAccountId,
                        hederaAccountKey: root.hederaAccountKey,
                        dryRun: false,
                        tokenId: token.tokenId,
                        supplyKey: token.supplyKey,
                        metaData,
                        transactionMemo,
                    },
                },
                1, 10
            );
        const transferNFT = (serials) =>
            {
                MintService.logger.debug(
                    `Transfer ${token?.tokenId} serials: ${JSON.stringify(serials)}`,
                    ['GUARDIAN_SERVICE', mintId.toString()]
                );
                return workers.addRetryableTask(
                    {
                        type: WorkerTaskType.TRANSFER_NFT,
                        data: {
                            hederaAccountId:
                                root.hederaAccountId,
                            hederaAccountKey:
                                root.hederaAccountKey,
                            dryRun: false,
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
        const mintAndTransferNFT = (metaData) =>
            mintNFT(metaData).then(transferNFT);
        const mintId = Date.now();
        MintService.log(`Mint(${mintId}): Start (Count: ${tokenValue})`);

        const workers = new Workers();
        const data = new Array<string>(Math.floor(tokenValue));
        data.fill(uuid);
        const dataChunks = MintService.splitChunk(data, 10);
        const tasks = MintService.splitChunk(
            dataChunks,
            MintService.BATCH_NFT_MINT_SIZE
        );
        for (let i = 0; i < tasks.length; i++) {
            const dataChunk = tasks[i];
            MintService.log(
                `Mint(${mintId}): Minting and transferring (Chunk: ${
                    i * MintService.BATCH_NFT_MINT_SIZE + 1
                }/${tasks.length * MintService.BATCH_NFT_MINT_SIZE})`
            );
            try {
                await Promise.all(dataChunk.map(mintAndTransferNFT));
            } catch (error) {
                MintService.error(
                    `Mint(${mintId}): Error (${MintService.getErrorMessage(error)})`,
                );
                throw error;
            }
        }

        MintService.log(
            `Mint(${mintId}): Minted (Count: ${Math.floor(tokenValue)})`
        );
        MintService.log(
            `Mint(${mintId}): Transferred ${token.treasuryId} -> ${targetAccount} `
        );
        MintService.log(`Mint(${mintId}): End`);
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
        root: IRootConfig,
        targetAccount: string,
        uuid: string,
        transactionMemo: string
    ) {
        const mintId = Date.now();
        MintService.log(`Mint(${mintId}): Start (Count: ${tokenValue})`);

        try {
            const workers = new Workers();
            await workers.addRetryableTask({
                type: WorkerTaskType.MINT_FT,
                data: {
                    hederaAccountId: root.hederaAccountId,
                    hederaAccountKey: root.hederaAccountKey,
                    dryRun: false,
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
                    dryRun: false,
                    tokenId: token.tokenId,
                    targetAccount,
                    treasuryId: token.treasuryId,
                    treasuryKey: token.treasuryKey,
                    tokenValue,
                    transactionMemo
                }
            }, 10);
        } catch (error) {
            MintService.error(`Mint FT(${mintId}): Mint/Transfer Error (${MintService.getErrorMessage(error)})`);
        }

        MintService.log(`Mint(${mintId}): End`);
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
        root: IRootConfig,
        token: Token,
        tokenValue: number,
        targetAccount: string,
        ids: string[]
    ): Promise<void> {
        const memo = ids.join(',');
        const tokenConfig: TokenConfig = {
            treasuryId: token.adminId,
            tokenId: token.tokenId,
            supplyKey: null,
            treasuryKey: null
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
            await MintService.mintNonFungibleTokens(
                tokenConfig, tokenValue, root, targetAccount, memo, memo
            );
        } else {
            await MintService.mintFungibleTokens(
                tokenConfig, tokenValue, root, targetAccount, memo, memo
            );
        }

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
     * Write log message
     * @param message
     */
    public static log(message: string) {
        MintService.logger.info(message, ['GUARDIAN_SERVICE']);
    }

    /**
     * Write error message
     * @param message
     */
    public static error(message: string) {
        MintService.logger.error(message, ['GUARDIAN_SERVICE']);
    }

    /**
     * Write warn message
     * @param message
     */
    public static warn(message: string) {
        MintService.logger.warn(message, ['GUARDIAN_SERVICE']);
    }
}
