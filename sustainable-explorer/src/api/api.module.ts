import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from '@shared/config/configuration';

// Database
import { NetworkDataSourceRegistry } from './database/network-datasource.registry';

// Controllers
import { RegistriesController } from './controllers/registries.controller';
import { MethodologiesController } from './controllers/methodologies.controller';

// Services
import { RegistriesService } from './services/registries.service';
import { MethodologiesService } from './services/methodologies.service';

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
    ],
    providers: [
        NetworkDataSourceRegistry,
        RegistriesService,
        MethodologiesService,
    ],
})
export class ApiModule {}
