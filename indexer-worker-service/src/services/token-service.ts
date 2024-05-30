import { EntityData, MongoDriver, MongoEntityManager } from '@mikro-orm/mongodb';
import { LogService } from './log-service.js';
import { HederaService } from '../loaders/hedera-service.js';
import { DataBaseHelper, Job, NftCache, NFT, TokenCache, Utils } from '@indexer/common';
import { TopicService } from './topic-service.js';

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

            const data: EntityData<TokenCache> = {};
            data.type = row.type;
            data.lastUpdate = Date.now();

            const info = await HederaService.getToken(row.tokenId);
            if (info && row.status !== 'UPDATED') {
                data.status = 'UPDATED';
                data.name = info.name;
                data.symbol = info.symbol;
                data.type = info.type;
                data.treasury = info.treasury_account_id;
                data.memo = info.memo;
                data.totalSupply = info.total_supply;
                data.decimals = info.decimals;
            }

            if (data.memo && row.status !== 'UPDATED') {
                await TopicService.addTopic(data.memo);
            }

            if (data.type === 'NON_FUNGIBLE_UNIQUE') {
                const nfts = await HederaService.getSerials(row.tokenId, row.serialNumber);
                if (!nfts) {
                    return;
                }
                if (nfts.nfts.length) {
                    const rowMessages = await TokenService.saveSerials(nfts.nfts);
                    if (!rowMessages) {
                        return;
                    }
                    data.serialNumber = nfts.nfts[nfts.nfts.length - 1].serial_number;
                    data.lastUpdate = Date.now();
                    data.hasNext = !!nfts.links.next;
                }
                await em.nativeUpdate(TokenCache, { tokenId: row.tokenId }, data);
            } else if (data.type === 'FUNGIBLE_COMMON') {
                await em.nativeUpdate(TokenCache, { tokenId: row.tokenId }, data);
            } else {
                await em.nativeUpdate(TokenCache, { tokenId: row.tokenId }, data);
            }
        } catch (error) {
            await LogService.error(error, 'update token');
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
                    hasNext: false,
                    name: '',
                    symbol: '',
                    type: '',
                    treasury: '',
                    memo: '',
                    totalSupply: 0
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

    public static async saveSerials(nfts: NFT[]): Promise<NftCache[]> {
        try {
            const em = DataBaseHelper.getEntityManager();
            const rows = [];
            for (const nft of nfts) {
                const row = await TokenService.insertSerial(nft, em);
                if (!row) {
                    return null;
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
    ): Promise<NftCache> {
        try {
            const row = em.create(NftCache, {
                tokenId: nft.token_id,
                serialNumber: nft.serial_number,
                metadata: atob(nft.metadata),
                lastUpdate: Date.now()
            });
            em.persist(row);
            await em.flush();
            return row;
        } catch (error) {
            return await em.findOne(NftCache, {
                tokenId: nft.token_id,
                serialNumber: nft.serial_number
            });
        }
    }
}
