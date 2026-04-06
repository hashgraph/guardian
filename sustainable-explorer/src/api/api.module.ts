import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from '@shared/config/configuration';
import { getDatabaseConfig } from '@shared/config/database.config';
import { BusinessView } from '@shared/entities/business-view.entity';

// Controllers
import { RegistriesController } from './controllers/registries.controller';

// Services
import { RegistriesService } from './services/registries.service';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration],
        }),

        TypeOrmModule.forRootAsync({
            useFactory: () => getDatabaseConfig({ synchronize: false }),
        }),

        TypeOrmModule.forFeature([BusinessView]),
    ],
    controllers: [
        RegistriesController,
    ],
    providers: [
        RegistriesService,
    ],
})
export class ApiModule {}
