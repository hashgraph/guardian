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
        return this.resolved(ctx.topicId);
    }
}
