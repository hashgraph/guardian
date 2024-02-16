import { Module } from '@nestjs/common';
import { NotificationModule } from '@api/notification.service';

@Module({
    imports: [NotificationModule],
})
export class AppModule {}
