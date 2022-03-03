import {PolicyComponentsUtils} from '../../policy-components-utils';
import {Response} from 'express';
import {AuthenticatedRequest} from '@auth/auth.interface';

/**
 * Block access middleware
 * @param req
 * @param res
 * @param next
 */
export function BlockAccess(req: AuthenticatedRequest, res: Response, next: Function) {
    const block = PolicyComponentsUtils.GetBlockByUUID<any>(req.params.uuid);
    const type = PolicyComponentsUtils.GetBlockRef(block).blockClassName;
    let noAccsess = true;
    switch (req.method) {
        case 'GET':
            if (['EventBlock', 'DataSourceBlock', 'ContainerBlock', 'DataSourceAddon'].includes(type)) {
                noAccsess = false;
            }
            break;

        case 'POST':
            if (['EventBlock', 'DataSourceAddon'].includes(type)) {
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
