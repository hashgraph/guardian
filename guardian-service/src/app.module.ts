import { Module } from '@nestjs/common';
import { AnalyticsModule } from '@api/analytics.service';
import { ProfileModule } from '@api/profile.service';
import { SchemaService } from '@api/schema.service';
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
