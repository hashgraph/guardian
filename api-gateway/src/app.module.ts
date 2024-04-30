import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
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
import { AppMiddleware, authorizationHelper, LoggerMiddleware, nextHelper } from './auth/authorization-helper.js';
import { PolicyApi } from './api/service/policy.js';
import { SchemaApi, SingleSchemaApi } from './api/service/schema.js';
import { SettingsApi } from './api/service/settings.js';
import { TagsApi } from './api/service/tags.js';
import { TaskApi } from './api/service/task.js';
import { TokensApi } from './api/service/tokens.js';
import { TrustChainsApi } from './api/service/trust-chains.js';
import { WizardApi } from './api/service/wizard.js';
import process from 'process';
import express from 'express';
import hpp from 'hpp';
import { ThemesApi } from './api/service/themes.js';
import { BrandingApi } from './api/service/branding.js';
import { SuggestionsApi } from './api/service/suggestions.js';
import { MatchConstraint } from './helpers/decorators/match.validator.js';
import { NotificationService } from '@guardian/common';
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
import fastifyRawBody from 'fastify-raw-body';

const JSON_REQUEST_LIMIT = process.env.JSON_REQUEST_LIMIT || '1mb';
const RAW_REQUEST_LIMIT = process.env.RAW_REQUEST_LIMIT || '1gb';

// class LogClientSerializer implements Serializer {
//     serialize(value: any, options?: Record<string, any>): any {
//         value.data = Buffer.from(JSON.stringify(value), 'utf-8')
//         return value;
//     }
// }
//
// class LogClientDeserializer implements Deserializer {
//     deserialize(value: any, options?: Record<string, any>): any {
//         return JSON.parse(value.toString())
//     }
// }

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
        AISuggestionsAPI
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
    ]
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        // consumer.apply(LoggerMiddleware).forRoutes(AccountApi);
      // console.log('AppModule1');
      //   consumer.apply(authorizationHelper).forRoutes(ProfileApi);
      //   consumer.apply(authorizationHelper).forRoutes(PolicyApi);
      //   consumer.apply(authorizationHelper).forRoutes(SettingsApi);
      //   consumer.apply(authorizationHelper).forRoutes(SingleSchemaApi);
      //   consumer.apply(AppMiddleware).forRoutes(SchemaApi);
      //   consumer.apply(authorizationHelper).forRoutes(ArtifactApi);
      //   consumer.apply(authorizationHelper).forRoutes(IpfsApi);
      //   consumer.apply(authorizationHelper).forRoutes(LoggerApi);
      //   consumer.apply(authorizationHelper).forRoutes(AnalyticsApi);
      //   consumer.apply(authorizationHelper).forRoutes(ContractsApi);
      //   consumer.apply(authorizationHelper).forRoutes(ModulesApi);
      //   consumer.apply(authorizationHelper).forRoutes(ToolsApi);
      //   consumer.apply(authorizationHelper).forRoutes(TagsApi);
      //   consumer.apply(authorizationHelper).forRoutes(ThemesApi);
      //   consumer.apply(authorizationHelper).forRoutes(TokensApi);
      //   consumer.apply(authorizationHelper).forRoutes(TrustChainsApi);
      //   consumer.apply(authorizationHelper).forRoutes(WizardApi);
        // consumer.apply(authorizationHelper).forRoutes(BrandingApi);
        // consumer.apply(authorizationHelper).forRoutes(SuggestionsApi);
        // consumer.apply(authorizationHelper).forRoutes(NotificationsApi);
        // consumer.apply(authorizationHelper).forRoutes(TaskApi);
        // consumer.apply(authorizationHelper).forRoutes(RecordApi);
        // consumer.apply(authorizationHelper).forRoutes(AISuggestionsAPI);

        // consumer.apply(express.json({
        //     limit: JSON_REQUEST_LIMIT
        // })).forRoutes('*');
        // consumer
        // .apply(AppMiddleware)
        // .forRoutes({ path: '*', method: RequestMethod.ALL });
        // consumer.apply(express.raw({
        //     inflate: true,
        //     limit: RAW_REQUEST_LIMIT,
        //     type: 'binary/octet-stream'
        // })).forRoutes('*');
        // consumer.apply(fastifyRawBody).forRoutes('*');
        consumer.apply(hpp()).forRoutes('*');
    }
}
