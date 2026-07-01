import {
    Controller,
    Post,
    Get,
    Patch,
    Body,
    Query,
    Req,
    Res,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiCookieAuth,
} from '@nestjs/swagger';
import { AuthService, RequestCtx } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CsrfGuard } from './guards/csrf.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser, COOKIE_REFRESH } from './auth.types';

// ── Minimal structural request interface ─────────────────────────────────────
// @types/express is NOT installed. This structural shape covers every field this
// controller actually reads. The CookieWriter structural type is consumed by
// AuthService (which also does not import @types/express).

interface MinimalRequest {
    ip?: string;
    headers: {
        'user-agent'?: string;
        cookie?: string;
    };
    // req.cookies is populated by cookie-parser middleware (wired in main.ts).
    // Typed as partial so the controller compiles even before cookie-parser runs.
    cookies?: Record<string, string>;
}

interface MinimalResponse {
    // Express res.cookie / res.clearCookie structural shape — same as CookieWriter.
    cookie(name: string, value: string, options: Record<string, unknown>): unknown;
    clearCookie(name: string, options?: Record<string, unknown>): unknown;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extracts a consistent RequestCtx from an incoming request. */
function extractCtx(req: MinimalRequest): RequestCtx {
    return {
        ip: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
    };
}

/**
 * Extracts the raw refresh token from req.cookies (cookie-parser) or falls back
 * to inline parsing of the Cookie header. The fallback path covers the case
 * where cookie-parser is not registered; the primary path is from main.ts.
 */
function extractRefreshToken(req: MinimalRequest): string {
    // Primary: cookie-parser-populated cookies object
    if (req.cookies?.[COOKIE_REFRESH]) {
        return req.cookies[COOKIE_REFRESH];
    }

    // Fallback: parse Cookie header inline (matches guard pattern)
    const cookieHeader = req.headers.cookie ?? '';
    if (cookieHeader) {
        const pairs = cookieHeader.split(';').map((p) => p.trim());
        for (const pair of pairs) {
            const eqIdx = pair.indexOf('=');
            if (eqIdx === -1) continue;
            const name = pair.slice(0, eqIdx).trim();
            const value = pair.slice(eqIdx + 1).trim();
            if (name === COOKIE_REFRESH) return value;
        }
    }

    return '';
}

// ── AuthController ────────────────────────────────────────────────────────────

/**
 * Authentication endpoints.
 *
 * Route: /api/v1/auth (NO :network segment — auth is cross-network)
 *
 * Guards are applied per method (no global guard):
 *   - @UseGuards(JwtAuthGuard) on the authenticated routes (/me, /logout, …)
 *   - @UseGuards(CsrfGuard)   on mutating cookie-auth routes (/refresh, /logout, …)
 *   - All other routes are public (unauthenticated)
 *
 * Cookie mutation: uses @Res({ passthrough: true }) so Nest still serializes
 * the return value while AuthService can call res.cookie / res.clearCookie.
 */
@ApiTags('auth')
@Controller('api/v1/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    // ── POST /signup ─────────────────────────────────────────────────────────

    @Post('signup')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Register a new user account',
        description:
            'Creates a new system_user account and sends a verification email. ' +
            'Always returns the same neutral response to prevent account enumeration. ' +
            'The account cannot sign in until the email address is verified.',
    })
    @ApiResponse({ status: 200, description: 'Neutral confirmation (same regardless of whether email was new)' })
    @ApiResponse({ status: 400, description: 'Validation error (invalid email, password too short, extra fields, etc.)' })
    async signup(
        @Body() dto: SignUpDto,
        @Req() req: MinimalRequest,
    ): Promise<{ message: string }> {
        return this.authService.signup(dto, extractCtx(req));
    }

    // ── POST /verify-email ───────────────────────────────────────────────────

    @Post('verify-email')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Verify email address',
        description:
            'Consumes the single-use email-verification token sent at signup. ' +
            'On success, the account is activated and may sign in.',
    })
    @ApiResponse({ status: 200, description: 'Email verified' })
    @ApiResponse({ status: 401, description: 'Invalid or expired token' })
    async verifyEmail(
        @Body() dto: VerifyEmailDto,
        @Req() req: MinimalRequest,
    ): Promise<{ message: string }> {
        return this.authService.verifyEmail(dto, extractCtx(req));
    }

    // ── POST /resend-verification ─────────────────────────────────────────────

    @Post('resend-verification')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard, CsrfGuard)
    @ApiCookieAuth()
    @ApiOperation({
        summary: 'Resend the email-verification link (throttled)',
        description:
            'Sends a fresh verification email for the signed-in, unverified user. ' +
            'Throttled — within the cooldown window it returns sent=false with retryAfterSeconds.',
    })
    @ApiResponse({ status: 200, description: 'Sent, or throttled with retryAfterSeconds' })
    async resendVerification(
        @CurrentUser() user: AuthenticatedUser,
        @Req() req: MinimalRequest,
    ): Promise<{ sent: boolean; message: string; retryAfterSeconds?: number }> {
        return this.authService.resendVerification(user, extractCtx(req));
    }

    // ── POST /login ──────────────────────────────────────────────────────────

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Sign in',
        description:
            'Authenticates the user with email + password. ' +
            'On success, sets httpOnly access + refresh cookies and a non-httpOnly CSRF cookie. ' +
            'Returns the safe user profile. All failure paths return the same generic error.',
    })
    @ApiResponse({ status: 200, description: 'Authenticated — cookies set' })
    @ApiResponse({ status: 401, description: 'Invalid credentials (generic — no enumeration)' })
    async login(
        @Body() dto: LoginDto,
        @Req() req: MinimalRequest,
        @Res({ passthrough: true }) res: MinimalResponse,
    ) {
        return this.authService.login(dto, extractCtx(req), res);
    }

    // ── POST /refresh ────────────────────────────────────────────────────────

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @UseGuards(CsrfGuard)
    @ApiCookieAuth()
    @ApiOperation({
        summary: 'Rotate refresh token',
        description:
            'Exchanges the httpOnly refresh cookie for a new access + refresh token pair. ' +
            'Requires the X-CSRF-Token header to equal the csrf cookie (double-submit CSRF defense). ' +
            'If a previously-rotated token is presented (reuse attack), the entire session family ' +
            'is revoked and a 401 is returned.',
    })
    @ApiResponse({ status: 200, description: 'Tokens rotated — cookies updated' })
    @ApiResponse({ status: 401, description: 'Invalid, expired, or reused refresh token' })
    @ApiResponse({ status: 403, description: 'CSRF token missing or mismatch' })
    async refresh(
        @Req() req: MinimalRequest,
        @Res({ passthrough: true }) res: MinimalResponse,
    ): Promise<{ message: string }> {
        const rawRefresh = extractRefreshToken(req);
        return this.authService.refresh(rawRefresh, extractCtx(req), res);
    }

    // ── GET /me ──────────────────────────────────────────────────────────────

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiCookieAuth()
    @ApiOperation({
        summary: 'Get current user profile',
        description:
            'Returns the authenticated user\'s profile. ' +
            'Requires a valid access token in the httpOnly access cookie or Authorization: Bearer header.',
    })
    @ApiResponse({ status: 200, description: 'User profile' })
    @ApiResponse({ status: 401, description: 'Not authenticated or token invalid/revoked' })
    async me(@CurrentUser() user: AuthenticatedUser) {
        return this.authService.me(user);
    }

    // ── PATCH /me ──────────────────────────────────────────────────────────────

    @Patch('me')
    @UseGuards(JwtAuthGuard, CsrfGuard)
    @ApiCookieAuth()
    @ApiOperation({
        summary: 'Update the signed-in user\'s own profile',
        description:
            'Updates the editable profile fields (name, organisation, job title, ' +
            'country). Email and role are immutable here. Requires a valid access ' +
            'token and the X-CSRF-Token header.',
    })
    @ApiResponse({ status: 200, description: 'Updated user profile' })
    @ApiResponse({ status: 400, description: 'Validation error (field too long / unknown field)' })
    @ApiResponse({ status: 401, description: 'Not authenticated' })
    @ApiResponse({ status: 403, description: 'CSRF token missing or mismatch' })
    async updateProfile(
        @Body() dto: UpdateProfileDto,
        @CurrentUser() user: AuthenticatedUser,
        @Req() req: MinimalRequest,
    ) {
        return this.authService.updateProfile(user, dto, extractCtx(req));
    }

    // ── GET /me/activity ───────────────────────────────────────────────────────

    @Get('me/activity')
    @UseGuards(JwtAuthGuard)
    @ApiCookieAuth()
    @ApiOperation({
        summary: 'List the signed-in user\'s own recent account activity (paginated)',
        description:
            'Returns the caller\'s OWN audit-log entries only. Supports page / pageSize ' +
            '(max 100) and an optional action filter. Also returns the distinct action ' +
            'types the user has, for the filter dropdown.',
    })
    @ApiResponse({ status: 200, description: 'Paginated activity + distinct action types' })
    @ApiResponse({ status: 401, description: 'Not authenticated' })
    async myActivity(
        @CurrentUser() user: AuthenticatedUser,
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
        @Query('action') action?: string,
    ) {
        return this.authService.getMyActivity(
            user,
            page ? parseInt(page, 10) : undefined,
            pageSize ? parseInt(pageSize, 10) : undefined,
            action,
        );
    }

    // ── POST /logout ─────────────────────────────────────────────────────────

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard, CsrfGuard)
    @ApiCookieAuth()
    @ApiOperation({
        summary: 'Sign out',
        description:
            'Revokes the current session\'s refresh token and clears all auth cookies. ' +
            'Requires a valid access token and the X-CSRF-Token header.',
    })
    @ApiResponse({ status: 200, description: 'Logged out — cookies cleared' })
    @ApiResponse({ status: 401, description: 'Not authenticated' })
    @ApiResponse({ status: 403, description: 'CSRF token missing or mismatch' })
    async logout(
        @CurrentUser() user: AuthenticatedUser,
        @Req() req: MinimalRequest,
        @Res({ passthrough: true }) res: MinimalResponse,
    ): Promise<{ message: string }> {
        return this.authService.logout(user, res, extractCtx(req));
    }

    // ── POST /forgot-password ─────────────────────────────────────────────────

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Request a password-reset email',
        description:
            'Sends a single-use password-reset link to the given email address if an account exists. ' +
            'ALWAYS returns the same neutral 200 — never reveals whether the address is registered.',
    })
    @ApiResponse({ status: 200, description: 'Neutral confirmation (always the same response)' })
    @ApiResponse({ status: 400, description: 'Validation error (invalid email format)' })
    async forgotPassword(
        @Body() dto: ForgotPasswordDto,
        @Req() req: MinimalRequest,
    ): Promise<{ message: string }> {
        return this.authService.forgotPassword(dto, extractCtx(req));
    }

    // ── POST /reset-password ─────────────────────────────────────────────────

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Reset password using the emailed token',
        description:
            'Consumes the single-use password-reset token, sets a new password, ' +
            'bumps tokenVersion to invalidate all existing JWTs, and revokes all refresh sessions.',
    })
    @ApiResponse({ status: 200, description: 'Password reset — please sign in with the new password' })
    @ApiResponse({ status: 400, description: 'Validation error (password too short, etc.)' })
    @ApiResponse({ status: 401, description: 'Invalid or expired reset token' })
    async resetPassword(
        @Body() dto: ResetPasswordDto,
        @Req() req: MinimalRequest,
    ): Promise<{ message: string }> {
        return this.authService.resetPassword(dto, extractCtx(req));
    }

    // ── POST /change-password ─────────────────────────────────────────────────

    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard, CsrfGuard)
    @ApiCookieAuth()
    @ApiOperation({
        summary: 'Change the signed-in user\'s password',
        description:
            'Verifies the current password, sets the new one and clears the ' +
            'mustChangePassword flag. Used by the forced first-login change and ' +
            'voluntary changes from account settings.',
    })
    @ApiResponse({ status: 200, description: 'Updated user profile' })
    @ApiResponse({ status: 401, description: 'Current password incorrect' })
    async changePassword(
        @Body() dto: ChangePasswordDto,
        @CurrentUser() user: AuthenticatedUser,
        @Req() req: MinimalRequest,
    ) {
        return this.authService.changePassword(user, dto, extractCtx(req));
    }
}
