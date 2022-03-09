import {Response} from 'express';
import {AuthenticatedRequest, IAuthUser} from './auth.interface';
import { Users } from '@helpers/users';

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
        } catch (e) {
            console.error(e.message);
        }
    }
    res.sendStatus(401);
}

export function permissionHelper(...roles: string[]) {
    return async function (req: AuthenticatedRequest, res: Response, next: Function): Promise<void> {
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
