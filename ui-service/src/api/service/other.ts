import {Policy} from '@entity/policy';
import {Guardians} from '@helpers/guardians';
import {Request, Response, Router} from 'express';
import {getMongoRepository} from 'typeorm';
import {UserRole} from 'interfaces';
import {AuthenticatedRequest} from '../../auth/auth.interface';
import {User} from '@entity/user';

/**
 * Route for other api
 */
export const otherAPI = Router();

otherAPI.get('/get-policy-list', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = await getMongoRepository(User).findOne({where: {username: {$eq: req.user.username}}});
        if (user.role === UserRole.ROOT_AUTHORITY) {
            res.json(await getMongoRepository(Policy).find({owner: user.did}));
        } else {
            res.json(await getMongoRepository(Policy).find({status: 'PUBLISH'}));
        }
    } catch (e) {
        res.status(500).send({code: 500, message: 'Server error'});
    }
});

otherAPI.get('/get-listeners', async (req: Request, res: Response) => {
    const guardians = new Guardians();

    try {
        const listeners = (await guardians.getChannel().request('guardian.*', 'get-listeners', null)).payload;
        res.status(200).json(listeners);
    } catch (e) {
        res.status(500).send({code: 500, message: 'Server error'});
    }
});

otherAPI.get('/reboot-listeners', async (req: Request, res: Response) => {
    const guardians = new Guardians();

    try {
        (await guardians.getChannel().request('guardian.*', 'reboot-listeners', null)).payload;
        res.status(200).json(true);
    } catch (e) {
        res.status(500).send({code: 500, message: 'Server error'});
    }
});
