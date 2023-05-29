import { Guardians } from '@helpers/guardians';
import { Logger } from '@guardian/common';
import { Body, Controller, HttpCode, HttpException, HttpStatus, Post, Req } from '@nestjs/common';

@Controller('analytics')
export class AnalyticsApi {
    @Post('/compare/policies')
    @HttpCode(HttpStatus.OK)
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
    @HttpCode(HttpStatus.OK)
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
    @HttpCode(HttpStatus.OK)
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
    @HttpCode(HttpStatus.OK)
    async compareSchemasExport(@Body() body, @Req() req): Promise<any> {
        const guardians = new Guardians();
        const type = req.query ? req.query.type : null;
        const schemaId1 = body ? body.schemaId1 : null;
        const schemaId2 = body ? body.schemaId2 : null;
        const idLvl = body ? body.idLvl : null;
        const user = req.user;
        try {
            return await guardians.compareSchemas(user, type, schemaId1, schemaId2, idLvl);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }
}
