import { Guardians } from '@helpers/guardians';
import { Response, Router } from 'express';
import { UserRole } from '@guardian/interfaces';
import { permissionHelper } from '@auth/authorization-helper';
import { AuthenticatedRequest, Logger } from '@guardian/common';

/**
 * Contract route
 */
export const contractAPI = Router();

contractAPI.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const [contracts, count] = await guardians.getContracts(
            user.parent || user.did,
            req.query.pageIndex as any,
            req.query.pageSize as any
        );
        res.status(200).setHeader('X-Total-Count', count).json(contracts);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: error.code, message: error.message });
    }
});

contractAPI.post(
    '/',
    permissionHelper(UserRole.STANDARD_REGISTRY),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user;
            const { description } = req.body;
            const guardians = new Guardians();
            res.status(200).json(
                await guardians.createContract(user.did, description)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            res.status(500).json({ code: 500, message: error.message });
        }
    }
);

contractAPI.post(
    '/import',
    permissionHelper(UserRole.STANDARD_REGISTRY),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user;
            const { contractId, description } = req.body;
            const guardians = new Guardians();
            res.status(200).json(
                await guardians.importContract(
                    user.did,
                    contractId,
                    description
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            res.status(500).json({ code: 500, message: error.message });
        }
    }
);

contractAPI.post(
    '/user',
    permissionHelper(UserRole.STANDARD_REGISTRY),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user;
            const { userId, contractId } = req.body;
            const guardians = new Guardians();
            res.status(200).json(
                await guardians.addUser(user.did, userId, contractId)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            res.status(500).json({ code: 500, message: error.message });
        }
    }
);

contractAPI.post(
    '/status',
    permissionHelper(UserRole.STANDARD_REGISTRY),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user;
            const { contractId } = req.body;
            const guardians = new Guardians();
            res.status(200).json(
                await guardians.updateStatus(user.did, contractId)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            res.status(500).json({ code: 500, message: error.message });
        }
    }
);

contractAPI.get('/pair', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        res.status(200).json(
            await guardians.getContractPair(
                user.did,
                user.parent || user.did,
                req.query?.baseTokenId as string,
                req.query?.oppositeTokenId as string
            )
        );
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

contractAPI.post(
    '/pair',
    permissionHelper(UserRole.STANDARD_REGISTRY),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user;
            const {
                baseTokenId,
                oppositeTokenId,
                baseTokenCount,
                oppositeTokenCount,
                contractId,
            } = req.body;
            const guardians = new Guardians();
            res.status(200).json(
                await guardians.addContractPair(
                    user.did,
                    contractId,
                    baseTokenId,
                    oppositeTokenId,
                    baseTokenCount,
                    oppositeTokenCount
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            res.status(500).json({ code: 500, message: error.message });
        }
    }
);

contractAPI.get(
    '/retire/request',
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user;
            const guardians = new Guardians();
            const [requests, count] = await guardians.getRetireRequests(
                user.role === UserRole.USER ? user.did : null,
                req.query?.contractId as string,
                req.query?.pageIndex as any,
                req.query?.pageSize as any
            );
            res.status(200).setHeader('X-Total-Count', count).json(requests);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            res.status(500).json({ code: 500, message: error.message });
        }
    }
);

contractAPI.post(
    '/retire/request',
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user;
            const {
                baseTokenId,
                oppositeTokenId,
                baseTokenCount,
                contractId,
                oppositeTokenCount,
                baseTokenSerials,
                oppositeTokenSerials,
            } = req.body;
            const guardians = new Guardians();
            res.status(200).json(
                await guardians.retireRequest(
                    user.did,
                    contractId,
                    baseTokenId,
                    oppositeTokenId,
                    baseTokenCount,
                    oppositeTokenCount,
                    baseTokenSerials,
                    oppositeTokenSerials
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            res.status(500).json({ code: 500, message: error.message });
        }
    }
);

contractAPI.delete(
    '/retire/request',
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user;
            const guardians = new Guardians();
            res.status(200).json(
                await guardians.cancelRetireRequest(
                    user.did,
                    req.query?.requestId as string
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            res.status(500).json({ code: 500, message: error.message });
        }
    }
);

contractAPI.post(
    '/retire',
    permissionHelper(UserRole.STANDARD_REGISTRY),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user;
            const { requestId } = req.body;
            const guardians = new Guardians();
            res.status(200).json(await guardians.retire(user.did, requestId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            res.status(500).json({ code: 500, message: error.message });
        }
    }
);
