import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from '@shared/config/configuration';

// Database
import { NetworkDataSourceRegistry } from './database/network-datasource.registry';

// Controllers
import { RegistriesController } from './controllers/registries.controller';
import { MethodologiesController } from './controllers/methodologies.controller';
import { PolicySchemasController } from './controllers/policy-schemas.controller';
import { ProjectsController } from './controllers/project.controller';

// Services
import { RegistriesService } from './services/registries.service';
import { MethodologiesService } from './services/methodologies.service';
import { PolicySchemasService } from './services/policy-schemas.service';
import { ProjectsService } from './services/project.service';

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
        ProjectsController,
    ],
    providers: [
        NetworkDataSourceRegistry,
        RegistriesService,
        MethodologiesService,
        PolicySchemasService,
        ProjectsService,
    ],
})
export class ApiModule {}
