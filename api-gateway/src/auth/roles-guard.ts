import { IAuthUser } from '@guardian/common';
import { Permissions } from '@guardian/interfaces';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {

    constructor(private readonly reflector: Reflector) {
    }

    canActivate(context: ExecutionContext): boolean {
        const permissions: Permissions[] = this.reflector.get('permissions', context.getHandler());
        if (Array.isArray(permissions) && permissions.length) {
            const request = context.switchToHttp().getRequest();
            const user: IAuthUser = request.user;
            if (user && user.permissions) {
                for (const permission of permissions) {
                    if (user.permissions.indexOf(permission) !== -1) {
                        return true;
                    }
                }
            }
            return false;
        } else {
            return true;
        }
    }
}
