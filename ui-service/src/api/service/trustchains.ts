import {Guardians} from '@helpers/guardians';
import {Users} from '@helpers/users';
import {Request, Response, Router} from 'express';
import {UserRole} from 'interfaces';
import {HcsVcDocument, VcSubject} from 'vc-modules';
import {getMongoRepository} from 'typeorm';
import {User} from '@entity/user';
import { AuthenticatedRequest } from '@auth/auth.interface';
import { permissionHelper } from '@auth/authorizationHelper';

/**
 * Audit route
 */
export const trustchainsAPI = Router();

trustchainsAPI.get('/', permissionHelper(UserRole.AUDITOR), async (req: AuthenticatedRequest, res: Response) => {
    const guardians = new Guardians();
    const vp = await guardians.getVpDocuments();
    res.status(200).json(vp);
});

trustchainsAPI.get('/:hash', permissionHelper(UserRole.AUDITOR), async (req: AuthenticatedRequest, res: Response) => {
    const guardians = new Guardians();
    const hash = req.params.hash;
    const chain = await guardians.getChain(hash);
    const DIDs = chain.map( (item) => {
        if(item.type === 'VC' && item.document) {
            return item.document.issuer;
        }
        if(item.type === 'DID') {
            return item.id;
        }
        return null;
    }).filter(did => !!did);

    let userMap:any = await getMongoRepository(User).find({where: {
        did: {$in: DIDs}
    }}) || [];
    userMap = userMap.map((user:User) => {
        return { username: user.username, did: user.did }
    })

    res.status(200).json({ chain, userMap });
});