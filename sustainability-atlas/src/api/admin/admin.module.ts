import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { RateLimitAdminController } from './rate-limit-admin.controller';
import { RateLimitAdminService } from './rate-limit-admin.service';

/**
 * Admin module — administrator-only management features.
 *
 * Imports AuthModule to obtain the guards (JwtAuthGuard, RolesGuard, CsrfGuard)
 * and the PasswordService / TokenService the user-management service depends on.
 * SystemDataSource is injected from the @Global SystemDatabaseModule.
 *
 * No APP_GUARD here — routes are protected at the controller level with
 * @UseGuards(JwtAuthGuard, RolesGuard) + @Roles('admin').
 */
@Module({
    imports: [AuthModule],
    controllers: [AdminUsersController, RateLimitAdminController],
    providers: [AdminUsersService, RateLimitAdminService],
})
export class AdminModule {}
