import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { EmailTokenService } from './email-token.service';
import { ApiKeyResolver } from './api-key-resolver.service';
import { MailModule } from '../mail/mail.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { CsrfGuard } from './guards/csrf.guard';
import { ApiKeyGuard } from './guards/api-key.guard';
import { DataAccessGuard } from './guards/data-access.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';

/**
 * Auth module — security primitives.
 *
 * Provides:
 *   - PasswordService: argon2id+pepper hashing, constant-time verify, dummy verify
 *   - TokenService:    access JWT sign/verify + refresh-token lifecycle
 *   - JwtAuthGuard:   JWT extraction, verification, live user/tokenVersion check
 *   - RolesGuard:     role-based access control (reads req.user from JwtAuthGuard)
 *   - CsrfGuard:      double-submit CSRF defense for mutating cookie-auth routes
 *
 * Wiring notes:
 *   - ConfigModule is registered as global by ApiModule, so ConfigService is
 *     automatically injectable here without re-importing ConfigModule.
 *   - SystemDataSource comes from the @Global SystemDatabaseModule, so it is
 *     injectable here without importing a provider module.
 *   - Two flag-gated global APP_GUARDs are registered: DataAccessGuard
 *     (DATA_ACCESS_ENFORCE) and RateLimitGuard (RATE_LIMIT_ENFORCE). Both are
 *     no-ops until their flag is on. The per-route guards (Jwt/Roles/Csrf) are
 *     exported so sibling controllers apply them at method level.
 *   - Email (MailService, the send queue, templates) lives in MailModule; it is
 *     imported here and re-exported so AdminModule gets MailService transitively.
 *   - JwtModule.registerAsync is used so the secret is read at module init time
 *     from ConfigService rather than at import-evaluation time (safe for tests
 *     that set env vars after module load).
 */
@Module({
    imports: [
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const secret = config.get<string>('app.auth.jwtAccessSecret') ?? '';
                const ttlMinutes = config.get<number>('app.auth.accessTokenTtlMinutes') ?? 15;
                return {
                    secret,
                    signOptions: {
                        expiresIn: `${ttlMinutes}m` as `${number}m`,
                    },
                };
            },
        }),
        MailModule,
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        PasswordService,
        TokenService,
        EmailTokenService,
        ApiKeyResolver,
        JwtAuthGuard,
        RolesGuard,
        CsrfGuard,
        ApiKeyGuard,
        // Global guard — no-op unless app.dataAccess.enforce is true (flag-gated).
        { provide: APP_GUARD, useClass: DataAccessGuard },
        // Global rate limiter — runs AFTER DataAccessGuard (so req.user is set for
        // API keys); no-op unless app.rateLimit.enforce is true (flag-gated).
        { provide: APP_GUARD, useClass: RateLimitGuard },
    ],
    exports: [
        AuthService,
        PasswordService,
        TokenService,
        EmailTokenService,
        JwtAuthGuard,
        RolesGuard,
        CsrfGuard,
        ApiKeyGuard,
        // Re-export so AdminModule (imports AuthModule) can inject MailService.
        MailModule,
    ],
})
export class AuthModule {}
