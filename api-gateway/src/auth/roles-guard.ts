import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {

    constructor(private readonly reflector: Reflector) {
    }

    canActivate(context: ExecutionContext): boolean {
        const roles = this.reflector.get('roles', context.getHandler());

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        return roles.indexOf(user.role) !== -1;
    }
}
