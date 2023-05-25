import { Guardians } from '@helpers/guardians';
import { Response, Router, NextFunction } from 'express';
import { AuthenticatedRequest, Logger } from '@guardian/common';
import { Body, Controller, Post, Req } from '@nestjs/common';

@Controller('analytics')
export class AnalyticsApi {
    @Post('/compare/policies')
    async comparePolicies(@Body() body, @Req() req): Promise<any> {
        const guardians = new Guardians();
        const policyId1 = body ? body.policyId1 : null;
        const policyId2 = body ? body.policyId2 : null;
        const eventsLvl = body ? body.eventsLvl : null;
        const propLvl = body ? body.propLvl : null;
        const childrenLvl = body ? body.childrenLvl : null;
        const idLvl = body ? body.idLvl : null;
        const user = req.user;
        try {
            const result = await guardians.comparePolicies(
                user,
                null,
                policyId1,
                policyId2,
                eventsLvl,
                propLvl,
                childrenLvl,
                idLvl
            );
            return result;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Compare schemas
     */
    @Post('/compare/schemas')
    async compareSchemas(@Body() body, @Req() req): Promise<any> {
        const guardians = new Guardians();
        const schemaId1 = body ? body.schemaId1 : null;
        const schemaId2 = body ? body.schemaId2 : null;
        const idLvl = body ? body.idLvl : null;
        const user = req.user;
        try {
            return await guardians.compareSchemas(user, null, schemaId1, schemaId2, idLvl);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Compare policies export
     * @param body
     * @param req
     */
    @Post('/compare/policies/export')
    async comparePoliciesExport(@Body() body, @Req() req): Promise<any> {
        const guardians = new Guardians();
        const type = req.query ? req.query.type : null;
        const policyId1 = body ? body.policyId1 : null;
        const policyId2 = body ? body.policyId2 : null;
        const eventsLvl = body ? body.eventsLvl : null;
        const propLvl = body ? body.propLvl : null;
        const childrenLvl = body ? body.childrenLvl : null;
        const idLvl = body ? body.idLvl : null;
        const user = req.user;
        try {
            const result = await guardians.comparePolicies(
                user,
                type,
                policyId1,
                policyId2,
                eventsLvl,
                propLvl,
                childrenLvl,
                idLvl
            );
            return result
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * compareSchemasExport
     * @param body
     * @param req
     */
    @Post('/compare/schemas/export')
    async compareSchemasExport(@Body() body, @Req() req): Promise<any> {
        const guardians = new Guardians();
        const type = req.query ? req.query.type : null;
        const schemaId1 = body ? body.schemaId1 : null;
        const schemaId2 = body ? body.schemaId2 : null;
        const idLvl = body ? body.idLvl : null;
        const user = req.user;
        try {
            return await guardians.compareSchemas(user, type, schemaId1, schemaId2, idLvl);;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }
}

/**
 * User analytics route
 */
// export const analyticsAPI = Router();
//
// analyticsAPI.post('/compare/policies', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const guardians = new Guardians();
//     const policyId1 = req.body ? req.body.policyId1 : null;
//     const policyId2 = req.body ? req.body.policyId2 : null;
//     const eventsLvl = req.body ? req.body.eventsLvl : null;
//     const propLvl = req.body ? req.body.propLvl : null;
//     const childrenLvl = req.body ? req.body.childrenLvl : null;
//     const idLvl = req.body ? req.body.idLvl : null;
//     const user = req.user;
//     try {
//         const result = await guardians.comparePolicies(
//             user,
//             null,
//             policyId1,
//             policyId2,
//             eventsLvl,
//             propLvl,
//             childrenLvl,
//             idLvl
//         );
//         res.send(result);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// analyticsAPI.post('/compare/schemas', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const guardians = new Guardians();
//     const schemaId1 = req.body ? req.body.schemaId1 : null;
//     const schemaId2 = req.body ? req.body.schemaId2 : null;
//     const idLvl = req.body ? req.body.idLvl : null;
//     const user = req.user;
//     try {
//         const result = await guardians.compareSchemas(user, null, schemaId1, schemaId2, idLvl);
//         return res.send(result);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// analyticsAPI.post('/compare/policies/export', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const guardians = new Guardians();
//     const type = req.query ? req.query.type : null;
//     const policyId1 = req.body ? req.body.policyId1 : null;
//     const policyId2 = req.body ? req.body.policyId2 : null;
//     const eventsLvl = req.body ? req.body.eventsLvl : null;
//     const propLvl = req.body ? req.body.propLvl : null;
//     const childrenLvl = req.body ? req.body.childrenLvl : null;
//     const idLvl = req.body ? req.body.idLvl : null;
//     const user = req.user;
//     try {
//         const result = await guardians.comparePolicies(
//             user,
//             type,
//             policyId1,
//             policyId2,
//             eventsLvl,
//             propLvl,
//             childrenLvl,
//             idLvl
//         );
//         return res.send(result);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// analyticsAPI.post('/compare/schemas/export', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const guardians = new Guardians();
//     const type = req.query ? req.query.type : null;
//     const schemaId1 = req.body ? req.body.schemaId1 : null;
//     const schemaId2 = req.body ? req.body.schemaId2 : null;
//     const idLvl = req.body ? req.body.idLvl : null;
//     const user = req.user;
//     try {
//         const result = await guardians.compareSchemas(user, type, schemaId1, schemaId2, idLvl);
//         return res.send(result);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });
