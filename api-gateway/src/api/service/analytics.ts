import { Guardians } from '../../helpers/guardians.js';
import { Body, Controller, HttpCode, HttpException, HttpStatus, Post, Req } from '@nestjs/common';
import {
    ApiInternalServerErrorResponse,
    ApiUnauthorizedResponse,
    ApiForbiddenResponse,
    ApiBody,
    ApiOkResponse,
    ApiOperation,
    ApiSecurity,
    ApiTags
} from '@nestjs/swagger';
import { UserRole } from '@guardian/interfaces';
import {
    FilterDocumentsDTO,
    FilterModulesDTO,
    FilterPoliciesDTO,
    FilterSchemasDTO,
    FilterSearchPoliciesDTO,
    InternalServerErrorDTO,
    CompareDocumentsDTO,
    CompareModulesDTO,
    ComparePoliciesDTO,
    CompareSchemasDTO,
    SearchPoliciesDTO,
    FilterToolsDTO,
    CompareToolsDTO
} from '../../middlewares/validation/schemas/index.js';
import { Auth } from '../../auth/auth.decorator.js';

const ONLY_SR = ' Only users with the Standard Registry role are allowed to make the request.'

@Controller('analytics')
@ApiTags('analytics')
export class AnalyticsApi {
    /**
     * Search policies
     */
    @Post('/search/policies')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Search policies.',
        description: 'Search policies.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Filters.',
        required: true,
        type: FilterSearchPoliciesDTO,
        examples: {
            Filter: {
                value: {
                    policyId: '000000000000000000000000'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SearchPoliciesDTO,
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
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

    /**
     * Compare policies
     */
    @Post('/compare/policies')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Compare policies.',
        description: 'Compare policies.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Filters.',
        required: true,
        type: FilterPoliciesDTO,
        examples: {
            Filter1: {
                value: {
                    policyId1: '000000000000000000000001',
                    policyId2: '000000000000000000000002',
                    eventsLvl: '0',
                    propLvl: '0',
                    childrenLvl: '0',
                    idLvl: '0'
                }
            },
            Filter2: {
                value: {
                    policyIds: ['000000000000000000000001', '000000000000000000000002'],
                    eventsLvl: '0',
                    propLvl: '0',
                    childrenLvl: '0',
                    idLvl: '0'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ComparePoliciesDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
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

    /**
     * Compare modules
     */
    @Post('/compare/modules')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Compare modules.',
        description: 'Compare modules.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Filters.',
        required: true,
        type: FilterModulesDTO,
        examples: {
            Filter: {
                value: {
                    moduleId1: '000000000000000000000001',
                    moduleId2: '000000000000000000000002',
                    propLvl: '0',
                    childrenLvl: '0',
                    idLvl: '0'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: CompareModulesDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
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
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Compare schemas.',
        description: 'Compare schemas.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Filters.',
        required: true,
        type: FilterSchemasDTO,
        examples: {
            Filter: {
                value: {
                    schemaId1: '000000000000000000000001',
                    schemaId2: '000000000000000000000002',
                    idLvl: '0'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: CompareSchemasDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
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
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Compare documents.',
        description: 'Compare documents.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Filters.',
        required: true,
        type: FilterDocumentsDTO,
        examples: {
            Filter1: {
                value: {
                    documentId1: '000000000000000000000001',
                    documentId2: '000000000000000000000002'
                }
            },
            Filter2: {
                value: {
                    documentIds: ['000000000000000000000001', '000000000000000000000002'],
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: CompareDocumentsDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY, UserRole.AUDITOR, UserRole.USER)
    async compareDocuments(@Body() body, @Req() req): Promise<any> {
        const guardians = new Guardians();
        const documentId1 = body ? body.documentId1 : null;
        const documentId2 = body ? body.documentId2 : null;
        const documentIds = body ? body.documentIds : null;
        const eventsLvl = body ? body.eventsLvl : null;
        const propLvl = body ? body.propLvl : null;
        const childrenLvl = body ? body.childrenLvl : null;
        const idLvl = body ? body.idLvl : null;
        const keyLvl = 0;
        const refLvl = 0;
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
                idLvl,
                keyLvl,
                refLvl
            );
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Compare tools
     */
    @Post('/compare/tools')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Compare tools.',
        description: 'Compare tools.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Filters.',
        required: true,
        type: FilterToolsDTO,
        examples: {
            Filter1: {
                value: {
                    toolId1: '000000000000000000000001',
                    toolId2: '000000000000000000000002'
                }
            },
            Filter2: {
                value: {
                    toolIds: ['000000000000000000000001', '000000000000000000000002'],
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: CompareToolsDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY, UserRole.AUDITOR, UserRole.USER)
    async compareTools(@Body() body, @Req() req): Promise<any> {
        const guardians = new Guardians();
        const toolId1 = body ? body.toolId1 : null;
        const toolId2 = body ? body.toolId2 : null;
        const toolIds = body ? body.toolIds : null;
        const eventsLvl = body ? body.eventsLvl : null;
        const propLvl = body ? body.propLvl : null;
        const childrenLvl = body ? body.childrenLvl : null;
        const idLvl = body ? body.idLvl : null;
        const user = req.user;
        if (!user) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        let ids: string[];
        if (toolId1 && toolId2) {
            ids = [toolId1, toolId2];
        } else if (Array.isArray(toolIds) && toolIds.length > 1) {
            ids = toolIds;
        }
        if (!ids) {
            throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            return await guardians.compareTools(
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
     * Compare policies (CSV)
     */
    @Post('/compare/policies/export')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Compare policies.',
        description: 'Compare policies.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Filters.',
        required: true,
        type: FilterPoliciesDTO,
        examples: {
            Filter1: {
                value: {
                    policyId1: '000000000000000000000001',
                    policyId2: '000000000000000000000002',
                    eventsLvl: '0',
                    propLvl: '0',
                    childrenLvl: '0',
                    idLvl: '0'
                }
            },
            Filter2: {
                value: {
                    policyIds: ['000000000000000000000001', '000000000000000000000002'],
                    eventsLvl: '0',
                    propLvl: '0',
                    childrenLvl: '0',
                    idLvl: '0'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: String
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
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

    /**
     * Compare modules (CSV)
     */
    @Post('/compare/modules/export')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Compare modules.',
        description: 'Compare modules.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Filters.',
        required: true,
        type: FilterModulesDTO,
        examples: {
            Filter: {
                value: {
                    moduleId1: '000000000000000000000001',
                    moduleId2: '000000000000000000000002',
                    propLvl: '0',
                    childrenLvl: '0',
                    idLvl: '0'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: String
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
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
     * Compare schemas (CSV)
     */
    @Post('/compare/schemas/export')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Compare schemas.',
        description: 'Compare schemas.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Filters.',
        required: true,
        type: FilterSchemasDTO,
        examples: {
            Filter: {
                value: {
                    schemaId1: '000000000000000000000001',
                    schemaId2: '000000000000000000000002',
                    idLvl: '0'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: String
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
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
     * Compare documents (CSV)
     */
    @Post('/compare/documents/export')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Compare documents.',
        description: 'Compare documents.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Filters.',
        required: true,
        type: FilterDocumentsDTO,
        examples: {
            Filter1: {
                value: {
                    documentId1: '000000000000000000000001',
                    documentId2: '000000000000000000000002'
                }
            },
            Filter2: {
                value: {
                    documentIds: ['000000000000000000000001', '000000000000000000000002'],
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: String
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY, UserRole.AUDITOR, UserRole.USER)
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
        const keyLvl = 0;
        const refLvl = 0;
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
                idLvl,
                keyLvl,
                refLvl
            );
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Compare tools (CSV)
     */
    @Post('/compare/tools/export')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Compare tools.',
        description: 'Compare tools.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Filters.',
        required: true,
        type: FilterToolsDTO,
        examples: {
            Filter1: {
                value: {
                    toolId1: '000000000000000000000001',
                    toolId2: '000000000000000000000002'
                }
            },
            Filter2: {
                value: {
                    toolIds: ['000000000000000000000001', '000000000000000000000002'],
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: String
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY, UserRole.AUDITOR, UserRole.USER)
    async compareToolsExport(@Body() body, @Req() req): Promise<any> {
        const guardians = new Guardians();
        const type = req.query ? req.query.type : null;
        const toolId1 = body ? body.toolId1 : null;
        const toolId2 = body ? body.toolId2 : null;
        const toolIds = body ? body.toolIds : null;
        const eventsLvl = body ? body.eventsLvl : null;
        const propLvl = body ? body.propLvl : null;
        const childrenLvl = body ? body.childrenLvl : null;
        const idLvl = body ? body.idLvl : null;
        const user = req.user;
        if (!user) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
        let ids: string[];
        if (toolId1 && toolId2) {
            ids = [toolId1, toolId2];
        } else if (Array.isArray(toolIds) && toolIds.length > 1) {
            ids = toolIds;
        }
        if (!ids) {
            throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            return await guardians.compareTools(
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

    /**
     * Search same blocks
     */
    @Post('/search/blocks')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Search same blocks.',
        description: 'Search same blocks.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Filters.',
        required: true,
        type: FilterSearchPoliciesDTO,
        examples: {
            Filter: {
                value: {
                    uuid: '',
                    config: {}
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SearchPoliciesDTO,
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async searchBlocks(@Body() body, @Req() req): Promise<any> {
        const guardians = new Guardians();
        const id = body ? body.id : null;
        const config = body ? body.config : null;
        const user = req.user;
        if (!user) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
        if (!id || !config) {
            throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            return await guardians.searchBlocks(config, id, user);
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
