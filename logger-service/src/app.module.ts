import { Module } from '@nestjs/common';
import { LoggerModule } from '@api/logger.service';

@Module({
    imports: [LoggerModule],
})
export class AppModule {}
