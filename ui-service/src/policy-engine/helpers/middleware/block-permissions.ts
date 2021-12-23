import {AuthenticatedRequest} from '../../../auth/auth.interface';
import {Response} from 'express';
import {StateContainer} from '../../state-container';
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
    const block = StateContainer.GetBlockByUUID(req.params.uuid) as any;
    const currentPolicy = await getMongoRepository(Policy).findOne(block.policyId);
    const role = (typeof currentPolicy.registeredUsers === 'object') ? currentPolicy.registeredUsers[req.user.did] : null;

    if (StateContainer.IfUUIDRegistered(req.params.uuid) &&
        StateContainer.IfHasPermission(req.params.uuid, role, req.user)) {
        next();
    } else {
        res.sendStatus(404);
    }
}
