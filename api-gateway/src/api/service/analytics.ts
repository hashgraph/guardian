import { Guardians } from '@helpers/guardians';
import { Body, Controller, HttpCode, HttpException, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller('analytics')
@ApiTags('analytics')
export class AnalyticsApi {
    @Post('/search/policies')
    @HttpCode(HttpStatus.OK)
    async searchPolicies(@Body() body, @Req() req): Promise<any> {
        const guardians = new Guardians();
        const policyId = body ? body.policyId : null;
        const user = req.user;
        if (!user) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
        if (!policyId) {
            throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            return await guardians.searchPolicies(
                user,
                policyId,
            );
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/compare/policies')
    @HttpCode(HttpStatus.OK)
    async comparePolicies(@Body() body, @Req() req): Promise<any> {
        const guardians = new Guardians();
        const policyId1 = body ? body.policyId1 : null;
        const policyId2 = body ? body.policyId2 : null;
        const policyIds = body ? body.policyIds : null;
        const eventsLvl = body ? body.eventsLvl : null;
        const propLvl = body ? body.propLvl : null;
        const childrenLvl = body ? body.childrenLvl : null;
        const idLvl = body ? body.idLvl : null;
        const user = req.user;
        if (!user) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        let ids: string[];
        if (policyId1 && policyId2) {
            ids = [policyId1, policyId2];
        } else if (Array.isArray(policyIds) && policyIds.length > 1) {
            ids = policyIds;
        }

        if (!ids) {
            throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            return await guardians.comparePolicies(
                user,
                null,
                ids,
                eventsLvl,
                propLvl,
                childrenLvl,
                idLvl
            );
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/compare/modules')
    @HttpCode(HttpStatus.OK)
    async compareModules(@Body() body, @Req() req): Promise<any> {
        const guardians = new Guardians();
        const moduleId1 = body ? body.moduleId1 : null;
        const moduleId2 = body ? body.moduleId2 : null;
        const eventsLvl = body ? body.eventsLvl : null;
        const propLvl = body ? body.propLvl : null;
        const childrenLvl = body ? body.childrenLvl : null;
        const idLvl = body ? body.idLvl : null;
        const user = req.user;
        if (!user) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
        if (!moduleId1 || !moduleId2) {
            throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            return await guardians.compareModules(
                user,
                null,
                moduleId1,
                moduleId2,
                eventsLvl,
                propLvl,
                childrenLvl,
                idLvl
            );
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
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
        if (!user) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
        if (!schemaId1 || !schemaId2) {
            throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            return await guardians.compareSchemas(user, null, schemaId1, schemaId2, idLvl);
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Compare documents
     */
    @Post('/compare/documents')
    @HttpCode(HttpStatus.OK)
    async compareDocuments(@Body() body, @Req() req): Promise<any> {
        const guardians = new Guardians();
        const documentId1 = body ? body.documentId1 : null;
        const documentId2 = body ? body.documentId2 : null;
        const documentIds = body ? body.documentIds : null;
        const eventsLvl = body ? body.eventsLvl : null;
        const propLvl = body ? body.propLvl : null;
        const childrenLvl = body ? body.childrenLvl : null;
        const idLvl = body ? body.idLvl : null;
        const user = req.user;
        if (!user) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        let ids: string[];
        if (documentId1 && documentId2) {
            ids = [documentId1, documentId2];
        } else if (Array.isArray(documentIds) && documentIds.length > 1) {
            ids = documentIds;
        }
        if (!ids) {
            throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            return await guardians.compareDocuments(
                user,
                null,
                ids,
                eventsLvl,
                propLvl,
                childrenLvl,
                idLvl
            );
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
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
        const policyIds = body ? body.policyIds : null;
        const eventsLvl = body ? body.eventsLvl : null;
        const propLvl = body ? body.propLvl : null;
        const childrenLvl = body ? body.childrenLvl : null;
        const idLvl = body ? body.idLvl : null;
        const user = req.user;
        if (!user) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
        let ids: string[];
        if (policyId1 && policyId2) {
            ids = [policyId1, policyId2];
        } else if (Array.isArray(policyIds) && policyIds.length > 1) {
            ids = policyIds;
        }
        if (!ids) {
            throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            return await guardians.comparePolicies(
                user,
                type,
                ids,
                eventsLvl,
                propLvl,
                childrenLvl,
                idLvl
            );
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/compare/modules/export')
    @HttpCode(HttpStatus.OK)
    async compareModulesExport(@Body() body, @Req() req): Promise<any> {
        const guardians = new Guardians();
        const type = req.query ? req.query.type : null;
        const moduleId1 = body ? body.moduleId1 : null;
        const moduleId2 = body ? body.moduleId2 : null;
        const eventsLvl = body ? body.eventsLvl : null;
        const propLvl = body ? body.propLvl : null;
        const childrenLvl = body ? body.childrenLvl : null;
        const idLvl = body ? body.idLvl : null;
        const user = req.user;
        if (!user) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
        if (!moduleId1 || !moduleId2) {
            throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            return await guardians.compareModules(
                user,
                type,
                moduleId1,
                moduleId2,
                eventsLvl,
                propLvl,
                childrenLvl,
                idLvl
            );
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
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
        if (!user) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
        if (!schemaId1 || !schemaId2) {
            throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            return await guardians.compareSchemas(user, type, schemaId1, schemaId2, idLvl);
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Compare documents export
     * @param body
     * @param req
     */
    @Post('/compare/documents/export')
    @HttpCode(HttpStatus.OK)
    async compareDocumentsExport(@Body() body, @Req() req): Promise<any> {
        const guardians = new Guardians();
        const type = req.query ? req.query.type : null;
        const documentId1 = body ? body.documentId1 : null;
        const documentId2 = body ? body.documentId2 : null;
        const documentIds = body ? body.documentIds : null;
        const eventsLvl = body ? body.eventsLvl : null;
        const propLvl = body ? body.propLvl : null;
        const childrenLvl = body ? body.childrenLvl : null;
        const idLvl = body ? body.idLvl : null;
        const user = req.user;
        if (!user) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
        let ids: string[];
        if (documentId1 && documentId2) {
            ids = [documentId1, documentId2];
        } else if (Array.isArray(documentIds) && documentIds.length > 1) {
            ids = documentIds;
        }
        if (!ids) {
            throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            return await guardians.compareDocuments(
                user,
                type,
                ids,
                eventsLvl,
                propLvl,
                childrenLvl,
                idLvl
            );
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
