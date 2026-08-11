import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    CreateDateColumn,
} from 'typeorm';

/**
 * Append-only audit of the Guardian Application-Events the guardian-sync process
 * received and what it triggered. Observability only — NOT a source of truth and
 * NOT read by the mapping pipeline (events are triggers; the canonical rows come
 * from the mirror node). Pruned by retention so it cannot grow unbounded.
 */
@Entity('guardian_event_log')
@Index('idx_guardian_event_log_network_created', ['network', 'createdAt'])
export class GuardianEventLog {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    @Column({ type: 'varchar', length: 60 })
    network: string;

    @Column({ type: 'varchar', length: 120, nullable: true })
    instanceId: string | null;

    @Index('idx_guardian_event_log_subject')
    @Column({ type: 'varchar', length: 120 })
    subject: string;

    /** What the event referenced: 'policy' | 'token' | 'cid' | 'topic' | null. */
    @Column({ type: 'varchar', length: 20, nullable: true })
    refType: string | null;

    @Column({ type: 'varchar', length: 120, nullable: true })
    refId: string | null;

    /** What guardian-sync did: e.g. 'topic-sync 0.0.x', 'ipfs-fetch', 'ignored'. */
    @Column({ type: 'varchar', length: 200 })
    action: string;

    @CreateDateColumn()
    createdAt: Date;
}
