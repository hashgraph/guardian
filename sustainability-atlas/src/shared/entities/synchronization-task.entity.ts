import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
} from 'typeorm';

@Entity('synchronization_task')
export class SynchronizationTask {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    taskName: string;

    @Column({ type: 'timestamp', default: () => 'now()' })
    date: Date;

    @Column({ type: 'timestamp', nullable: true })
    lastSyncedAt: Date | null;
}
