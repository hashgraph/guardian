import {AuthenticatedRequest} from '@auth/auth.interface';
import {Response} from 'express';
import {PolicyComponentsStuff} from '../../policy-components-stuff';
import {getMongoRepository} from 'typeorm';
import {Policy} from '@entity/policy';
import {PolicyOtherError} from '@policy-engine/errors';
import {IPolicyInterfaceBlock} from '@policy-engine/policy-engine.interface';

/**
 * Block permissions middleware
 * @param req
 * @param res
 * @param next
 */
export async function BlockPermissions(req: AuthenticatedRequest, res: Response, next: Function): Promise<void> {
    try {
        const block = PolicyComponentsStuff.GetBlockByUUID(req.params.uuid) as any;
        if (!block) {
            const err = new PolicyOtherError('Unexisting block', req.params.uuid, 404);
            res.status(err.errorObject.code).send(err.errorObject);
            return;
        }

        const currentPolicy = await getMongoRepository(Policy).findOne(block.policyId);
        const role = (typeof currentPolicy.registeredUsers === 'object') ? currentPolicy.registeredUsers[req.user.did] : null;

        if (PolicyComponentsStuff.IfHasPermission(req.params.uuid, role, req.user)) {
            req['block'] = block;
            next();
        } else {
            const err = new PolicyOtherError('Unexisting block', req.params.uuid, 404);
            res.status(err.errorObject.code).send(err.errorObject);
        }
    } catch (e) {
        const err = new PolicyOtherError(e.message, req.params.uuid, 404);
        res.status(err.errorObject.code).send(err.errorObject);
    }
}
