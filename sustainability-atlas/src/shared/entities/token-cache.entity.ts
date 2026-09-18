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

    /** Highest TOKENMINT consensus timestamp already ingested into token_mint_tx
     *  for this token. Fungible tokens only — non-fungible mints are tracked by
     *  serial via `serialNumber`. Declared here as well as in bootstrapSchema
     *  because worker synchronize would otherwise drop the column. */
    @Column({ type: 'varchar', length: 30, nullable: true })
    mintTxWatermark: string | null;

    /** Highest CRYPTOTRANSFER consensus timestamp already scanned for this
     *  token's treasury. Non-fungible tokens only — fungible balances can't be
     *  attributed to the mint that created them. Declared here as well as in
     *  bootstrapSchema so worker synchronize doesn't drop it. */
    @Column({ type: 'varchar', length: 30, nullable: true })
    transferTxWatermark: string | null;

    @Column({ type: 'timestamp', nullable: true })
    priorityDate: Date | null;

    @Column({ type: 'varchar', length: 20, nullable: true })
    priorityStatus: string | null;

    @Column({ type: 'timestamp', nullable: true })
    priorityStatusDate: Date | null;

    @Column({ type: 'bigint', nullable: true })
    priorityTimestamp: string | null;
}
