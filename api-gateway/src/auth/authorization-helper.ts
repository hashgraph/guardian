import { NextFunction, Response } from 'express';
import { Users } from '@helpers/users';
import { AuthenticatedRequest, IAuthUser, Logger } from '@guardian/common';
import { HttpException, HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';

/**
 * Auth middleware
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {

    /**
     * Use
     * @param req
     * @param res
     * @param next
     */
    async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        const authHeader = req.headers.authorization;
        const users = new Users();
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            try {
                req.user = await users.getUserByToken(token) as IAuthUser;
                next();
                return;
            } catch (error) {
                new Logger().error(error, ['API_GATEWAY']);
            }
        }
        res.sendStatus(401);
    }
}

/**
 * Permission middleware
 */
@Injectable()
export class PermissionMiddleware implements NestMiddleware {

    /**
     * Permission middleware
     * @param req
     * @param res
     * @param next
     */
    use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        next();
    }
}

/**
 * Authorization middleware
 * @param req
 * @param res
 * @param next
 */
export async function authorizationHelper(req: AuthenticatedRequest, res: Response, next: Function): Promise<void> {
    const authHeader = req.headers.authorization;
    const users = new Users();
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        try {
            req.user = await users.getUserByToken(token) as IAuthUser;
            next();
            return;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
        }
    }
    res.sendStatus(401);
}

/**
 * Calculate user permissions
 * @param roles
 */
export function checkPermission(...roles: string[]) {
    return async (user: IAuthUser): Promise<void> => {
        if (user) {
            if(user.role) {
                if(roles.indexOf(user.role) !== -1) {
                    return;
                }
            }
            throw new HttpException('Forbidden', HttpStatus.FORBIDDEN)
        } else {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
        }
    }
}

/**
 * Calculate user permissions
 * @param roles
 */
export function permissionHelper(...roles: string[]) {
    return async (req: AuthenticatedRequest, res: Response, next: Function): Promise<void> => {
        if (req.user) {
            if(req.user.role) {
                if(roles.indexOf(req.user.role) !== -1) {
                    next();
                    return;
                }
            }
            res.sendStatus(403);
        } else {
            res.sendStatus(401);
        }
    }
}
