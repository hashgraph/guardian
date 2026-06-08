import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TopicClassifierService } from '../topic-classifier';
import { BaseProjectKeyResolver } from './base-resolver';
import { ResolutionContext, ResolutionOutcome } from './resolver.types';

@Injectable()
export class ProjectSchemaResolver extends BaseProjectKeyResolver {
    protected readonly method = 'projectSchema';

    constructor(dataSource: DataSource, topicClassifier: TopicClassifierService) {
        super(dataSource, topicClassifier);
    }

    async resolve(ctx: ResolutionContext): Promise<ResolutionOutcome> {
        if (ctx.isProjectSchemaVc) return this.resolved(ctx.csId);
        if (ctx.policyHasProjectSchemaClassification) {
            return this.reject('not the project schema, no cs.ref/ancestor');
        }
        return this.pass();
    }
}
