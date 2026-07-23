import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
} from 'typeorm';

@Entity('token_cache')
export class TokenCache {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    @Column({ type: 'varchar', length: 30, unique: true })
    tokenId: string;

    @Column({ type: 'varchar', length: 30 })
    status: string;

    @Column({ type: 'bigint' })
    lastUpdate: string;

    @Column({ type: 'int', default: 0 })
    serialNumber: number;

    @Column({ type: 'boolean', default: false })
    hasNext: boolean;

    @Column({ type: 'varchar', length: 500, nullable: true })
    name: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    symbol: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true })
    type: string | null;

    @Index()
    @Column({ type: 'varchar', length: 30, nullable: true })
    treasury: string | null;

    @Column({ type: 'text', nullable: true })
    memo: string | null;

    @Column({ type: 'decimal', nullable: true })
    totalSupply: string | null;

    @Column({ type: 'int', nullable: true })
    decimals: number | null;

    @Column({ type: 'timestamp', nullable: true })
    priorityDate: Date | null;

    @Column({ type: 'varchar', length: 20, nullable: true })
    priorityStatus: string | null;

    @Column({ type: 'timestamp', nullable: true })
    priorityStatusDate: Date | null;

    @Column({ type: 'bigint', nullable: true })
    priorityTimestamp: string | null;
}
