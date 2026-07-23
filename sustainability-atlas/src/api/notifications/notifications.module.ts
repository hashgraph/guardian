import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { NotificationEventsBus } from './notification-events-bus.service';
import { NotificationScanService } from './notification-scan.service';

/**
 * Notifications module — issuance-only watchlist notifications (Phase 1).
 *
 * Imports AuthModule for the guards (JwtAuthGuard, CsrfGuard). NetworkDataSourceRegistry
 * comes from the @Global NetworkDatabaseModule and SystemDataSource from the
 * @Global SystemDatabaseModule; ConfigService and RedisService are global too —
 * none of them need to be imported here.
 *
 * NotificationScanService is a plain provider (not a controller-backing
 * service) — its OnModuleInit hook starts the leader-elected per-network scan
 * loop as soon as this module is instantiated.
 */
@Module({
    imports: [AuthModule],
    controllers: [NotificationsController],
    providers: [
        NotificationsService,
        NotificationsRepository,
        NotificationEventsBus,
        NotificationScanService,
    ],
})
export class NotificationsModule {}
