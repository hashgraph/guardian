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
        // terminus must land on a project-schema VC OR an already-known PROJECT row.
        // Roots that already key a PROJECT row are accepted even when their schema
        // isn't the designated project schema — Guardian policies often anchor the
        // chain on a registration doc (ELV case); requiring the project schema
        // force-dropped the whole lifecycle.
        //
        // Order-dependence note: the PROJECT row must exist before this resolver
        // is reached. Resolution passes are iterative, so on the first pass the
        // row may not exist yet and the mint will be deferred; on a later pass
        // (after the project view is built) this branch succeeds.
        if (ctx.policyHasProjectSchemaClassification && !ctx.isProjectSchemaVc) {
            const onProjectSchema = await this.isCsIdOnProjectSchema(resolvedKey, ctx.policyMapping);
            if (!onProjectSchema && !(await this.isKnownProjectRow(resolvedKey))) {
                return this.reject('cs.ref resolves to non-project-schema VC with no known project row');
            }
        }
        const rootVcTimestamp = await this.earliestTimestampForCsId(resolvedKey);
        return this.resolved(resolvedKey, { rootVcTimestamp });
    }
}
