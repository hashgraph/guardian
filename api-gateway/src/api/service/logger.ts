import { permissionHelper } from '@auth/authorizationHelper';
import { Request, Response, Router } from 'express';
import { IPageParameters, UserRole } from 'interfaces';
import { Logger } from 'logger-helper';

/**
 * Logger route
 */
export const loggerAPI = Router();

loggerAPI.post('/', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: Request, res: Response) => {
    try {
        const filters: any = {};
        const pageParameters: IPageParameters = {};
        if (req.body.type) {
            filters.type = req.body.type;
        }
        if (req.body.date) {
            const sDate = new Date(req.body.date);
            sDate.setHours(0, 0, 0, 0);
            const eDate = new Date(sDate);
            eDate.setDate(sDate.getDate() + 1);
            filters.datetime = {
                $gte: sDate,
                $lt: eDate
            };
        }
        if (req.body.attributes && req.body.attributes.length !== 0) {
            filters.attributes = { $all: req.body.attributes };
        }
        if (req.body.pageSize) {
            pageParameters.skip = (req.body.pageIndex || 0) * req.body.pageSize;
            pageParameters.take = req.body.pageSize;
        }
        const logger = new Logger();
        const logsObj = await logger.getLogs(filters, pageParameters, req.body.sortDirection);
        return res.send(logsObj);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});
