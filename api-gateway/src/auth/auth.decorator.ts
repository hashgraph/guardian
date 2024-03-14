import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth-guard.js';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { UserRole } from '@guardian/interfaces';
import { RolesGuard } from '../auth/roles-guard.js';

export function Auth(...roles: UserRole[]) {
    return applyDecorators(
        SetMetadata('roles', roles),
        UseGuards(
            AuthGuard,
            RolesGuard
        ),
        ApiBearerAuth(),
        ApiUnauthorizedResponse({description: 'Unauthorized'}),
    )
}
