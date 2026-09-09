import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccountController } from './account.controller';
import { ApiKeyService } from './api-key.service';
import { RateLimitRequestController } from './rate-limit-request.controller';
import { RateLimitRequestService } from './rate-limit-request.service';
import { DashboardPreferencesController } from './dashboard-preferences.controller';
import { DashboardPreferencesService } from './dashboard-preferences.service';
import { DashboardPreferencesRepository } from './dashboard-preferences.repository';
import { QuickFiltersController } from './quick-filters.controller';
import { QuickFiltersService } from './quick-filters.service';
import { QuickFiltersRepository } from './quick-filters.repository';

/**
 * Account module — authenticated user self-service (API keys, saved
 * dashboards, saved searches / quick filters, rate-limit requests).
 *
 * Imports AuthModule for the guards (JwtAuthGuard, CsrfGuard). SystemDataSource
 * is injected from the @Global SystemDatabaseModule; ConfigService is global.
 *
 * No APP_GUARD — routes are protected at the controller level with
 * @UseGuards(JwtAuthGuard) (any authenticated user).
 */
@Module({
    imports: [AuthModule],
    controllers: [
        AccountController,
        RateLimitRequestController,
        DashboardPreferencesController,
        QuickFiltersController,
    ],
    providers: [
        ApiKeyService,
        RateLimitRequestService,
        DashboardPreferencesService,
        DashboardPreferencesRepository,
        QuickFiltersService,
        QuickFiltersRepository,
    ],
})
export class AccountModule {}
