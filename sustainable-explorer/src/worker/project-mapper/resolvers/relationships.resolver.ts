import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TopicClassifierService } from '../topic-classifier';
import { BaseProjectKeyResolver } from './base-resolver';
import { ResolutionContext, ResolutionOutcome } from './resolver.types';

@Injectable()
export class RelationshipsResolver extends BaseProjectKeyResolver {
    protected readonly method = 'relationships';

    constructor(dataSource: DataSource, topicClassifier: TopicClassifierService) {
        super(dataSource, topicClassifier);
    }

    async resolve(ctx: ResolutionContext): Promise<ResolutionOutcome> {
        // Project-schema VCs ARE the root; M4 keys them by their own cs.id.
        if (ctx.isProjectSchemaVc) return this.pass();
        const walked = await this.resolveViaRelationships(ctx.consensusTimestamp, ctx.csId);
        if (!walked.walked) return this.pass();
        // Gate: only accept when confirmProjectKey independently verifies the
        // ancestor. If unconfirmed, PASS (do NOT reject) so M4 can decide —
        // an ungated relationships walk can mis-key (e.g. VVB chains).
        const confirmed = await this.confirmProjectKey(walked.projectKey, ctx.policyMapping);
        if (!confirmed) return this.pass();
        return this.resolved(confirmed);
    }
}
