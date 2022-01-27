import {AuthenticatedRequest} from '../../../auth/auth.interface';
import {Response} from 'express';
import {PolicyComponentsStuff} from '../../policy-components-stuff';
import {PolicyBlockHelpers} from '@policy-engine/helpers/policy-block-helpers';
import {getMongoRepository} from 'typeorm';
import {Policy} from '@entity/policy';

/**
 * Block permissions middleware
 * @param req
 * @param res
 * @param next
 */
export async function BlockPermissions(req: AuthenticatedRequest, res: Response, next: Function): Promise<void> {
    const block = PolicyComponentsStuff.GetBlockByUUID(req.params.uuid) as any;
    const currentPolicy = await getMongoRepository(Policy).findOne(block.policyId);
    const role = (typeof currentPolicy.registeredUsers === 'object') ? currentPolicy.registeredUsers[req.user.did] : null;

    if (PolicyComponentsStuff.IfUUIDRegistered(req.params.uuid) &&
        PolicyComponentsStuff.IfHasPermission(req.params.uuid, role, req.user)) {
        next();
    } else {
        res.sendStatus(404);
    }
}
