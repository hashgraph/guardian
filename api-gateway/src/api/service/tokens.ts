import { Guardians } from '@helpers/guardians';
import { KeyType, Wallet } from '@helpers/wallet';
import { AuthenticatedRequest } from '@auth/auth.interface';
import { permissionHelper } from '@auth/authorizationHelper';
import { Request, Response, Router } from 'express';
import { ITokenInfo, UserRole } from 'interfaces';
import { Logger } from 'logger-helper';

/**
 * Token route
 */
export const tokenAPI = Router();

tokenAPI.post('/', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const user = req.user;
        if(!user.did) {
            res.status(500).json({ code: 500, message: 'User not registered' });
            return;
        }
        const tokens = (await guardians.setToken({
            token: req.body,
            owner: user.did
        }));
        res.status(201).json(tokens);
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
        res.status(500).send({ code: error.code || 500, message: error.message });
    }
});

tokenAPI.get('/', permissionHelper(UserRole.ROOT_AUTHORITY, UserRole.USER), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const user = req.user; 
        if (user.role === UserRole.ROOT_AUTHORITY) {
            const tokens = await guardians.getTokens();
            res.status(200).json(tokens || []);
        } else {
            const userDID = user.did;
            if(!userDID) {
                res.status(200).json([]);
            } else {
                const tokens = await guardians.getAssociatedTokens(userDID);
                res.status(200).json(tokens || []);
            }
        }
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
        res.status(500).send({ code: error.code || 500, message: error.message });
    }
});

tokenAPI.put('/:tokenId/associate', permissionHelper(UserRole.USER), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const tokenId = req.params.tokenId;
        const userDID = req.user.did;
        if(!userDID) {
            res.status(500).json({ code: 500, message: 'User not registered' });
            return;
        }
        const status = await guardians.associateToken(tokenId, userDID);
        res.status(200).json(status);
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
        res.status(500).json({ code: error.code || 500, message: error.message });
    }
});

tokenAPI.put('/:tokenId/dissociate', permissionHelper(UserRole.USER), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const tokenId = req.params.tokenId;
        const userDID = req.user.did;
        if(!userDID) {
            res.status(500).json({ code: 500, message: 'User not registered' });
            return;
        }
        const status = await guardians.dissociateToken(tokenId, userDID);
        res.status(200).json(status);
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
        res.status(500).json({ code: error.code || 500, message: error.message });
    }
});

tokenAPI.put('/:tokenId/:username/grantKyc', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const owner = req.user.did;
        if(!owner) {
            res.status(500).json({ code: 500, message: 'User not registered' });
            return;
        }
        const result = await guardians.grantKycToken(tokenId, username, owner);
        res.status(200).json(result);
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
        res.status(500).json({ code: error.code || 500, message: error.message });
    }
});

tokenAPI.put('/:tokenId/:username/revokeKyc', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const owner = req.user.did;
        if(!owner) {
            res.status(500).json({ code: 500, message: 'User not registered' });
            return;
        }
        const result = await guardians.revokeKycToken(tokenId, username, owner);
        res.status(200).json(result);
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
        res.status(500).json({ code: error.code || 500, message: error.message });
    }
});

tokenAPI.put('/:tokenId/:username/freeze', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const owner = req.user.did;
        if(!owner) {
            res.status(500).json({ code: 500, message: 'User not registered' });
            return;
        }
        const result = await guardians.freezeToken(tokenId, username, owner);
        res.status(200).json(result);
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
        res.status(500).json({ code: error.code || 500, message: error.message });
    }
});

tokenAPI.put('/:tokenId/:username/unfreeze', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const owner = req.user.did;
        if(!owner) {
            res.status(500).json({ code: 500, message: 'User not registered' });
            return;
        }
        const result = await guardians.unfreezeToken(tokenId, username, owner);
        res.status(200).json(result);
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
        res.status(500).json({ code: error.code || 500, message: error.message });
    }
});

tokenAPI.get('/:tokenId/:username/info', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const owner = req.user.did;
        if(!owner) {
            res.status(500).json({ code: 500, message: 'User not registered' });
            return;
        }
        const result = await guardians.getInfoToken(tokenId, username, owner);
        res.status(200).json(result as ITokenInfo);
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
        res.status(500).json({ code: error.code || 500, message: error.message });
    }
});