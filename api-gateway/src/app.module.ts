import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AccountApi } from '@api/service/account';
import { WebSocketsService } from '@api/service/websockets';
import { AnalyticsApi } from '@api/service/analytics';
import { ArtifactApi } from '@api/service/artifact';
import { ContractsApi } from '@api/service/contract';
import { DemoApi } from '@api/service/demo';
import { ExternalApi } from '@api/service/external';
import { IpfsApi } from '@api/service/ipfs';
import { LoggerApi } from '@api/service/logger';
import { MapApi } from '@api/service/map';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MetricsApi } from '@api/service/metrics';
import { ModulesApi } from '@api/service/module';
import { ProfileApi } from '@api/service/profile';
import { authorizationHelper } from '@auth/authorization-helper';
import { PolicyApi } from '@api/service/policy';
import { SchemaApi, SingleSchemaApi } from '@api/service/schema';
import { SettingsApi } from '@api/service/settings';
import { TagsApi } from '@api/service/tags';
import { TaskApi } from '@api/service/task';
import { TokensApi } from '@api/service/tokens';
import { TrustChainsApi } from '@api/service/trust-chains';

@Module({
    imports: [
        ClientsModule.register([{ name: 'GUARDIANS', transport: Transport.TCP }]),
    ],
    controllers: [
        AccountApi,
        AnalyticsApi,
        ArtifactApi,
        ContractsApi,
        DemoApi,
        ExternalApi,
        IpfsApi,
        LoggerApi,
        MapApi,
        MetricsApi,
        ModulesApi,
        ProfileApi,
        PolicyApi,
        SingleSchemaApi,
        SchemaApi,
        SettingsApi,
        TagsApi,
        TaskApi,
        TokensApi,
        TrustChainsApi
    ],
    providers: [
        // WebSocketsService
    ]
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
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
        consumer.apply(authorizationHelper).forRoutes(TagsApi);
        consumer.apply(authorizationHelper).forRoutes(TokensApi);
        consumer.apply(authorizationHelper).forRoutes(TrustChainsApi);
    }
}
