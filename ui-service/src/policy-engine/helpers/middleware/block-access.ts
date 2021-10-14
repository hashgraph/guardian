import {PolicyBlockHelpers} from '@policy-engine/helpers/policy-block-helpers';
import {StateContainer} from '@policy-engine/state-container';
import {Response} from 'express';
import {AuthenticatedRequest} from '../../../auth/auth.interface';

/**
 * Block access middleware
 * @param req
 * @param res
 * @param next
 */
export function BlockAccess(req: AuthenticatedRequest, res: Response, next: Function) {
    const block = StateContainer.GetBlockByUUID<any>(req.params.uuid);
    const type = PolicyBlockHelpers.GetBlockRef(block).blockClassName;
    let noAccsess = true;
    switch (req.method) {
        case 'GET':
            if (['EventBlock', 'DataSourceBlock', 'ContainerBlock'].includes(type)) {
                noAccsess = false;
            }
            break;

        case 'POST':
            if (['EventBlock'].includes(type)) {
                noAccsess = false;
            }
            break;
    }

    if (noAccsess) {
        res.sendStatus(404);
        return;
    }

    next()
}
