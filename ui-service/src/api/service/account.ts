import {User} from '@entity/user';
import crypto from 'crypto';
import {Request, Response, Router} from 'express';
import {sign, verify} from 'jsonwebtoken';
import {getMongoRepository} from 'typeorm';
import {IAuthUser} from '../../auth/auth.interface';

/**
 * User account route
 */
export const accountAPI = Router();

accountAPI.get('/current-user', async (req: Request, res: Response) => {
    let authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user: IAuthUser) => {
            if (req.query && req.query.force) {
                getMongoRepository(User).findOne({where: {username: {$eq: user.username}}}).then((_user => {
                    res.status(200).json(_user);
                }), (() => {
                    res.status(500).send({code: 500, message: 'Server error'});
                }));
            } else {
                res.status(200).json(user);
            }
        });
    } else {
        res.sendStatus(401);
    }
});

accountAPI.post('/register', async (req: Request, res: Response) => {
    try {
        const {username, password, role} = req.body;
        const passwordDigest = crypto.createHash('sha256').update(password).digest('hex');

        const user = getMongoRepository(User).create({
            username: username,
            password: passwordDigest,
            role: role,
            did: null
        });

        const result = await getMongoRepository(User).save(user);
        res.json(result);
    } catch (e) {
        res.status(500).send({code: 500, message: 'Server error'});
    }
});

accountAPI.post('/login', async (req: Request, res: Response) => {
    try {
        const {username, password} = req.body;
        const passwordDigest = crypto.createHash('sha256').update(password).digest('hex');

        const user = await getMongoRepository(User).findOne({where: {username: {$eq: username}}});
        if (user && passwordDigest === user.password) {
            const accessToken = sign({
                username: user.username,
                did: user.did,
                state: user.state,
                role: user.role
            }, process.env.ACCESS_TOKEN_SECRET);
            res.json({
                username: user.username,
                did: user.did,
                state: user.state,
                role: user.role,
                accessToken: accessToken
            });
        } else {
            res.status(403).json({code: 403, message: 'Bad user'});
        }
    } catch (e) {
        res.status(500).send({code: 500, message: 'Server error'});
    }
});

accountAPI.get('/get-all-users', async (req: Request, res: Response) => {
    try {
        const users = await getMongoRepository(User).find();
        res.json(users.map(e => ({
            username: e.username,
            role: e.role
        })));
    } catch (e) {
        res.status(500).send({code: 500, message: 'Server error'});
    }
});
