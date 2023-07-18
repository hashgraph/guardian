import { Module } from '@nestjs/common';
import { NotifyModule } from '@api/notify.service';

@Module({
    imports: [NotifyModule],
})
export class AppModule {}
