import { permissionHelper } from '@auth/authorization-helper';
import { Request, Response, Router, NextFunction } from 'express';
import { IPageParameters, UserRole } from '@guardian/interfaces';
import { Logger } from '@guardian/common';

/**
 * Logger route
 */
export const loggerAPI = Router();

/**
 * Add escape characters
 * @param {string} text
 * @returns {string}
 */
function escapeRegExp(text: string): string {
    if (!text) {
        return '';
    }

    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

loggerAPI.post('/', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filters: any = {};
        const pageParameters: IPageParameters = {};
        if (req.body.type) {
            filters.type = req.body.type;
        }
        if (req.body.startDate && req.body.endDate) {
            const sDate = new Date(req.body.startDate);
            sDate.setHours(0, 0, 0, 0);
            const eDate = new Date(req.body.endDate);
            eDate.setHours(23, 59, 59, 999);
            filters.datetime = {
                $gte: sDate,
                $lt: eDate
            };
        }
        if (req.body.attributes && req.body.attributes.length !== 0) {
            filters.attributes = { $in: req.body.attributes };
        }
        if (req.body.message) {
            filters.message = {
                $regex: `.*${escapeRegExp(req.body.message)}.*`,
                $options: 'i'
            }
        }
        if (req.body.pageSize) {
            pageParameters.offset = (req.body.pageIndex || 0) * req.body.pageSize;
            pageParameters.limit = req.body.pageSize;
        }
        const logger = new Logger();
        const logsObj = await logger.getLogs(filters, pageParameters, req.body.sortDirection);
        return res.send(logsObj);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

loggerAPI.get('/attributes', permissionHelper(UserRole.STANDARD_REGISTRY),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
        const logger = new Logger();
        if (req.query.existingAttributes && !Array.isArray(req.query.existingAttributes)) {
            req.query.existingAttributes = [req.query.existingAttributes as string];
        }
        const attributes = await logger.getAttributes(escapeRegExp(req.query.name as string), req.query.existingAttributes as string[]);
        return res.send(attributes);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});
