import { Module } from '@nestjs/common';
import { AnalyticsModule } from '@api/analytics.service';
import { ProfileModule } from '@api/profile.service';
import { SchemaService } from '@api/schema.service';

@Module({
    imports: [
        AnalyticsModule,
        ProfileModule
    ],
    controllers: [
        SchemaService
    ]
})
export class AppModule {}
