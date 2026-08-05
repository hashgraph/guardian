import { SetMetadata } from '@nestjs/common';
import { AppRole } from '../auth.types';

/**
 * Metadata key used by RolesGuard to check the required roles for a route.
 */
export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the specified role(s).
 *
 * Must be used in conjunction with @UseGuards(JwtAuthGuard, RolesGuard) —
 * RolesGuard reads req.user which is populated by JwtAuthGuard.
 *
 * Example:
 *   @Roles('admin')
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Delete(':id')
 *   remove(...) { ... }
 *
 * When no @Roles decorator is present, RolesGuard allows all authenticated users.
 */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

// Re-export AppRole for convenience of callers who import from this file.
export type { AppRole };
