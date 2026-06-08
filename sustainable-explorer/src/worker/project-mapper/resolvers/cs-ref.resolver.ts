import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TopicClassifierService } from '../topic-classifier';
import { BaseProjectKeyResolver } from './base-resolver';
import { ResolutionContext, ResolutionOutcome } from './resolver.types';

@Injectable()
export class CsRefResolver extends BaseProjectKeyResolver {
    protected readonly method = 'csRef';

    constructor(dataSource: DataSource, topicClassifier: TopicClassifierService) {
        super(dataSource, topicClassifier);
    }

    async resolve(ctx: ResolutionContext): Promise<ResolutionOutcome> {
        if (!ctx.csRef) return this.pass();
        const refWalked = await this.resolveViaRef(ctx.consensusTimestamp, ctx.csId);
        const resolvedKey = refWalked?.projectKey ?? ctx.csRef;
        // Classified policy + this VC isn't itself the project schema → the chain
        // terminus must land on a project-schema VC, else this references an
        // intermediate artifact and must not seed a project.
        if (ctx.policyHasProjectSchemaClassification && !ctx.isProjectSchemaVc) {
            const onProjectSchema = await this.isCsIdOnProjectSchema(resolvedKey, ctx.policyMapping);
            if (!onProjectSchema) {
                return this.reject('cs.ref resolves to non-project-schema VC');
            }
        }
        return this.resolved(resolvedKey);
    }
}
