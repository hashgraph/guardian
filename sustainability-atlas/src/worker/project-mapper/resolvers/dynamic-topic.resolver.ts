import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TopicClassifierService } from '../topic-classifier';
import { BaseProjectKeyResolver } from './base-resolver';
import { ResolutionContext, ResolutionOutcome } from './resolver.types';

// NO over-merge guard is intentional — one Guardian dynamic topic == one
// project; collapsing all VCs on it into one key is the whole point.
@Injectable()
export class DynamicTopicResolver extends BaseProjectKeyResolver {
    protected readonly method = 'topic';

    constructor(dataSource: DataSource, topicClassifier: TopicClassifierService) {
        super(dataSource, topicClassifier);
    }

    async resolve(ctx: ResolutionContext): Promise<ResolutionOutcome> {
        const classification = await this.topicClassifier.classifyTopic(this.dataSource, ctx.topicId);
        if (classification.kind !== 'dynamic-project') return this.pass();
        // Key by the topic's canonical project cs.id (uniform cs.id keys across
        // all methods); record the dynamic topic in metadata. Every VC in the
        // topic resolves to the same canonical cs.id, so they still merge.
        const csId = (await this.canonicalCsIdInTopic(ctx.topicId, ctx.policyMapping)) ?? ctx.csId;
        return this.resolved(csId, { dynamicTopicId: ctx.topicId });
    }
}
