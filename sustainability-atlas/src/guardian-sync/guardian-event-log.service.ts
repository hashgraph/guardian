import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface GuardianEventLogRow {
    network: string;
    instanceId?: string | null;
    subject: string;
    refType?: string | null;
    refId?: string | null;
    action: string;
}

/**
 * Append-only audit writer for the guardian_event_log table. Records each
 * Guardian event the subscriber received and what the router triggered, purely
 * for observability. Best-effort: a write failure never affects the stream loop.
 * Prunes by retention (default 7 days) so the table cannot grow unbounded.
 */
@Injectable()
export class GuardianEventLogService {
    private readonly logger = new Logger(GuardianEventLogService.name);
    private readonly retentionDays = parseInt(
        process.env.GUARDIAN_EVENT_LOG_RETENTION_DAYS || '7', 10,
    );
    private writes = 0;

    constructor(private readonly dataSource: DataSource) {}

    async record(row: GuardianEventLogRow): Promise<void> {
        try {
            await this.dataSource.query(
                `INSERT INTO guardian_event_log
                    (network, "instanceId", subject, "refType", "refId", action)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    row.network,
                    row.instanceId ?? null,
                    row.subject,
                    row.refType ?? null,
                    row.refId ?? null,
                    row.action,
                ],
            );
            // Prune occasionally so the audit log can't grow without bound.
            if (++this.writes % 200 === 0) await this.prune();
        } catch (err) {
            this.logger.debug(
                `event-log record failed: ${err instanceof Error ? err.message : String(err)}`,
            );
        }
    }

    private async prune(): Promise<void> {
        try {
            await this.dataSource.query(
                `DELETE FROM guardian_event_log
                 WHERE "createdAt" < now() - ($1 || ' days')::interval`,
                [String(this.retentionDays)],
            );
        } catch {
            // ignore — retention is non-critical
        }
    }
}
