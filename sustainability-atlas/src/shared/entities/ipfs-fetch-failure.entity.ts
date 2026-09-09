import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('ipfs_fetch_failure')
export class IpfsFetchFailure {
    @PrimaryColumn({ type: 'text' })
    cid: string;

    @Column({ type: 'text' })
    lastError: string;

    @Column({ type: 'varchar', length: 20, default: 'unknown' })
    errorCategory: 'transient' | 'permanent' | 'unknown';

    @Column({ type: 'int', default: 0 })
    attemptCount: number;

    @Column({ type: 'int', default: 0 })
    manualRetryCount: number;

    @Column({ type: 'timestamptz' })
    firstFailedAt: Date;

    @Column({ type: 'timestamptz' })
    lastFailedAt: Date;

    @Column({ nullable: true, type: 'text' })
    messageTimestamp: string | null;
}
