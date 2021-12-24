import {Response} from 'express';
import {verify} from 'jsonwebtoken';
import {AuthenticatedRequest, IAuthUser} from './auth.interface';
import {getMongoRepository} from 'typeorm';
import {User} from '@entity/user';

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
        verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, user: IAuthUser) => {
            if (err) {
                return res.sendStatus(401);
            }
            const userDB = await getMongoRepository(User).findOne({username: user.username});
            req.user = userDB;
            next();
        });
    } else {
        res.sendStatus(403);
    }
}
