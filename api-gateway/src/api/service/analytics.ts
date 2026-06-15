import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnprocessableEntityResponse, getSchemaPath } from '@nestjs/swagger';
import { EntityOwner, Permissions } from '@guardian/interfaces';
import {
    FilterDocumentsDTO,
    CompareDocumentsByIdsRequestDTO,
    CompareDocumentsByListRequestDTO,
    FilterModulesDTO,
    FilterPoliciesDTO,
    CompareOriginalPolicyFilterDTO,
    FilterSchemasDTO,
    CompareSchemasByIdsRequestDTO,
    CompareSchemasByListRequestDTO,
    FilterSearchPoliciesDTO,
    InternalServerErrorDTO,
    UnprocessableEntityErrorDTO,
    CompareDocumentsDTO,
    CompareDocumentsMultiDTO,
    CompareModulesDTO,
    ComparePoliciesDTO,
    ComparePoliciesMultiDTO,
    CompareSchemasDTO,
    SearchPoliciesDTO,
    FilterToolsDTO,
    CompareToolsDTO,
    CompareToolsByIdsRequestDTO,
    CompareToolsByListRequestDTO,
    CompareToolsMultiDTO,
    FilterSearchBlocksDTO,
    SearchBlocksDTO,
    Examples,
    ObjectExamples
} from '#middlewares';
import { AuthUser, Auth } from '#auth';
import { IAuthUser, PinoLogger } from '@guardian/common';
import { Guardians, ONLY_SR, InternalException } from '#helpers';

function getPolicyId(filters: FilterPoliciesDTO): {
    type: 'id' | 'file' | 'message',
    value: string | {
        id: string,
        name: string,
        value: string
    }
}[] {
    if (!filters) {
        throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
    }
    if (Array.isArray(filters.policies) && filters.policies.length > 1) {
        return filters.policies;
    } else if (Array.isArray(filters.policyIds) && filters.policyIds.length > 1) {
        return filters.policyIds.map((id) => {
            return {
                type: 'id',
                value: id
            }
        })
    } else if (filters.policyId1 && filters.policyId2) {
        return [{
            type: 'id',
            value: filters.policyId1
        }, {
            type: 'id',
            value: filters.policyId2
        }];
    } else {
        throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
    }
}

function getSchemaId(filters: FilterSchemasDTO): {
    type: 'id' | 'policy-message' | 'policy-file',
    value: string,
    policy?: string | {
        id: string,
        name: string,
        value: string
    }
}[] {
    if (!filters) {
        throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
    }
    if (Array.isArray(filters.schemas) && filters.schemas.length > 1) {
        return filters.schemas;
    } else if (filters.schemaId1 && filters.schemaId2) {
        return [{
            type: 'id',
            value: filters.schemaId1
        }, {
            type: 'id',
            value: filters.schemaId2
        }];
    } else {
        throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
    }
}

@Controller('analytics')
@ApiTags('analytics')
export class AnalyticsApi {
    constructor(private readonly logger: PinoLogger) {
    }

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
            },
            GlobalWithFilters: {
                value: ObjectExamples.SEARCH_POLICIES_REQUEST_GLOBAL_WITH_FILTERS
            },
            LocalWithPolicyAndTool: {
                value: ObjectExamples.SEARCH_POLICIES_REQUEST_LOCAL_WITH_POLICY_AND_TOOL
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SearchPoliciesDTO,
        examples: {
            WithPolicyId: {
                summary: 'Response for request with policyId',
                value: ObjectExamples.SEARCH_POLICIES_RESPONSE_WITH_POLICY_ID
            },
            GlobalWithFilters: {
                summary: 'Global search response with filters',
                value: ObjectExamples.SEARCH_POLICIES_RESPONSE_GLOBAL_WITH_FILTERS
            },
            LocalWithPolicyAndTool: {
                summary: 'Local response with target and tools filter',
                value: ObjectExamples.SEARCH_POLICIES_RESPONSE_LOCAL_WITH_POLICY_AND_TOOL
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    async searchPolicies(
        @AuthUser() user: IAuthUser,
        @Body() filters: FilterSearchPoliciesDTO
    ): Promise<SearchPoliciesDTO> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.searchPolicies(owner, filters);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
            MixedSources: {
                value: {
                    policies: [{
                        type: 'id',
                        value: Examples.DB_ID
                    }, {
                        type: 'message',
                        value: Examples.MESSAGE_ID
                    }, {
                        type: 'file',
                        value: {
                            id: Examples.UUID,
                            name: 'File Name',
                            value: 'base65...'
                        }
                    }],
                    eventsLvl: '0',
                    propLvl: '0',
                    childrenLvl: '0',
                    idLvl: '0'
                }
            },
            DatabaseOnly: {
                value: {
                    policyIds: [Examples.DB_ID, Examples.DB_ID_2],
                    eventsLvl: '0',
                    propLvl: '0',
                    childrenLvl: '0',
                    idLvl: '0'
                }
            },
            Legacy: {
                value: {
                    policyId1: Examples.DB_ID,
                    policyId2: Examples.DB_ID_2,
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
        schema: {
            oneOf: [
                { $ref: getSchemaPath(ComparePoliciesDTO) },
                { $ref: getSchemaPath(ComparePoliciesMultiDTO) }
            ]
        },
        examples: {
            SingleCompare: {
                summary: 'Compare two policies',
                value: ObjectExamples.COMPARE_POLICIES_RESPONSE_SINGLE
            },
            MultiCompare: {
                summary: 'Compare one policy with many',
                value: ObjectExamples.COMPARE_POLICIES_RESPONSE_MULTI
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: {
            statusCode: 422,
            message: 'Invalid parameters'
        }
    })
    @ApiExtraModels(ComparePoliciesDTO, ComparePoliciesMultiDTO)
    @HttpCode(HttpStatus.OK)
    async comparePolicies(
        @AuthUser() user: IAuthUser,
        @Body() filters: FilterPoliciesDTO
    ): Promise<ComparePoliciesDTO> {
        const policies = getPolicyId(filters);
        const owner = new EntityOwner(user);
        try {
            const guardians = new Guardians();
            return await guardians.comparePolicies(
                owner,
                null,
                policies,
                filters.eventsLvl,
                filters.propLvl,
                filters.childrenLvl,
                filters.idLvl
            );
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Compare policy with original state
     */
    @Post('/compare/policy/original/:policyId')
    @Auth(
        Permissions.ANALYTIC_POLICY_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOperation({
        summary: 'Compare policies with original state.',
        description: 'Compare policies with original state.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Filters.',
        required: true,
        type: CompareOriginalPolicyFilterDTO,
        examples: {
            OriginalPolicyFilter: {
                value: {
                    eventsLvl: '1',
                    propLvl: '1',
                    childrenLvl: '0',
                    idLvl: '0'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ComparePoliciesDTO,
        example: ObjectExamples.COMPARE_POLICIES_RESPONSE_SINGLE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    async compareOriginalPolicy(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() filters: CompareOriginalPolicyFilterDTO
    ): Promise<ComparePoliciesDTO> {
        const owner = new EntityOwner(user);

        try {
            const guardians = new Guardians();
            const comparedResult = await guardians.compareOriginalPolicies(
                owner,
                null,
                policyId,
                filters.eventsLvl,
                filters.propLvl,
                filters.childrenLvl,
                filters.idLvl
            );
            return comparedResult;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
                value: ObjectExamples.COMPARE_MODULES_REQUEST
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: CompareModulesDTO,
        example: ObjectExamples.COMPARE_MODULES_RESPONSE
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: {
            message: [
                'moduleId2 must be a string'
            ],
            error: 'Unprocessable Entity',
            statusCode: 422
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
            await InternalException(error, this.logger, user.id);
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
        schema: {
            oneOf: [
                { $ref: getSchemaPath(CompareSchemasByIdsRequestDTO) },
                { $ref: getSchemaPath(CompareSchemasByListRequestDTO) }
            ]
        },
        examples: {
            BySchemaIds: {
                value: {
                    schemaId1: Examples.DB_ID,
                    schemaId2: Examples.DB_ID_2,
                    idLvl: '0'
                }
            },
            BySchemaList: {
                value: {
                    schemas: [{
                        type: 'id',
                        value: Examples.DB_ID
                    }, {
                        type: 'id',
                        value: Examples.DB_ID_2
                    }],
                    idLvl: '0'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: CompareSchemasDTO,
        example: ObjectExamples.COMPARE_SCHEMAS_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: {
            message: [
                'schemaId2 must be a string'
            ],
            error: 'Unprocessable Entity',
            statusCode: 422
        }
    })
    @ApiExtraModels(CompareSchemasByIdsRequestDTO, CompareSchemasByListRequestDTO)
    @HttpCode(HttpStatus.OK)
    async compareSchemas(
        @AuthUser() user: IAuthUser,
        @Body() filters: FilterSchemasDTO
    ): Promise<CompareSchemasDTO> {
        const idLvl = filters ? filters.idLvl : null;
        const schemas = getSchemaId(filters);
        const owner = new EntityOwner(user);
        try {
            const guardians = new Guardians();
            return await guardians.compareSchemas(owner, null, schemas, idLvl);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
        schema: {
            oneOf: [
                { $ref: getSchemaPath(CompareDocumentsByIdsRequestDTO) },
                { $ref: getSchemaPath(CompareDocumentsByListRequestDTO) }
            ]
        },
        examples: {
            ByDocumentIds: {
                value: ObjectExamples.COMPARE_DOCUMENTS_REQUEST_BY_IDS
            },
            ByDocumentList: {
                value: ObjectExamples.COMPARE_DOCUMENTS_REQUEST_BY_LIST
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            oneOf: [
                { $ref: getSchemaPath(CompareDocumentsDTO) },
                { $ref: getSchemaPath(CompareDocumentsMultiDTO) }
            ]
        },
        examples: {
            SingleCompare: {
                summary: 'Compare two documents',
                value: ObjectExamples.COMPARE_DOCUMENTS_RESPONSE_SINGLE
            },
            MultiCompare: {
                summary: 'Compare one document with many',
                value: ObjectExamples.COMPARE_DOCUMENTS_RESPONSE_MULTI
            }
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: {
            statusCode: 422,
            message: 'Invalid parameters'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(CompareDocumentsByIdsRequestDTO, CompareDocumentsByListRequestDTO, CompareDocumentsDTO, CompareDocumentsMultiDTO)
    @HttpCode(HttpStatus.OK)
    async compareDocuments(
        @AuthUser() user: IAuthUser,
        @Body() filters: FilterDocumentsDTO
    ): Promise<CompareDocumentsDTO | CompareDocumentsMultiDTO> {
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
            await InternalException(error, this.logger, user.id);
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
        schema: {
            oneOf: [
                { $ref: getSchemaPath(CompareToolsByIdsRequestDTO) },
                { $ref: getSchemaPath(CompareToolsByListRequestDTO) }
            ]
        },
        examples: {
            ByToolIds: {
                value: ObjectExamples.COMPARE_TOOLS_REQUEST_BY_IDS
            },
            ByToolList: {
                value: ObjectExamples.COMPARE_TOOLS_REQUEST_BY_LIST
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            oneOf: [
                { $ref: getSchemaPath(CompareToolsDTO) },
                { $ref: getSchemaPath(CompareToolsMultiDTO) }
            ]
        },
        examples: {
            SingleCompare: {
                summary: 'Compare two tools',
                value: ObjectExamples.COMPARE_TOOLS_RESPONSE_SINGLE
            },
            MultiCompare: {
                summary: 'Compare one tool with many',
                value: ObjectExamples.COMPARE_TOOLS_RESPONSE_MULTI
            }
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: {
            statusCode: 422,
            message: 'Invalid parameters'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(CompareToolsByIdsRequestDTO, CompareToolsByListRequestDTO, CompareToolsDTO, CompareToolsMultiDTO)
    @HttpCode(HttpStatus.OK)
    async compareTools(
        @AuthUser() user: IAuthUser,
        @Body() filters: FilterToolsDTO
    ): Promise<CompareToolsDTO | CompareToolsMultiDTO> {
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
            await InternalException(error, this.logger, user.id);
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
            MixedSources: {
                value: {
                    policies: [{
                        type: 'id',
                        value: Examples.DB_ID
                    }, {
                        type: 'message',
                        value: Examples.MESSAGE_ID
                    }, {
                        type: 'file',
                        value: {
                            id: Examples.UUID,
                            name: 'File Name',
                            value: 'base65...'
                        }
                    }],
                    eventsLvl: '0',
                    propLvl: '0',
                    childrenLvl: '0',
                    idLvl: '0'
                }
            },
            DatabaseOnly: {
                value: {
                    policyIds: [Examples.DB_ID, Examples.DB_ID_2],
                    eventsLvl: '0',
                    propLvl: '0',
                    childrenLvl: '0',
                    idLvl: '0'
                }
            },
            Legacy: {
                value: {
                    policyId1: Examples.DB_ID,
                    policyId2: Examples.DB_ID_2,
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
        content: {
            'text/csv': {
                schema: {
                    type: 'string'
                },
                example: ObjectExamples.COMPARE_POLICIES_EXPORT_CSV_RESPONSE
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: {
            statusCode: 422,
            message: 'Invalid parameters'
        }
    })
    @HttpCode(HttpStatus.OK)
    async comparePoliciesExport(
        @AuthUser() user: IAuthUser,
        @Body() filters: FilterPoliciesDTO,
        @Query('type') type: string
    ): Promise<string> {
        const policies = getPolicyId(filters);
        const owner = new EntityOwner(user);
        try {
            const guardians = new Guardians();
            return await guardians.comparePolicies(
                owner,
                type,
                policies,
                filters.eventsLvl,
                filters.propLvl,
                filters.childrenLvl,
                filters.idLvl
            );
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
                value: ObjectExamples.COMPARE_MODULES_REQUEST
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        content: {
            'text/csv': {
                schema: {
                    type: 'string'
                },
                example: ObjectExamples.COMPARE_MODULES_EXPORT_CSV_RESPONSE
            }
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: {
            message: [
                'moduleId2 must be a string'
            ],
            error: 'Unprocessable Entity',
            statusCode: 422
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
            await InternalException(error, this.logger, user.id);
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
        schema: {
            oneOf: [
                { $ref: getSchemaPath(CompareSchemasByIdsRequestDTO) },
                { $ref: getSchemaPath(CompareSchemasByListRequestDTO) }
            ]
        },
        examples: {
            BySchemaIds: {
                value: {
                    schemaId1: Examples.DB_ID,
                    schemaId2: Examples.DB_ID_2,
                    idLvl: '0'
                }
            },
            BySchemaList: {
                value: {
                    schemas: [{
                        type: 'id',
                        value: Examples.DB_ID
                    }, {
                        type: 'id',
                        value: Examples.DB_ID_2
                    }],
                    idLvl: '0'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        content: {
            'text/csv': {
                schema: {
                    type: 'string'
                },
                example: ObjectExamples.COMPARE_SCHEMAS_EXPORT_CSV_RESPONSE
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: {
            message: [
                'schemaId2 must be a string'
            ],
            error: 'Unprocessable Entity',
            statusCode: 422
        }
    })
    @ApiExtraModels(CompareSchemasByIdsRequestDTO, CompareSchemasByListRequestDTO)
    @HttpCode(HttpStatus.OK)
    async compareSchemasExport(
        @AuthUser() user: IAuthUser,
        @Body() filters: FilterSchemasDTO,
        @Query('type') type: string
    ): Promise<string> {
        const idLvl = filters ? filters.idLvl : null;
        const schemas = getSchemaId(filters);
        const owner = new EntityOwner(user);
        try {
            const guardians = new Guardians();
            return await guardians.compareSchemas(owner, type, schemas, idLvl);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
        schema: {
            oneOf: [
                { $ref: getSchemaPath(CompareDocumentsByIdsRequestDTO) },
                { $ref: getSchemaPath(CompareDocumentsByListRequestDTO) }
            ]
        },
        examples: {
            ByDocumentIds: {
                value: ObjectExamples.COMPARE_DOCUMENTS_REQUEST_BY_IDS
            },
            ByDocumentList: {
                value: ObjectExamples.COMPARE_DOCUMENTS_REQUEST_BY_LIST
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        content: {
            'text/csv': {
                schema: {
                    type: 'string'
                },
                examples: {
                    SingleCompare: {
                        summary: 'Compare two documents (CSV export)',
                        value: ObjectExamples.COMPARE_DOCUMENTS_EXPORT_CSV_RESPONSE_SINGLE
                    },
                    MultiCompare: {
                        summary: 'Compare one document with many (CSV export)',
                        value: ObjectExamples.COMPARE_DOCUMENTS_EXPORT_CSV_RESPONSE_MULTI
                    }
                }
            }
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: {
            statusCode: 422,
            message: 'Invalid parameters'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(CompareDocumentsByIdsRequestDTO, CompareDocumentsByListRequestDTO)
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
            await InternalException(error, this.logger, user.id);
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
        schema: {
            oneOf: [
                { $ref: getSchemaPath(CompareToolsByIdsRequestDTO) },
                { $ref: getSchemaPath(CompareToolsByListRequestDTO) }
            ]
        },
        examples: {
            ByToolIds: {
                value: ObjectExamples.COMPARE_TOOLS_REQUEST_BY_IDS
            },
            ByToolList: {
                value: ObjectExamples.COMPARE_TOOLS_REQUEST_BY_LIST
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        content: {
            'text/csv': {
                schema: {
                    type: 'string'
                },
                examples: {
                    SingleCompare: {
                        summary: 'Compare two tools (CSV export)',
                        value: ObjectExamples.COMPARE_TOOLS_EXPORT_CSV_RESPONSE_SINGLE
                    },
                    MultiCompare: {
                        summary: 'Compare one tool with many (CSV export)',
                        value: ObjectExamples.COMPARE_TOOLS_EXPORT_CSV_RESPONSE_MULTI
                    }
                }
            }
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: {
            statusCode: 422,
            message: 'Invalid parameters'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(CompareToolsByIdsRequestDTO, CompareToolsByListRequestDTO)
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
            await InternalException(error, this.logger, user.id);
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
            Compact: {
                summary: 'Compact request example',
                value: ObjectExamples.SEARCH_BLOCKS_REQUEST_COMPACT
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SearchBlocksDTO,
        isArray: true,
        example: ObjectExamples.SEARCH_BLOCKS_RESPONSE_COMPACT
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: {
            message: [
                'id must be a string'
            ],
            error: 'Unprocessable Entity',
            statusCode: 422
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get Indexer availability
     */
    @Get('/checkIndexer')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
    )
    @ApiOperation({
        summary: 'Get Indexer Availability.',
        description: 'Returns Indexer Availability (true/false).',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
        example: true
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    async checkIndexerAvailability(
        @AuthUser() user: IAuthUser
    ): Promise<boolean> {
        const guardians = new Guardians();
        try {
            return await guardians.getIndexerAvailability(user);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
