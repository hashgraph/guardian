import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
} from 'typeorm';

@Entity('message_cache')
export class MessageCache {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    @Column({ type: 'varchar', length: 30, unique: true })
    consensusTimestamp: string;

    @Column({ type: 'varchar', length: 20 })
    topicId: string;

    @Index()
    @Column({ type: 'varchar', length: 20, default: 'LOADING' })
    status: string;

    @Column({ type: 'bigint' })
    lastUpdate: string;

    @Column({ type: 'text' })
    message: string;

    @Column({ type: 'int' })
    sequenceNumber: number;

    @Column({ type: 'varchar', length: 200, nullable: true })
    owner: string | null;

    @Index()
    @Column({ type: 'text', nullable: true })
    chunkId: string | null;

    @Column({ type: 'int', nullable: true })
    chunkNumber: number | null;

    @Column({ type: 'int', nullable: true })
    chunkTotal: number | null;

    @Index()
    @Column({ type: 'varchar', length: 50, nullable: true })
    type: string | null;

    @Column({ type: 'text', nullable: true })
    data: string | null;

    @Index()
    @Column({ type: 'timestamp', nullable: true })
    priorityDate: Date | null;

    @Column({ type: 'varchar', length: 20, nullable: true })
    priorityStatus: string | null;

    @Column({ type: 'timestamp', nullable: true })
    priorityStatusDate: Date | null;

    @Column({ type: 'bigint', nullable: true })
    priorityTimestamp: string | null;
}
