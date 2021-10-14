import {AuthenticatedRequest} from '../../../auth/auth.interface';
import {Response} from 'express';
import {StateContainer} from '../../state-container';

/**
 * Block permissions middleware
 * @param req
 * @param res
 * @param next
 */
export async function BlockPermissions(req: AuthenticatedRequest, res: Response, next: Function): Promise<void> {
    if (StateContainer.IfUUIDRegistered(req.params.uuid) &&
        StateContainer.IfHasPermission(req.params.uuid, req.user.role)) {
        next();
    } else {
        res.sendStatus(404);
    }
}
