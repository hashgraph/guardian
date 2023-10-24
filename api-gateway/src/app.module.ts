import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AccountApi } from '@api/service/account';
import { AnalyticsApi } from '@api/service/analytics';
import { ArtifactApi } from '@api/service/artifact';
import { ContractsApi } from '@api/service/contract';
import { DemoApi } from '@api/service/demo';
import { ExternalApi } from '@api/service/external';
import { IpfsApi } from '@api/service/ipfs';
import { LoggerApi, LoggerService } from '@api/service/logger';
import { MapApi } from '@api/service/map';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MetricsApi } from '@api/service/metrics';
import { ModulesApi } from '@api/service/module';
import { ToolsApi } from '@api/service/tool';
import { ProfileApi } from '@api/service/profile';
import { AuthGuard, authorizationHelper } from '@auth/authorization-helper';
import { PolicyApi } from '@api/service/policy';
import { SchemaApi, SingleSchemaApi } from '@api/service/schema';
import { SettingsApi } from '@api/service/settings';
import { TagsApi } from '@api/service/tags';
import { TaskApi } from '@api/service/task';
import { TokensApi } from '@api/service/tokens';
import { TrustChainsApi } from '@api/service/trust-chains';
import { WizardApi } from '@api/service/wizard';
import process from 'process';
import express from 'express';
import fileUpload from 'express-fileupload';
import hpp from 'hpp';
import { ThemesApi } from '@api/service/themes';
import { BrandingApi } from '@api/service/branding';
import { SuggestionsApi } from '@api/service/suggestions';
import { MatchConstraint } from '@helpers/decorators/match.validator';
import { NotificationService } from '@guardian/common';
import { NotificationsApi } from '@api/service/notifications';
import { ApplicationEnvironment } from './environment';

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
    ],
    providers: [
        LoggerService,
        AuthGuard,
        MatchConstraint,
        NotificationService,
    ]
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        // consumer.apply(authorizationHelper).forRoutes(AccountApi);
        consumer.apply(authorizationHelper).forRoutes(ProfileApi);
        consumer.apply(authorizationHelper).forRoutes(PolicyApi);
        consumer.apply(authorizationHelper).forRoutes(SettingsApi);
        consumer.apply(authorizationHelper).forRoutes(SingleSchemaApi);
        consumer.apply(authorizationHelper).forRoutes(SchemaApi);
        consumer.apply(authorizationHelper).forRoutes(ArtifactApi);
        consumer.apply(authorizationHelper).forRoutes(IpfsApi);
        consumer.apply(authorizationHelper).forRoutes(LoggerApi);
        consumer.apply(authorizationHelper).forRoutes(AnalyticsApi);
        consumer.apply(authorizationHelper).forRoutes(ContractsApi);
        consumer.apply(authorizationHelper).forRoutes(ModulesApi);
        consumer.apply(authorizationHelper).forRoutes(ToolsApi);
        consumer.apply(authorizationHelper).forRoutes(TagsApi);
        consumer.apply(authorizationHelper).forRoutes(ThemesApi);
        consumer.apply(authorizationHelper).forRoutes(TokensApi);
        consumer.apply(authorizationHelper).forRoutes(TrustChainsApi);
        consumer.apply(authorizationHelper).forRoutes(WizardApi);
        // consumer.apply(authorizationHelper).forRoutes(BrandingApi);
        consumer.apply(authorizationHelper).forRoutes(SuggestionsApi);
        consumer.apply(authorizationHelper).forRoutes(NotificationsApi);
        consumer.apply(authorizationHelper).forRoutes(TaskApi);

        consumer.apply(express.json({
            limit: JSON_REQUEST_LIMIT
        })).forRoutes('*');
        consumer.apply(express.raw({
            inflate: true,
            limit: RAW_REQUEST_LIMIT,
            type: 'binary/octet-stream'
        })).forRoutes('*');
        consumer.apply(fileUpload()).forRoutes('*');
        consumer.apply(hpp()).forRoutes('*');
    }
}
