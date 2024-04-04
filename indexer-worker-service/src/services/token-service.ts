import { MongoDriver, MongoEntityManager } from '@mikro-orm/mongodb';
import { LogService } from './log-service.js';
import { HederaService } from '../loaders/hedera-service.js';
import { DataBaseHelper, Job, NFTCache, NFT, TokenCache, Utils } from '@indexer/common';

export class TokenService {
    public static CYCLE_TIME: number = 0;

    public static async updateToken(job: Job) {
        try {
            const em = DataBaseHelper.getEntityManager();
            const row = await TokenService.randomToken(em);
            if (!row) {
                job.sleep();
                return;
            }

            const data = await HederaService.getSerials(row.tokenId, row.serialNumber);

            if (data && data.nfts.length) {
                const rowMessages = await TokenService.saveSerials(data.nfts);
                if (rowMessages) {
                    await em.nativeUpdate(TokenCache, { tokenId: row.tokenId }, {
                        serialNumber: data.nfts[data.nfts.length - 1].serial_number,
                        lastUpdate: Date.now(),
                        hasNext: !!data.links.next
                    });
                }
            }

        } catch (error) {
            await LogService.error(error, 'update topic');
        }
    }

    public static async addToken(tokenId: string): Promise<boolean> {
        try {
            const em = DataBaseHelper.getEntityManager();
            const old = await em.findOne(TokenCache, { tokenId });
            if (!old) {
                await em.persistAndFlush(em.create(TokenCache, {
                    tokenId,
                    status: '',
                    lastUpdate: 0,
                    serialNumber: 0,
                    hasNext: false
                }));
                return true;
            } else {
                return false;
            }
        } catch (error) {
            await LogService.error(error, 'add topic');
            return false;
        }
    }

    public static async addTokens(tokenIds: Iterable<string>): Promise<void> {
        for (const tokenId of tokenIds) {
            if (tokenId && typeof tokenId === 'string' && Utils.isToken(tokenId)) {
                await TokenService.addToken(tokenId);
            }
        }
    }

    private static async randomToken(em: MongoEntityManager<MongoDriver>): Promise<TokenCache> {
        const delay = Date.now() - TokenService.CYCLE_TIME;
        const rows = await em.find(TokenCache,
            {
                $or: [
                    { lastUpdate: { $lt: delay } },
                    { hasNext: true }
                ]
            },
            {
                limit: 50
            }
        )
        const index = Math.min(Math.floor(Math.random() * rows.length), rows.length - 1);
        const row = rows[index];

        if (!row) {
            return null;
        }

        const now = Date.now();
        const count = await em.nativeUpdate(TokenCache, {
            tokenId: row.tokenId,
            $or: [
                { lastUpdate: { $lt: delay } },
                { hasNext: true }
            ]
        }, {
            serialNumber: row.serialNumber,
            lastUpdate: now,
            hasNext: false
        });

        if (count) {
            return row;
        } else {
            return null;
        }
    }

    public static async saveSerials(nfts: NFT[]): Promise<NFTCache[]> {
        try {
            const em = DataBaseHelper.getEntityManager();
            const rows = [];
            for (const nft of nfts) {
                const row = await TokenService.insertSerial(nft, em);
                if (!row) {
                    return;
                }
                rows.push(row);
            }
            return rows;
        } catch (error) {
            await LogService.error(error, 'save message');
            return null;
        }
    }

    public static async insertSerial(
        nft: NFT,
        em: MongoEntityManager<MongoDriver>
    ): Promise<NFTCache> {
        try {
            const row = em.create(NFTCache, {
                tokenId: nft.token_id,
                serialNumber: nft.serial_number,
                metadata: nft.metadata,
                lastUpdate: Date.now()
            });
            em.persist(row);
            await em.flush();
            return row;
        } catch (error) {
            return await em.findOne(NFTCache, {
                tokenId: nft.token_id,
                serialNumber: nft.serial_number
            });
        }
    }
}
