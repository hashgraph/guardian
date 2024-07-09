import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AccountApi } from './api/service/account.js';
import { AnalyticsApi } from './api/service/analytics.js';
import { ArtifactApi } from './api/service/artifact.js';
import { ContractsApi } from './api/service/contract.js';
import { DemoApi } from './api/service/demo.js';
import { ExternalApi } from './api/service/external.js';
import { IpfsApi } from './api/service/ipfs.js';
import { LoggerApi, LoggerService } from './api/service/logger.js';
import { MapApi } from './api/service/map.js';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MetricsApi } from './api/service/metrics.js';
import { ModulesApi } from './api/service/module.js';
import { ToolsApi } from './api/service/tool.js';
import { ProfileApi } from './api/service/profile.js';
import { PolicyApi } from './api/service/policy.js';
import { SchemaApi, SingleSchemaApi } from './api/service/schema.js';
import { SettingsApi } from './api/service/settings.js';
import { TagsApi } from './api/service/tags.js';
import { TaskApi } from './api/service/task.js';
import { TokensApi } from './api/service/tokens.js';
import { TrustChainsApi } from './api/service/trust-chains.js';
import { WizardApi } from './api/service/wizard.js';
import process from 'process';
import hpp from 'hpp';
import { ThemesApi } from './api/service/themes.js';
import { BrandingApi } from './api/service/branding.js';
import { SuggestionsApi } from './api/service/suggestions.js';
import { MatchConstraint } from './helpers/decorators/match.validator.js';
import { COMMON_CONNECTION_CONFIG, levelTypeMapping, Logger, MAP_TRANSPORTS, NotificationService, PinoLogger } from '@guardian/common';
import { NotificationsApi } from './api/service/notifications.js';
import { ApplicationEnvironment } from './environment.js';
import { AuthGuard } from './auth/auth-guard.js';
import { UsersService } from './helpers/users.js';
import { RolesGuard } from './auth/roles-guard.js';
import { RecordApi } from './api/service/record.js';
import { ProjectsAPI } from './api/service/project.js';
import { AISuggestionsAPI } from './api/service/ai-suggestions.js';
import { cacheProvider } from './helpers/cache-provider.js';
import { CacheService } from './helpers/cache-service.js';
import { PermissionsApi } from './api/service/permissions.js';
import { WorkerTasksController } from './api/service/worker-tasks.js';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { DEFAULT_MONGO } from '#constants';

// const JSON_REQUEST_LIMIT = process.env.JSON_REQUEST_LIMIT || '1mb';
// const RAW_REQUEST_LIMIT = process.env.RAW_REQUEST_LIMIT || '1gb';

const loggerFactory = {
    provide: PinoLogger,
    useFactory: async () => {
        const db = await MikroORM.init<MongoDriver>({
            ...COMMON_CONNECTION_CONFIG,
            driverOptions: {
                useUnifiedTopology: true,
                minPoolSize: parseInt(process.env.MIN_POOL_SIZE ?? DEFAULT_MONGO.MIN_POOL_SIZE, 10),
                maxPoolSize: parseInt(process.env.MAX_POOL_SIZE ?? DEFAULT_MONGO.MAX_POOL_SIZE, 10),
                maxIdleTimeMS: parseInt(process.env.MAX_IDLE_TIME_MS ?? DEFAULT_MONGO.MAX_IDLE_TIME_MS, 10),
            },
            ensureIndexes: true,
        });

        const loggerOptions = {
            logLevel: levelTypeMapping[process.env.LOG_LEVEL] || 'info',
            collectionName: process.env.LOG_COLLECTION || "log",
            filePath: process.env.LOG_FILE_PATH || './logs/app.log',
            client: db.em.getDriver().getConnection().getDb(),
            transports: process.env.TRANSPORTS,
            mapTransports: MAP_TRANSPORTS
        };

        return new PinoLogger(loggerOptions);
    },
};

@Module({
    imports: [
        ClientsModule.register([{
            name: 'GUARDIANS',
            transport: Transport.NATS,
            options: {
                name: `${process.env.SERVICE_CHANNEL}`,
                servers: [
                    `nats://${process.env.MQ_ADDRESS}:4222`
                ],
                // serializer: new LogClientSerializer(),
                // deserializer: new LogClientDeserializer()
            }
        }])
    ],
    controllers: [
        AccountApi,
        AnalyticsApi,
        ArtifactApi,
        ContractsApi,
        ...(ApplicationEnvironment.demoMode ? [DemoApi] : []),
        ExternalApi,
        IpfsApi,
        LoggerApi,
        MapApi,
        MetricsApi,
        ModulesApi,
        ToolsApi,
        ProfileApi,
        PolicyApi,
        SingleSchemaApi,
        SchemaApi,
        SettingsApi,
        TagsApi,
        TaskApi,
        TokensApi,
        ThemesApi,
        TrustChainsApi,
        WizardApi,
        BrandingApi,
        SuggestionsApi,
        NotificationsApi,
        ProjectsAPI,
        RecordApi,
        AISuggestionsAPI,
        PermissionsApi,
        WorkerTasksController
    ],
    providers: [
        LoggerService,
        MatchConstraint,
        NotificationService,
        AuthGuard,
        RolesGuard,
        UsersService,
        cacheProvider,
        CacheService,
        Logger,
        loggerFactory
    ],
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        // consumer.apply(express.json({
        //     limit: JSON_REQUEST_LIMIT
        // })).forRoutes('*');
        // consumer.apply(express.raw({
        //     inflate: true,
        //     limit: RAW_REQUEST_LIMIT,
        //     type: 'binary/octet-stream'
        // })).forRoutes('*');
        consumer.apply(hpp()).forRoutes('*');
    }
}
