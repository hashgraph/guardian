import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
} from 'typeorm';

@Entity('topic_cache')
export class TopicCache {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    @Column({ type: 'varchar', length: 20, unique: true })
    topicId: string;

    @Column({ type: 'varchar', length: 20 })
    status: string;

    @Column({ type: 'bigint' })
    lastUpdate: string;

    @Column({ type: 'int', default: 0 })
    messages: number;

    @Column({ type: 'boolean', default: false })
    hasNext: boolean;

    @Column({ type: 'timestamp', nullable: true })
    priorityDate: Date | null;

    @Column({ type: 'varchar', length: 20, nullable: true })
    priorityStatus: string | null;

    @Column({ type: 'timestamp', nullable: true })
    priorityStatusDate: Date | null;

    @Column({ type: 'bigint', nullable: true })
    priorityTimestamp: string | null;
}
