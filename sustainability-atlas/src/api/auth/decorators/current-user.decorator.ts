import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../auth.types';

/**
 * Parameter decorator that injects the authenticated user (or a specific field)
 * into a controller method parameter.
 *
 * The user object is attached to the request by JwtAuthGuard after successful
 * token verification and live DB lookup.
 *
 * Usage:
 *   // Inject the full user object
 *   @CurrentUser() user: AuthenticatedUser
 *
 *   // Inject a single field
 *   @CurrentUser('id') userId: string
 *
 * IMPORTANT: Only works on routes protected by @UseGuards(JwtAuthGuard).
 * Returns undefined if called on an unprotected route.
 */
export const CurrentUser = createParamDecorator(
    (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser } & Record<string, any>>();
        const user = request.user;
        if (!user) return undefined;
        return field ? user[field] : user;
    },
);
