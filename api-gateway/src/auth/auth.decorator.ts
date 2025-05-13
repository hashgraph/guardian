import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth-guard.js';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { LocationType, Permissions } from '@guardian/interfaces';
import { RolesAndLocationGuard, RolesGuard } from '../auth/roles-guard.js';

export function Auth(...permissions: Permissions[]) {
    return applyDecorators(
        SetMetadata('permissions', permissions),
        UseGuards(
            AuthGuard,
            RolesGuard
        ),
        ApiBearerAuth(),
        ApiUnauthorizedResponse({ description: 'Unauthorized.' }),
        ApiForbiddenResponse({ description: 'Forbidden.' })
    )
}


export function AuthAndLocation(locations: LocationType[], permissions: Permissions[] = []) {
    return applyDecorators(
        SetMetadata('permissions', permissions),
        SetMetadata('locations', locations),
        UseGuards(
            AuthGuard,
            RolesAndLocationGuard
        ),
        ApiBearerAuth(),
        ApiUnauthorizedResponse({ description: 'Unauthorized.' }),
        ApiForbiddenResponse({ description: 'Forbidden.' })
    )
}