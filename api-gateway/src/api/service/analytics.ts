import { Body, Controller, HttpCode, HttpException, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiInternalServerErrorResponse, ApiBody, ApiOkResponse, ApiOperation, ApiTags, ApiExtraModels, ApiQuery } from '@nestjs/swagger';
import { Permissions } from '@guardian/interfaces';
import { FilterDocumentsDTO, FilterModulesDTO, FilterPoliciesDTO, FilterSchemasDTO, FilterSearchPoliciesDTO, InternalServerErrorDTO, CompareDocumentsDTO, CompareModulesDTO, ComparePoliciesDTO, CompareSchemasDTO, SearchPoliciesDTO, FilterToolsDTO, CompareToolsDTO, FilterSearchBlocksDTO, SearchBlocksDTO, Examples } from '#middlewares';
import { AuthUser, Auth } from '#auth';
import { IAuthUser } from '@guardian/common';
import { Guardians, ONLY_SR, InternalException } from '#helpers';

@Controller('analytics')
@ApiTags('analytics')
export class AnalyticsApi {
    /**
     * Search policies
     */
    @Post('/search/policies')
    @Auth(
        Permissions.ANALYTIC_POLICY_READ,
        // UserRole.STANDARD_REGISTRY,
    )
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
                    policyId: Examples.DB_ID
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SearchPoliciesDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(FilterSearchPoliciesDTO, SearchPoliciesDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async searchPolicies(
        @AuthUser() user: IAuthUser,
        @Body() filters: FilterSearchPoliciesDTO
    ): Promise<SearchPoliciesDTO> {
        const policyId = filters ? filters.policyId : null;
        if (!policyId) {
            throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            const guardians = new Guardians();
            return await guardians.searchPolicies(user, policyId);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Compare policies
     */
    @Post('/compare/policies')
    @Auth(
        Permissions.ANALYTIC_POLICY_READ,
        // UserRole.STANDARD_REGISTRY,
    )
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
                    policyId1: Examples.DB_ID,
                    policyId2: Examples.DB_ID,
                    eventsLvl: '0',
                    propLvl: '0',
                    childrenLvl: '0',
                    idLvl: '0'
                }
            },
            Filter2: {
                value: {
                    policyIds: [Examples.DB_ID, Examples.DB_ID],
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
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(FilterPoliciesDTO, ComparePoliciesDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async comparePolicies(
        @AuthUser() user: IAuthUser,
        @Body() filters: FilterPoliciesDTO
    ): Promise<ComparePoliciesDTO> {
        const policyId1 = filters ? filters.policyId1 : null;
        const policyId2 = filters ? filters.policyId2 : null;
        const policyIds = filters ? filters.policyIds : null;
        const eventsLvl = filters ? filters.eventsLvl : null;
        const propLvl = filters ? filters.propLvl : null;
        const childrenLvl = filters ? filters.childrenLvl : null;
        const idLvl = filters ? filters.idLvl : null;

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
            const guardians = new Guardians();
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
            await InternalException(error);
        }
    }

    /**
     * Compare modules
     */
    @Post('/compare/modules')
    @Auth(
        Permissions.ANALYTIC_MODULE_READ,
        // UserRole.STANDARD_REGISTRY,
    )
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
                    moduleId1: Examples.DB_ID,
                    moduleId2: Examples.DB_ID,
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
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(FilterModulesDTO, CompareModulesDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async compareModules(
        @AuthUser() user: IAuthUser,
        @Body() filters: FilterModulesDTO
    ): Promise<CompareModulesDTO> {
        const moduleId1 = filters ? filters.moduleId1 : null;
        const moduleId2 = filters ? filters.moduleId2 : null;
        const eventsLvl = filters ? filters.eventsLvl : null;
        const propLvl = filters ? filters.propLvl : null;
        const childrenLvl = filters ? filters.childrenLvl : null;
        const idLvl = filters ? filters.idLvl : null;
        if (!moduleId1 || !moduleId2) {
            throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            const guardians = new Guardians();
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
            await InternalException(error);
        }
    }

    /**
     * Compare schemas
     */
    @Post('/compare/schemas')
    @Auth(
        Permissions.ANALYTIC_SCHEMA_READ,
        // UserRole.STANDARD_REGISTRY,
    )
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
                    schemaId1: Examples.DB_ID,
                    schemaId2: Examples.DB_ID,
                    idLvl: '0'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: CompareSchemasDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(FilterSchemasDTO, CompareSchemasDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async compareSchemas(
        @AuthUser() user: IAuthUser,
        @Body() filters: FilterSchemasDTO
    ): Promise<CompareSchemasDTO> {
        const schemaId1 = filters ? filters.schemaId1 : null;
        const schemaId2 = filters ? filters.schemaId2 : null;
        const idLvl = filters ? filters.idLvl : null;
        if (!schemaId1 || !schemaId2) {
            throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            const guardians = new Guardians();
            return await guardians.compareSchemas(user, null, schemaId1, schemaId2, idLvl);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Compare documents
     */
    @Post('/compare/documents')
    @Auth(
        Permissions.ANALYTIC_DOCUMENT_READ,
        // UserRole.STANDARD_REGISTRY,
    )
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
                    documentId1: Examples.DB_ID,
                    documentId2: Examples.DB_ID
                }
            },
            Filter2: {
                value: {
                    documentIds: [Examples.DB_ID, Examples.DB_ID],
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: CompareDocumentsDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(FilterDocumentsDTO, CompareDocumentsDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async compareDocuments(
        @AuthUser() user: IAuthUser,
        @Body() filters: FilterDocumentsDTO
    ): Promise<CompareDocumentsDTO> {
        const documentId1 = filters ? filters.documentId1 : null;
        const documentId2 = filters ? filters.documentId2 : null;
        const documentIds = filters ? filters.documentIds : null;
        const eventsLvl = filters ? filters.eventsLvl : null;
        const propLvl = filters ? filters.propLvl : null;
        const childrenLvl = filters ? filters.childrenLvl : null;
        const idLvl = filters ? filters.idLvl : null;
        const keyLvl = 0;
        const refLvl = 0;

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
            const guardians = new Guardians();
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
            await InternalException(error);
        }
    }

    /**
     * Compare tools
     */
    @Post('/compare/tools')
    @Auth(
        Permissions.ANALYTIC_TOOL_READ,
        // UserRole.STANDARD_REGISTRY,
    )
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
                    toolId1: Examples.DB_ID,
                    toolId2: Examples.DB_ID
                }
            },
            Filter2: {
                value: {
                    toolIds: [Examples.DB_ID, Examples.DB_ID],
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: CompareToolsDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(FilterToolsDTO, CompareToolsDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async compareTools(
        @AuthUser() user: IAuthUser,
        @Body() filters: FilterToolsDTO
    ): Promise<CompareToolsDTO> {
        const toolId1 = filters ? filters.toolId1 : null;
        const toolId2 = filters ? filters.toolId2 : null;
        const toolIds = filters ? filters.toolIds : null;
        const eventsLvl = filters ? filters.eventsLvl : null;
        const propLvl = filters ? filters.propLvl : null;
        const childrenLvl = filters ? filters.childrenLvl : null;
        const idLvl = filters ? filters.idLvl : null;

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
            const guardians = new Guardians();
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
            await InternalException(error);
        }
    }

    /**
     * Compare policies (CSV)
     */
    @Post('/compare/policies/export')
    @Auth(
        Permissions.ANALYTIC_POLICY_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Compare policies.',
        description: 'Compare policies.' + ONLY_SR,
    })
    @ApiQuery({
        name: 'type',
        type: String,
        description: 'File type',
        required: true,
        example: 'csv'
    })
    @ApiBody({
        description: 'Filters.',
        required: true,
        type: FilterPoliciesDTO,
        examples: {
            Filter1: {
                value: {
                    policyId1: Examples.DB_ID,
                    policyId2: Examples.DB_ID,
                    eventsLvl: '0',
                    propLvl: '0',
                    childrenLvl: '0',
                    idLvl: '0'
                }
            },
            Filter2: {
                value: {
                    policyIds: [Examples.DB_ID, Examples.DB_ID],
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
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(FilterPoliciesDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async comparePoliciesExport(
        @AuthUser() user: IAuthUser,
        @Body() filters: FilterPoliciesDTO,
        @Query('type') type: string
    ): Promise<string> {
        const policyId1 = filters ? filters.policyId1 : null;
        const policyId2 = filters ? filters.policyId2 : null;
        const policyIds = filters ? filters.policyIds : null;
        const eventsLvl = filters ? filters.eventsLvl : null;
        const propLvl = filters ? filters.propLvl : null;
        const childrenLvl = filters ? filters.childrenLvl : null;
        const idLvl = filters ? filters.idLvl : null;

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
            const guardians = new Guardians();
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
            await InternalException(error);
        }
    }

    /**
     * Compare modules (CSV)
     */
    @Post('/compare/modules/export')
    @Auth(
        Permissions.ANALYTIC_MODULE_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Compare modules.',
        description: 'Compare modules.' + ONLY_SR,
    })
    @ApiQuery({
        name: 'type',
        type: String,
        description: 'File type',
        required: true,
        example: 'csv'
    })
    @ApiBody({
        description: 'Filters.',
        required: true,
        type: FilterModulesDTO,
        examples: {
            Filter: {
                value: {
                    moduleId1: Examples.DB_ID,
                    moduleId2: Examples.DB_ID,
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
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(FilterModulesDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async compareModulesExport(
        @AuthUser() user: IAuthUser,
        @Body() filters: FilterModulesDTO,
        @Query('type') type: string
    ): Promise<string> {
        const moduleId1 = filters ? filters.moduleId1 : null;
        const moduleId2 = filters ? filters.moduleId2 : null;
        const eventsLvl = filters ? filters.eventsLvl : null;
        const propLvl = filters ? filters.propLvl : null;
        const childrenLvl = filters ? filters.childrenLvl : null;
        const idLvl = filters ? filters.idLvl : null;
        if (!moduleId1 || !moduleId2) {
            throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            const guardians = new Guardians();
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
            await InternalException(error);
        }
    }

    /**
     * Compare schemas (CSV)
     */
    @Post('/compare/schemas/export')
    @Auth(
        Permissions.ANALYTIC_SCHEMA_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Compare schemas.',
        description: 'Compare schemas.' + ONLY_SR,
    })
    @ApiQuery({
        name: 'type',
        type: String,
        description: 'File type',
        required: true,
        example: 'csv'
    })
    @ApiBody({
        description: 'Filters.',
        required: true,
        type: FilterSchemasDTO,
        examples: {
            Filter: {
                value: {
                    schemaId1: Examples.DB_ID,
                    schemaId2: Examples.DB_ID,
                    idLvl: '0'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: String
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(FilterSchemasDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async compareSchemasExport(
        @AuthUser() user: IAuthUser,
        @Body() filters: FilterSchemasDTO,
        @Query('type') type: string
    ): Promise<string> {
        const schemaId1 = filters ? filters.schemaId1 : null;
        const schemaId2 = filters ? filters.schemaId2 : null;
        const idLvl = filters ? filters.idLvl : null;
        if (!schemaId1 || !schemaId2) {
            throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            const guardians = new Guardians();
            return await guardians.compareSchemas(user, type, schemaId1, schemaId2, idLvl);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Compare documents (CSV)
     */
    @Post('/compare/documents/export')
    @Auth(
        Permissions.ANALYTIC_DOCUMENT_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Compare documents.',
        description: 'Compare documents.' + ONLY_SR,
    })
    @ApiQuery({
        name: 'type',
        type: String,
        description: 'File type',
        required: true,
        example: 'csv'
    })
    @ApiBody({
        description: 'Filters.',
        required: true,
        type: FilterDocumentsDTO,
        examples: {
            Filter1: {
                value: {
                    documentId1: Examples.DB_ID,
                    documentId2: Examples.DB_ID
                }
            },
            Filter2: {
                value: {
                    documentIds: [Examples.DB_ID, Examples.DB_ID],
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: String
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(FilterDocumentsDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async compareDocumentsExport(
        @AuthUser() user: IAuthUser,
        @Body() filters: FilterDocumentsDTO,
        @Query('type') type: string
    ): Promise<string> {
        const documentId1 = filters ? filters.documentId1 : null;
        const documentId2 = filters ? filters.documentId2 : null;
        const documentIds = filters ? filters.documentIds : null;
        const eventsLvl = filters ? filters.eventsLvl : null;
        const propLvl = filters ? filters.propLvl : null;
        const childrenLvl = filters ? filters.childrenLvl : null;
        const idLvl = filters ? filters.idLvl : null;
        const keyLvl = 0;
        const refLvl = 0;
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
            const guardians = new Guardians();
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
            await InternalException(error);
        }
    }

    /**
     * Compare tools (CSV)
     */
    @Post('/compare/tools/export')
    @Auth(
        Permissions.ANALYTIC_TOOL_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Compare tools.',
        description: 'Compare tools.' + ONLY_SR,
    })
    @ApiQuery({
        name: 'type',
        type: String,
        description: 'File type',
        required: true,
        example: 'csv'
    })
    @ApiBody({
        description: 'Filters.',
        required: true,
        type: FilterToolsDTO,
        examples: {
            Filter1: {
                value: {
                    toolId1: Examples.DB_ID,
                    toolId2: Examples.DB_ID
                }
            },
            Filter2: {
                value: {
                    toolIds: [Examples.DB_ID, Examples.DB_ID],
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: String
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(FilterToolsDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async compareToolsExport(
        @AuthUser() user: IAuthUser,
        @Body() filters: FilterToolsDTO,
        @Query('type') type: string
    ): Promise<string> {
        const toolId1 = filters ? filters.toolId1 : null;
        const toolId2 = filters ? filters.toolId2 : null;
        const toolIds = filters ? filters.toolIds : null;
        const eventsLvl = filters ? filters.eventsLvl : null;
        const propLvl = filters ? filters.propLvl : null;
        const childrenLvl = filters ? filters.childrenLvl : null;
        const idLvl = filters ? filters.idLvl : null;
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
            const guardians = new Guardians();
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
            await InternalException(error);
        }
    }

    /**
     * Search same blocks
     */
    @Post('/search/blocks')
    @Auth(
        Permissions.ANALYTIC_POLICY_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Search same blocks.',
        description: 'Search same blocks.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Filters.',
        required: true,
        type: FilterSearchBlocksDTO,
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
        type: SearchBlocksDTO,
        isArray: true
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(FilterSearchBlocksDTO, SearchBlocksDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async searchBlocks(
        @AuthUser() user: IAuthUser,
        @Body() filters: FilterSearchBlocksDTO
    ): Promise<SearchBlocksDTO[]> {
        const guardians = new Guardians();
        const id = filters ? filters.id : null;
        const config = filters ? filters.config : null;
        if (!id || !config) {
            throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            return await guardians.searchBlocks(config, id, user);
        } catch (error) {
            await InternalException(error);
        }
    }
}
