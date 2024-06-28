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
            text: string;
            minVcCount?: number;
            minVpCount?: number;
            minTokensCount?: number;
            threshold?: number;
            owner?: string;
            blocks?: {
                hash: string;
                hashMap: any;
                threshold: number;
            };
        }
    ) {
        try {
            const {
                text,
                minVcCount,
                minVpCount,
                minTokensCount,
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
            if (text) {
                const keywords = text.split(' ');
                for (const keyword of keywords) {
                    filter.$and.push({
                        'analytics.textSearch': {
                            $regex: `.*${escapeStringRegexp(keyword).trim()}.*`,
                            $options: 'si',
                        },
                    });
                }
            }
            if (minVcCount || minVcCount === 0) {
                filter.$and.push({
                    'analytics.vcCount': { $gte: minVcCount }
                });
            }
            if (minVpCount || minVpCount === 0) {
                filter.$and.push({
                    'analytics.vpCount': { $gte: minVpCount }
                });
            }
            if (minTokensCount || minTokensCount === 0) {
                filter.$and.push({
                    'analytics.tokensCount': { $gte: minTokensCount }
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

            const messageIds = policies.map(p => p.consensusTimestamp);
            const tags = await em.find(Message, {
                type: MessageType.TAG,
                'options.target': { $in: messageIds }
            } as any);
            const mapTags = new Map<string, Set<string>>();
            for (const tag of tags) {
                if (mapTags.has(tag.options.target)) {
                    mapTags.get(tag.options.target).add(tag.options.name);
                } else {
                    mapTags.set(tag.options.target, new Set([tag.options.name]));
                }
            }

            const results = policies.map((row) => {
                const policyTags = mapTags.has(row.consensusTimestamp) ?
                    Array.from(mapTags.get(row.consensusTimestamp)) : [];
                return {
                    type: 'Global',
                    topicId: row.topicId,
                    uuid: row.options.uuid,
                    name: row.options.name,
                    description: row.options.description,
                    version: row.options.version,
                    status: 'PUBLISH',
                    messageId: row.consensusTimestamp,
                    owner: row.analytics.owner,
                    textSearch: row.analytics.textSearch,
                    registryId: row.analytics.registryId,
                    vcCount: row.analytics.vcCount,
                    vpCount: row.analytics.vpCount,
                    tokensCount: row.analytics.tokensCount,
                    rate: row.rate,
                    tags: policyTags
                }
            }).slice(0, 100);
            return new MessageResponse(results);
        } catch (error) {
            return new MessageError(error);
        }
    }
}
