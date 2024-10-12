import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../helpers/users.js';
import { IAuthUser } from '@guardian/common';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {

    constructor(
        private readonly users: UsersService
    ) {
    }

    /**
     * Use
     * @param context
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new UnauthorizedException();
        }
        try {
            request.user = await this.users.getUserByToken(token) as IAuthUser;
        } catch {
            throw new UnauthorizedException();
        }
        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
