import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type TopicKind = 'dynamic-project' | 'instance' | 'other';

export interface TopicClassification {
    kind: TopicKind;
    name: string | null;
    instancePolicyTopicId: string | null;
}

@Injectable()
export class TopicClassifierService {
    // in-process cache keyed by topicId. Only DEFINITIVE results are cached
    // (kind !== 'other' || instancePolicyTopicId !== null), because an 'other'
    // result with a null instancePolicyTopicId can be a TEMPORARY miss caused by
    // ingest ordering (the parent Topic / Instance-Policy message not synced yet).
    private readonly cache = new Map<string, TopicClassification>();

    async classifyTopic(dataSource: DataSource, topicId: string): Promise<TopicClassification> {
        if (this.cache.has(topicId)) {
            return this.cache.get(topicId)!;
        }

        // Step 2 — instance check first
        if (await this.isInstanceTopic(dataSource, topicId)) {
            const result: TopicClassification = { kind: 'instance', name: null, instancePolicyTopicId: topicId };
            this.cacheIfDefinitive(topicId, result);
            return result;
        }

        // Step 3 — load this topic's own Topic message
        const rows: Array<{ parent_id: string | null; name: string | null }> = await dataSource.query(
            `SELECT options->>'parentId' AS parent_id, options->>'name' AS name
             FROM message
             WHERE type = 'Topic' AND "topicId" = $1 AND options->>'parentId' IS NOT NULL
             ORDER BY "consensusTimestamp" ASC
             LIMIT 1`,
            [topicId],
        );

        const parentId = rows.length > 0 ? rows[0].parent_id : null;
        const name = rows.length > 0 ? rows[0].name : null;

        // Step 4 — dynamic-project check
        if (parentId !== null && name !== null && /project/i.test(name)) {
            const instanceAncestor = await this.findAncestorInstanceTopic(dataSource, parentId);
            if (instanceAncestor !== null) {
                const result: TopicClassification = {
                    kind: 'dynamic-project',
                    name,
                    instancePolicyTopicId: instanceAncestor,
                };
                this.cacheIfDefinitive(topicId, result);
                return result;
            }
        }

        // Step 5 — default: other (not cached when instancePolicyTopicId is null)
        const result: TopicClassification = { kind: 'other', name, instancePolicyTopicId: null };
        this.cacheIfDefinitive(topicId, result);
        return result;
    }

    private async isInstanceTopic(dataSource: DataSource, topicId: string): Promise<boolean> {
        const rows: unknown[] = await dataSource.query(
            `SELECT 1 FROM message
             WHERE type = 'Instance-Policy' AND options->>'instanceTopicId' = $1
             LIMIT 1`,
            [topicId],
        );
        return rows.length > 0;
    }

    // Checks startTopicId itself first, then walks up via Topic.options->>'parentId'.
    // Bounded to 12 hops with a visited-set loop guard.
    private async findAncestorInstanceTopic(dataSource: DataSource, startTopicId: string): Promise<string | null> {
        const visited = new Set<string>();
        let current: string = startTopicId;
        let hops = 0;

        while (hops < 12) {
            if (visited.has(current)) break;
            visited.add(current);

            if (await this.isInstanceTopic(dataSource, current)) {
                return current;
            }

            // Walk one level up
            const rows: Array<{ parent_id: string | null }> = await dataSource.query(
                `SELECT options->>'parentId' AS parent_id
                 FROM message
                 WHERE type = 'Topic' AND "topicId" = $1
                 LIMIT 1`,
                [current],
            );

            const nextParent = rows.length > 0 ? rows[0].parent_id : null;
            if (nextParent === null) break;

            current = nextParent;
            hops++;
        }

        return null;
    }

    private cacheIfDefinitive(topicId: string, classification: TopicClassification): void {
        if (classification.kind !== 'other' || classification.instancePolicyTopicId !== null) {
            this.cache.set(topicId, classification);
        }
    }
}
