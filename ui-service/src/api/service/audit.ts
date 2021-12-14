import {Guardians} from '@helpers/guardians';
import {Users} from '@helpers/users';
import {Request, Response, Router} from 'express';
import {UserRole} from 'interfaces';
import {HcsVcDocument, VcSubject} from 'vc-modules';
import {getMongoRepository} from 'typeorm';
import {User} from '@entity/user';

/**
 * Audit route
 */
export const auditAPI = Router();

auditAPI.get('/get-vp-documents', async (req: Request, res: Response) => {
    const guardians = new Guardians();
    const users = new Users();

    const user = await users.currentUser(req);
    if (!(await users.permission(user, UserRole.AUDITOR))) {
        res.status(403).send();
        return;
    }

    const vp = await guardians.getVpDocuments(null);

    console.log(vp);

    res.status(200).json(vp);
});

auditAPI.post('/search-vc-documents', async (req: Request, res: Response) => {
    const guardians = new Guardians();
    const users = new Users();

    const user = await users.currentUser(req);
    if (!(await users.permission(user, UserRole.AUDITOR))) {
        res.status(403).send();
        return;
    }

    const {filters} = req.body;

    let hash: any = null;
    if (filters && filters.vp) {
        const vp = await guardians.getVpDocuments(filters.vp);
        if (vp && vp[0]) {
            const items = vp[0].document.verifiableCredential;
            hash = [];
            for (let index = 0; index < items.length; index++) {
                const vc = HcsVcDocument.fromJsonTree<VcSubject>(items[index], null, VcSubject);
                hash.push(vc.toCredentialHash());
            }
        }
    }
    if (hash) {
        filters.hash = hash;
    }

    const vc = await guardians.getVcDocuments(filters);
    res.status(200).json(vc);
});

auditAPI.get('/search-documents', async (req: Request, res: Response) => {
    const guardians = new Guardians();
    const users = new Users();

    const user = await users.currentUser(req);
    if (!(await users.permission(user, UserRole.AUDITOR))) {
        res.status(403).send();
        return;
    }
    const search = req.query.search as string;
    const chain = await guardians.getChain(search);

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