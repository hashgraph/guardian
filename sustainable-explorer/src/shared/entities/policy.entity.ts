import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    Unique,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export type PolicyDecodeStatus = 'pending' | 'decoded' | 'failed';
export type PolicyMappingSource = 'auto' | 'manual';

@Entity('policy')
@Unique('uq_policy_policy_id', ['policyId'])
@Unique('uq_policy_source_cid', ['sourceCid'])
export class Policy {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    // Populated post-decode from policy.json. Null while a row is reserved
    // pending its first successful decode — multiple null rows are allowed
    // under UNIQUE.
    @Column({ type: 'varchar', length: 64, nullable: true })
    policyId: string | null;

    @Column({ type: 'varchar', length: 32, nullable: true })
    version: string | null;

    @Index('idx_policy_topic_id')
    @Column({ type: 'varchar', length: 20 })
    policyTopicId: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    instanceTopicId: string | null;

    @Column({ type: 'varchar', length: 100 })
    sourceCid: string;

    @Column({ type: 'jsonb', nullable: true })
    rawPolicyJson: Record<string, unknown> | null;

    // { iri: schemaDoc }
    @Column({ type: 'jsonb', nullable: true })
    rawSchemaJson: Record<string, unknown> | null;

    // { tokenId: tokenDoc }
    @Column({ type: 'jsonb', nullable: true })
    rawTokensJson: Record<string, unknown> | null;

    @Column({ type: 'jsonb', nullable: true })
    rawTagsJson: Record<string, unknown> | null;

    // Grouped by PROJECT_EXTRACT_FIELDS name.
    // Manual edits land here and are preserved across /reparse-projects but
    // overwritten by /redecode.
    @Column({ type: 'jsonb', nullable: true })
    policyMapping: Record<string, unknown> | null;

    // System-owned flattened representation. Regenerated on every decode.
    @Column({ type: 'jsonb', nullable: true })
    schemaFields: Record<string, unknown> | null;

    @Index('idx_policy_decode_status')
    @Column({ type: 'varchar', length: 16, default: 'pending' })
    decodeStatus: PolicyDecodeStatus;

    // 'manual' after an admin PATCHes policyMapping via updateMapping;
    // reset to 'auto' whenever a fresh decode overwrites policyMapping.
    @Column({ type: 'varchar', length: 16, default: 'auto' })
    mappingSource: PolicyMappingSource;

    @Column({ type: 'text', nullable: true })
    error: string | null;

    @Column({ type: 'int', default: 0 })
    attempts: number;

    @Column({ type: 'timestamptz', nullable: true })
    lastAttemptAt: Date | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
