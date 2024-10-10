import { Module } from '@nestjs/common';
import { AnalyticsModule } from './api/analytics.service.js';
import { ProfileModule } from './api/profile.service.js';
import { SchemaService } from './api/schema.service.js';
import { NotificationService } from '@guardian/common';

@Module({
    imports: [
        AnalyticsModule,
        ProfileModule
    ],
    controllers: [
        SchemaService,
    ],
    providers: [
        NotificationService,
    ]
})
export class AppModule {}
