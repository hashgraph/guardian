import { Guardians } from '@helpers/guardians';
import { Response, Router, NextFunction } from 'express';
import { UserRole } from '@guardian/interfaces';
import { permissionHelper } from '@auth/authorization-helper';
import { Users } from '@helpers/users';
import { AuthenticatedRequest, IAuthUser, Logger } from '@guardian/common';

/**
 * Audit route
 */
export const trustChainsAPI = Router();

trustChainsAPI.get('/', permissionHelper(UserRole.AUDITOR),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const guardians = new Guardians();
        let pageIndex: any;
        let pageSize: any;
        let filters: any;
        if (req.query) {
            if (req.query.pageIndex && req.query.pageSize) {
                pageIndex = req.query.pageIndex;
                pageSize = req.query.pageSize;
            }
            if (req.query.policyId) {
                filters = {
                    policyId: req.query.policyId
                }
            } else if (req.query.policyOwner) {
                filters = {
                    policyOwner: req.query.policyOwner
                }
            }
        }
        const { items, count } = await guardians.getVpDocuments({
            filters,
            pageIndex,
            pageSize
        });
        return res.setHeader('X-Total-Count', count).json(items);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

trustChainsAPI.get('/:hash', permissionHelper(UserRole.AUDITOR),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const guardians = new Guardians();
        const hash = req.params.hash;
        const chain = await guardians.getChain(hash);
        const DIDs = chain.map((item) => {
            if (item.type === 'VC' && item.document) {
                if (typeof item.document.issuer === 'string') {
                    return item.document.issuer;
                } else {
                    return item.document.issuer.id;
                }
            }
            if (item.type === 'DID') {
                return item.id;
            }
            return null;
        }).filter(did => !!did);

        const users = new Users();
        const allUsers = (await users.getUsersByIds(DIDs)) || [];
        const userMap = allUsers.map((user: IAuthUser) => {
            return { username: user.username, did: user.did }
        })

        res.json({ chain, userMap });
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});
