import { Response } from 'express';
import { Users } from '@helpers/users';
import { AuthenticatedRequest, IAuthUser, Logger } from '@guardian/common';

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
            new Logger().error(error.message, ['API_GATEWAY']);
        }
    }
    res.sendStatus(401);
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
