import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from '@shared/config/configuration';

// Database
import { NetworkDataSourceRegistry } from './database/network-datasource.registry';

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

// Queue management
import { QueueRegistry } from './queues/queue.registry';
import { QueueEventsBus } from './queues/queue-events-bus.service';
import { GuardianSyncService } from './services/guardian-sync.service';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration],
        }),
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
        QueueRegistry,
        QueueEventsBus,
        GuardianSyncService,
    ],
})
export class ApiModule {}
