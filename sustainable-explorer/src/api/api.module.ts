import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from '@shared/config/configuration';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { AccountModule } from './account/account.module';

// Database
import { NetworkDataSourceRegistry } from './database/network-datasource.registry';
import { SystemDatabaseModule } from '@api/database/system-database.module';
import { RedisModule } from '@shared/redis/redis.module';

// Controllers
import { RegistriesController } from './controllers/registries.controller';
import { MethodologiesController } from './controllers/methodologies.controller';
import { PolicySchemasController } from './controllers/policy-schemas.controller';
import { PoliciesController } from './controllers/policies.controller';
import { ProjectsController } from './controllers/project.controller';
import { CreditsController } from './controllers/credits.controller';
import { QueueStatusController } from './controllers/queue-status.controller';
import { GuardianSyncController } from './controllers/guardian-sync.controller';
import { SdgsController } from './controllers/sdgs.controller';
import { DevelopersController } from './controllers/developers.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { PortfolioController } from './controllers/portfolio.controller';
import { ExportsController } from './controllers/exports.controller';
import { ImpactSummaryController } from './controllers/impact-summary.controller';

// Services
import { RegistriesService } from './services/registries.service';
import { MethodologiesService } from './services/methodologies.service';
import { MappingReprocessService } from './services/mapping-reprocess.service';
import { PolicySchemasService } from './services/policy-schemas.service';
import { PoliciesService } from './services/policies.service';
import { ProjectsService } from './services/project.service';
import { ProjectExportService } from './services/project-export.service';
import { CreditsService } from './services/credits.service';
import { SdgsService } from './services/sdgs.service';
import { DevelopersService } from './services/developers.service';
import { DashboardService } from './services/dashboard.service';
import { PortfolioStatsService } from './services/portfolio-stats.service';
import { ExportsService } from './services/exports.service';
import { ImpactSummaryService } from './services/impact-summary.service';

// Queue management
import { QueueRegistry } from './queues/queue.registry';
import { QueueEventsBus } from './queues/queue-events-bus.service';
import { GuardianSyncService } from './services/guardian-sync.service';
import { IpfsService } from '@worker/services/ipfs.service';
import { POLICY_ZIP_STORAGE } from '@worker/services/storage/policy-zip-storage.interface';
import { LocalPolicyZipStorage } from '@worker/services/storage/local-policy-zip-storage.service';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration],
        }),
        SystemDatabaseModule,
        RedisModule,
        AuthModule,
        AdminModule,
        AccountModule,
    ],
    controllers: [
        RegistriesController,
        MethodologiesController,
        PolicySchemasController,
        PoliciesController,
        ProjectsController,
        CreditsController,
        QueueStatusController,
        GuardianSyncController,
        SdgsController,
        DevelopersController,
        DashboardController,
        PortfolioController,
        ExportsController,
        ImpactSummaryController,
    ],
    providers: [
        NetworkDataSourceRegistry,
        RegistriesService,
        MethodologiesService,
        MappingReprocessService,
        PolicySchemasService,
        PoliciesService,
        ProjectsService,
        ProjectExportService,
        CreditsService,
        SdgsService,
        DevelopersService,
        DashboardService,
        PortfolioStatsService,
        ExportsService,
        ImpactSummaryService,
        QueueRegistry,
        QueueEventsBus,
        GuardianSyncService,
        IpfsService,
        { provide: POLICY_ZIP_STORAGE, useClass: LocalPolicyZipStorage },
    ],
})
export class ApiModule {}
