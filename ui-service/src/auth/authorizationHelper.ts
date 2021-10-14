import {Response} from 'express';
import {verify} from 'jsonwebtoken';
import {AuthenticatedRequest, IAuthUser} from './auth.interface';

/**
 * Authorization middleware
 * @param req
 * @param res
 * @param next
 */
export async function authorizationHelper(req: AuthenticatedRequest, res: Response, next: Function): Promise<void> {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user: IAuthUser) => {
            if (err) {
                return res.sendStatus(401);
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(403);
    }
}
