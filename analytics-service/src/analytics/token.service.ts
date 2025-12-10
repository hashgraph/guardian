import {
    DatabaseServer,
    Message,
    MessageType,
    TagMessage,
} from '@guardian/common';
import { AnalyticsStatus as Status } from '../entity/analytics-status.js';
import { AnalyticsTag as Tag } from '../entity/analytics-tag.js';
import { AnalyticsToken as Token } from '../entity/analytics-token.js';
import { AnalyticsTokenCache as TokenCache } from '../entity/analytics-token-cache.js';
import { ReportStatus } from '../interfaces/report-status.type.js';
import { ReportSteep } from '../interfaces/report-steep.type.js';
import { Tasks } from '../helpers/tasks.js';
import { AnalyticsUtils } from '../helpers/utils.js';

/**
 * Search tokens info
 */
export class AnalyticsTokenService {
    /**
     * Number of processes
     */
    private static readonly CHUNKS_COUNT = 10;

    /**
     * Parse token messages
     * @param message
     */
    private static parsTagMessage(message: any): Message {
        try {
            if (typeof message.message !== 'string' || !message.message.startsWith('{')) {
                return;
            }
            const json = JSON.parse(message.message);
            let item: Message;
            if (json.type === MessageType.Tag) {
                item = TagMessage.fromMessageObject(json);
            }
            if (item && item.validate()) {
                item.setPayer(message.payer_account_id);
                item.setIndex(message.sequence_number);
                item.setId(message.id);
                item.setTopicId(message.topicId);
                return item;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Get token cache
     * @param uuid
     * @param tokenId
     * @param skip
     */
    public static async getTokenCache(uuid: string, tokenId: string, skip: boolean = false): Promise<TokenCache | null> {
        const databaseServer = new DatabaseServer();

        const tokenCache = await databaseServer.findOne(TokenCache, { uuid, tokenId });

        if (tokenCache) {
            if (skip) {
                return null;
            }
            return tokenCache;
        } else {
            return databaseServer.create(TokenCache, {
                uuid,
                tokenId,
                balance: 0
            });
        }
    }

    /**
     * Update token cache
     * @param tokenCache
     */
    public static async updateTokenCache(tokenCache: TokenCache): Promise<TokenCache> {
        return await new DatabaseServer().save(TokenCache, tokenCache);
    }

    /**
     * Search token balance by tokenId
     * @param report
     * @param token
     * @param skip
     */
    public static async searchBalanceByToken(
        report: Status,
        token: Token,
        skip: boolean = false
    ): Promise<Status> {
        try {
            const tokenCache = await AnalyticsTokenService.getTokenCache(report.uuid, token.tokenId, skip);
            if (!tokenCache) {
                return report;
            }
            let error: any;
            let balance: number = tokenCache.balance;
            let topicId: string = tokenCache.topicId;
            try {
                const data = await AnalyticsUtils.getTokenInfo(token.tokenId);
                if (data) {
                    balance = parseFloat(data.total_supply);
                    topicId = String(data.memo);
                } else {
                    error = new Error('Invalid token info');
                }
            } catch (e) {
                error = e;
            }
            tokenCache.balance = balance;
            tokenCache.topicId = topicId;

            await AnalyticsTokenService.updateTokenCache(tokenCache);

            if (error) {
                report.error = String(error);
                return report;
            } else {
                return report;
            }
        } catch (e) {
            report.error = String(e);
            return report;
        }
    }

    /**
     * Search token information by tokenId
     * @param report
     * @param token
     * @param skip
     */
    public static async searchTagByToken(
        report: Status,
        token: TokenCache,
        skip: boolean = false
    ): Promise<Status> {
        try {
            return await AnalyticsUtils.searchMessages(report, token.topicId, skip, async (message) => {
                const data: any = AnalyticsTokenService.parsTagMessage(message);
                if (data) {
                    if (data.type === MessageType.Tag) {
                        const row = {
                                uuid: report.uuid,
                                root: report.root,
                                account: data.payer,
                                timeStamp: data.id,
                                tagUUID: data.uuid,
                                name: data.name,
                                description: data.description,
                                owner: data.owner,
                                target: data.target,
                                operation: data.operation,
                                entity: data.entity,
                                date: data.date,
                                action: data.action
                        };
                        const databaseServer = new DatabaseServer();

                        const entity = await databaseServer.create(Tag, row);

                        await databaseServer.save(Tag, entity);
                    }
                }
            });
        } catch (error) {
            report.error = String(error);
            return report;
        }
    }

    /**
     * Search token information by tokenIds
     * @param report
     * @param skip
     */
    public static async search(report: Status, skip: boolean = false): Promise<Status> {
        await AnalyticsUtils.updateStatus(report, ReportSteep.TOKENS, ReportStatus.PROGRESS);

        const databaseServer = new DatabaseServer();

        //Balance
        const row = await databaseServer.find(Token, {
            uuid: report.uuid
        });
        const tokens = AnalyticsUtils.unique(row, 'tokenId')
        AnalyticsUtils.updateProgress(report, tokens.length);

        const task = async (token: Token): Promise<void> => {
            await AnalyticsTokenService.searchBalanceByToken(report, token, skip);
            AnalyticsUtils.updateProgress(report);
        }
        const tasks = new Tasks(tokens, task);
        await tasks.run(AnalyticsTokenService.CHUNKS_COUNT);

        //Tags
        const row2 = await databaseServer.find(TokenCache, {
            uuid: report.uuid
        });

        AnalyticsUtils.updateProgress(report, row2.length);

        const task2 = async (token: TokenCache): Promise<void> => {
            await AnalyticsTokenService.searchTagByToken(report, token, skip);
            AnalyticsUtils.updateProgress(report);
        }
        const tasks2 = new Tasks(row2, task2);
        await tasks2.run(AnalyticsTokenService.CHUNKS_COUNT);

        return report;
    }
}
