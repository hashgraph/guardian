import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('message')
@Index(['type', 'action'])
@Index(['type', 'topicId'])
export class Message {
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id: string;

    @Column({ type: 'varchar', length: 30, unique: true })
    consensusTimestamp: string;

    @Index()
    @Column({ type: 'varchar', length: 20 })
    topicId: string;

    @Index()
    @Column({ type: 'varchar', length: 200, nullable: true })
    owner: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    uuid: string | null;

    @Index()
    @Column({ type: 'varchar', length: 50 })
    type: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    action: string | null;

    @Index()
    @Column({ type: 'varchar', length: 50, nullable: true })
    status: string | null;

    @Column({ type: 'text', nullable: true })
    statusReason: string | null;

    @Column({ type: 'text', nullable: true })
    statusMessage: string | null;

    @Column({ type: 'varchar', length: 10, nullable: true })
    lang: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true })
    responseType: string | null;

    @Column({ type: 'int', nullable: true })
    sequenceNumber: number | null;

    @Column({ type: 'text', array: true, nullable: true })
    files: string[] | null;

    @Column({ type: 'jsonb', nullable: true })
    documents: Record<string, unknown> | null;

    @Column({ type: 'jsonb', nullable: true })
    options: Record<string, unknown> | null;

    @Column({ type: 'text', array: true, nullable: true })
    topics: string[] | null;

    @Column({ type: 'text', array: true, nullable: true })
    tokens: string[] | null;

    @Column({ type: 'varchar', length: 20, default: 'mirror_node' })
    dataSource: string;

    @Index()
    @Column({ type: 'bigint' })
    lastUpdate: string;

    @Column({ type: 'bigint', nullable: true })
    analyticsUpdate: string | null;

    @Column({ type: 'tsvector', nullable: true, select: false })
    searchVector: string | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
