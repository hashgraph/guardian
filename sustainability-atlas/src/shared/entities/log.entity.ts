import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    CreateDateColumn,
} from 'typeorm';

@Entity('logs')
export class Log {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    @Column({ type: 'text', nullable: true })
    error: string | null;

    @Index()
    @Column({ type: 'varchar', length: 100, nullable: true })
    tag: string | null;

    @CreateDateColumn()
    createdAt: Date;
}
