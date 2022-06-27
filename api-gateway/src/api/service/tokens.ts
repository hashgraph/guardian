import { Guardians } from '@helpers/guardians';
import { AuthenticatedRequest, IAuthUser } from '@auth/auth.interface';
import { permissionHelper } from '@auth/authorization-helper';
import { Response, Router } from 'express';
import { ITokenInfo, UserRole } from '@guardian/interfaces';
import { Logger } from '@guardian/common';
import { PolicyEngine } from '@helpers/policy-engine';
import { findAllEntities } from '@helpers/utils';

/**
 * Token route
 */
export const tokenAPI = Router();

/**
 * Connect policies to tokens
 * @param tokens
 * @param user
 */
async function setTokensPolicies(tokens: any[], user: IAuthUser) {
    if (!tokens) {
        return;
    }
    const engineService = new PolicyEngine();

    let result: any;
    if (user.role === UserRole.STANDARD_REGISTRY) {
        result = await engineService.getPolicies({ filters: { owner: user.did } });
    } else {
        result = await engineService.getPolicies({ filters: { status: 'PUBLISH' } });
    }
    const { policies } = result;

    for (const token of tokens) {
        const tokenPolicies = [];
        for (const policyObject of policies) {
            const tokenIds = findAllEntities(policyObject.config, 'tokenId');
            if (tokenIds.includes(token.tokenId)) {
                tokenPolicies.push(`${policyObject.name} (${policyObject.version || "DRAFT"})`);
            }
        }
        token.policies = tokenPolicies;
    }
}

tokenAPI.post('/', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const user = req.user;
        if (!user.did) {
            res.status(500).json({ code: 500, message: 'User not registered' });
            return;
        }
        const tokens = (await guardians.setToken({
            token: req.body,
            owner: user.did
        }));

        await setTokensPolicies(tokens, user);
        res.status(201).json(tokens);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: error.code || 500, message: error.message });
    }
});

tokenAPI.get('/', permissionHelper(UserRole.STANDARD_REGISTRY, UserRole.USER), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const user = req.user;
        let tokens = [];

        if (user.role === UserRole.STANDARD_REGISTRY) {
            tokens = await guardians.getTokens({
                did: user.did
            });
        } else if (user.did) {
            tokens = await guardians.getAssociatedTokens(user.did);
        }
        tokens = tokens || [];
        await setTokensPolicies(tokens, user);
        res.status(200).json(tokens);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: error.code || 500, message: error.message });
    }
});

tokenAPI.put('/:tokenId/associate', permissionHelper(UserRole.USER), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const tokenId = req.params.tokenId;
        const userDID = req.user.did;
        if (!userDID) {
            res.status(500).json({ code: 500, message: 'User not registered' });
            return;
        }
        const status = await guardians.associateToken(tokenId, userDID);
        res.status(200).json(status);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: error.code || 500, message: error.message });
    }
});

tokenAPI.put('/:tokenId/dissociate', permissionHelper(UserRole.USER), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const tokenId = req.params.tokenId;
        const userDID = req.user.did;
        if (!userDID) {
            res.status(500).json({ code: 500, message: 'User not registered' });
            return;
        }
        const status = await guardians.dissociateToken(tokenId, userDID);
        res.status(200).json(status);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: error.code || 500, message: error.message });
    }
});

tokenAPI.put('/:tokenId/:username/grantKyc', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const owner = req.user.did;
        if (!owner) {
            res.status(500).json({ code: 500, message: 'User not registered' });
            return;
        }
        const result = await guardians.grantKycToken(tokenId, username, owner);
        res.status(200).json(result);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: error.code || 500, message: error.message });
    }
});

tokenAPI.put('/:tokenId/:username/revokeKyc', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const owner = req.user.did;
        if (!owner) {
            res.status(500).json({ code: 500, message: 'User not registered' });
            return;
        }
        const result = await guardians.revokeKycToken(tokenId, username, owner);
        res.status(200).json(result);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: error.code || 500, message: error.message });
    }
});

tokenAPI.put('/:tokenId/:username/freeze', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const owner = req.user.did;
        if (!owner) {
            res.status(500).json({ code: 500, message: 'User not registered' });
            return;
        }
        const result = await guardians.freezeToken(tokenId, username, owner);
        res.status(200).json(result);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: error.code || 500, message: error.message });
    }
});

tokenAPI.put('/:tokenId/:username/unfreeze', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const owner = req.user.did;
        if (!owner) {
            res.status(500).json({ code: 500, message: 'User not registered' });
            return;
        }
        const result = await guardians.unfreezeToken(tokenId, username, owner);
        res.status(200).json(result);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: error.code || 500, message: error.message });
    }
});

tokenAPI.get('/:tokenId/:username/info', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const owner = req.user.did;
        if (!owner) {
            res.status(500).json({ code: 500, message: 'User not registered' });
            return;
        }
        const result = await guardians.getInfoToken(tokenId, username, owner);
        res.status(200).json(result as ITokenInfo);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: error.code || 500, message: error.message });
    }
});
