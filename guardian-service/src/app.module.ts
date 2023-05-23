import { Module } from '@nestjs/common';
import { AnalyticsModule } from '@api/analytics.service';
import { ProfileModule } from '@api/profile.service';

@Module({
    imports: [
        AnalyticsModule,
        ProfileModule
    ]
})
export class AppModule {}
