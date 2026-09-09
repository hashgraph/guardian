import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key used by JwtAuthGuard to skip authentication for a route.
 *
 * Apply at method level only — class-level @Public() silently makes every new
 * method on the controller public, defeating the default-deny posture.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a controller method as publicly accessible (no JWT required).
 *
 * JwtAuthGuard checks for this decorator via Reflector and short-circuits to
 * allow when it is present.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
