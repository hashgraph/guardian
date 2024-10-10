import { Module } from '@nestjs/common';
import { NotificationModule } from './api/notification.service.js';

@Module({
    imports: [NotificationModule],
})
export class AppModule {}
