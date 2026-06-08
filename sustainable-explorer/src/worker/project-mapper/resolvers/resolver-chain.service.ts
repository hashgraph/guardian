import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreaker } from './circuit-breaker';
import { BaseProjectKeyResolver } from './base-resolver';
import { DynamicTopicResolver } from './dynamic-topic.resolver';
import { CsRefResolver } from './cs-ref.resolver';
import { RelationshipsResolver } from './relationships.resolver';
import { ProjectSchemaResolver } from './project-schema.resolver';
import { ResolutionContext, ResolutionOutcome, ResolvedProjectKey } from './resolver.types';

@Injectable()
export class ProjectKeyResolverChain {
    private readonly logger = new Logger(ProjectKeyResolverChain.name);
    private readonly chain: ReadonlyArray<{
        name: string;
        resolver: BaseProjectKeyResolver;
        breaker: CircuitBreaker;
    }>;

    constructor(
        m1: DynamicTopicResolver,
        m2: CsRefResolver,
        m3: RelationshipsResolver,
        m4: ProjectSchemaResolver,
    ) {
        const make = (name: string, resolver: BaseProjectKeyResolver) => ({
            name,
            resolver,
            breaker: new CircuitBreaker(name, 5, 30_000, this.logger),
        });
        this.chain = [
            make('M1:topic', m1),
            make('M2:csRef', m2),
            make('M3:relationships', m3),
            make('M4:projectSchema', m4),
        ];
    }

    /**
     * Runs the resolver chain M1→M4. First 'resolved' wins (short-circuit).
     * A 'reject' short-circuits to null (VC is skipped). A strategy that throws
     * is absorbed by its breaker as a 'pass' (the breaker logs the error), and the
     * chain continues. All-pass → null.
     */
    async resolve(ctx: ResolutionContext): Promise<ResolvedProjectKey | null> {
        const PASS: ResolutionOutcome = { status: 'pass' };
        for (const { name, resolver, breaker } of this.chain) {
            const outcome = await breaker.run(() => resolver.resolve(ctx), PASS);
            if (outcome.status === 'resolved') {
                return { projectKey: outcome.projectKey, method: outcome.method };
            }
            if (outcome.status === 'reject') {
                this.logger.debug(`${name} rejected projectKey for ts=${ctx.consensusTimestamp}: ${outcome.reason}`);
                return null;
            }
            // 'pass' → try next strategy
        }
        return null;
    }
}
