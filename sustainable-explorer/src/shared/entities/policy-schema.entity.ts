import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    Unique,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('policy_schema')
@Unique(['policyTopicId', 'schemaId', 'schemaVersion'])
export class PolicySchema {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    @Index()
    @Column({ type: 'varchar', length: 30 })
    policyTopicId: string;

    @Index()
    @Column({ type: 'varchar', length: 30, nullable: true })
    messageConsensusTimestamp: string | null;

    @Index()
    @Column({ type: 'varchar', length: 120 })
    sourceCid: string;

    @Column({ type: 'varchar', length: 255 })
    schemaFile: string;

    @Index()
    @Column({ type: 'varchar', length: 255 })
    schemaId: string;

    @Column({ type: 'varchar', length: 50, default: '' })
    schemaVersion: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    name: string | null;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'jsonb', nullable: true })
    document: Record<string, unknown> | null;

    @Column({ type: 'jsonb' })
    rawSchema: Record<string, unknown>;

    @Index()
    @Column({ type: 'bigint' })
    lastUpdate: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
