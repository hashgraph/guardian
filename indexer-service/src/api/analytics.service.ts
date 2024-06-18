import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
    IndexerMessageAPI,
    MessageResponse,
    MessageError,
    DataBaseHelper,
    Message
} from '@indexer/common';
import escapeStringRegexp from 'escape-string-regexp';
import { MessageAction, MessageType } from '@indexer/interfaces';
import { HashComparator } from '../analytics/index.js';

@Controller()
export class AnalyticsService {
    @MessagePattern(IndexerMessageAPI.GET_ANALYTICS_SEARCH_POLICY)
    async search(
        @Payload()
        msg: {
            search: string;
            minVC?: number;
            minVP?: number;
            minTokens?: number;
            owner?: string;
            hash?: string;
            blocks?: {
                hash: string;
                hashMap: any;
                threshold: number;
            };
        }
    ) {
        try {
            const {
                search,
                minVC,
                minVP,
                minTokens,
                owner,
                blocks
            } = msg;
            const em = DataBaseHelper.getEntityManager();
            const filter: any = {
                $and: [{
                    type: MessageType.INSTANCE_POLICY,
                    action: MessageAction.PublishPolicy,
                    analytics: { $exists: true }
                }],
            };
            if (search) {
                const keywords = search.split(' ');
                for (const keyword of keywords) {
                    filter.$and.push({
                        'analytics.textSearch': {
                            $regex: `.*${escapeStringRegexp(keyword).trim()}.*`,
                            $options: 'si',
                        },
                    });
                }
            }
            if (minVC) {
                filter.$and.push({
                    'analytics.vcCount': { $gte: minVC }
                });
            }
            if (minVP) {
                filter.$and.push({
                    'analytics.vpCount': { $gte: minVP }
                });
            }
            if (minTokens) {
                filter.$and.push({
                    'analytics.tokensCount': { $gte: minTokens }
                });
            }
            if (owner) {
                filter.$and.push({
                    'analytics.owner': owner
                });
            }
            let policies: any[] = await em.find(Message, filter);

            if (blocks) {
                for (const policy of policies) {
                    try {
                        policy.rate = HashComparator.compare(blocks, policy.analytics); 
                    } catch (error) {
                        policy.rate = -1;
                    }
                }
                policies = policies.filter((policy) => policy.rate >= blocks.threshold);
                policies.sort((a, b) => a.rate > b.rate ? -1 : 1);
            }

            const results = policies.map((row) => {
                return Object.assign({}, row.options, {
                    messageId: row.consensusTimestamp,
                    owner: row.analytics.owner,
                    textSearch: row.analytics.textSearch,
                    registryId: row.analytics.registryId,
                    vcCount: row.analytics.vcCount,
                    vpCount: row.analytics.vpCount,
                    tokensCount: row.analytics.tokensCount,
                    rate: row.rate,
                    tags: row.analytics.tags,
                });
            }).slice(0, 100);
            return new MessageResponse(results);
        } catch (error) {
            return new MessageError(error);
        }
    }
}
