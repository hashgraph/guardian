import { Module } from '@nestjs/common';
import { LoggerModule } from './api/logger.service.js';

@Module({
    imports: [LoggerModule],
})
export class AppModule {}
