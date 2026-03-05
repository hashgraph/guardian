import { ClientProxy } from '@nestjs/microservices';
import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Inject, Post, Version } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBody, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { ProjectDTO, PropertiesDTO, CompareDocumentsDTO, CompareDocumentsV2DTO, FilterDocumentsDTO, InternalServerErrorDTO, Examples } from '#middlewares';
import { CACHE } from '#constants';
import { UseCache, Guardians, InternalException, ProjectService } from '#helpers';
import { PinoLogger } from '@guardian/common';

/**
 * Projects route
 */
@Controller('projects')
@ApiTags('projects')
export class ProjectsAPI {
    constructor(@Inject('GUARDIANS') public readonly client: ClientProxy, private readonly logger: PinoLogger) {
    }

    /**
     * Projects search
     */
    @Post('/search')
    @ApiOperation({
        summary: 'Search projects',
        description: 'Search projects by filters',
    })
    @ApiBody({
        description: 'The question of choosing a methodology',
        required: true,
        type: String,
        examples: {
            q: {
                value: 'What methodology can I use for production of electricity using renewable energy technologies?'
            }
        }
    })
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        isArray: true,
        type: ProjectDTO,
        example: [{ id: 'f3b2a9c1e4d5678901234567', policyId: 'f3b2a9c1e4d5678901234567', policyName: 'string', registered: 'string', title: 'string', companyName: 'string', sectoralScope: 'string' }]
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(ProjectDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async projectSearch(
        @Body() body: any
    ): Promise<ProjectDTO[]> {
        const categoryIds = body?.categoryIds;
        const policyIds = body?.policyIds;
        try {
            const projectService = new ProjectService();
            return await projectService.search(categoryIds, policyIds);
        } catch (error) {
            await InternalException(error, this.logger, null);
        }
    }

    /**
     * Compare documents
     */
    @Post('/compare/documents')
    @ApiOperation({
        summary: 'Compare documents.',
        description: 'Compare documents.',
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
        type: CompareDocumentsDTO,
        example: { documents: {}, left: {}, right: {}, total: {} }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(FilterDocumentsDTO, CompareDocumentsDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async compareDocumentsV1(
        @Body() body: FilterDocumentsDTO
    ): Promise<any> {
        const guardians = new Guardians();
        const documentId1 = body ? body.documentId1 : null;
        const documentId2 = body ? body.documentId2 : null;
        const documentIds = body ? body.documentIds : null;
        let ids: string[];
        if (documentId1 && documentId2) {
            ids = [documentId1, documentId2];
        } else if (Array.isArray(documentIds) && documentIds.length > 1) {
            ids = documentIds;
        }
        if (!ids) {
            throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        const idLvl = 0;
        const eventsLvl = 0;
        const propLvl = 2;
        const childrenLvl = 0;
        const user = null;

        let samePolicy: boolean = true;
        const _data = await guardians.getVcDocuments(null, { id: ids });
        for (let index = 1; index < _data.length; index++) {
            if (_data[index - 1].policyId !== _data[index].policyId) {
                samePolicy = false;
                break;
            }
        }

        const refLvl = samePolicy ? 'Revert' : 'Merge';
        const keyLvl = samePolicy ? 'Default' : 'Property';
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
            await InternalException(error, this.logger, null);
        }
    }

    /**
     * Compare documents
     */
    @Post('/compare/documents')
    @ApiOperation({
        summary: 'Compare documents.',
        description: 'Compare documents.',
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
        type: CompareDocumentsV2DTO,
        example: { projects: { documents: {}, left: {}, right: {}, total: {} }, presentations: { documents: {}, left: {}, right: {}, total: {} } }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @Version('2')
    @ApiExtraModels(FilterDocumentsDTO, CompareDocumentsV2DTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async compareDocumentsV2(
        @Body() body: FilterDocumentsDTO
    ): Promise<any> {
        const guardians = new Guardians();
        const documentId1 = body ? body.documentId1 : null;
        const documentId2 = body ? body.documentId2 : null;
        const documentIds = body ? body.documentIds : null;
        let ids: string[];
        if (documentId1 && documentId2) {
            ids = [documentId1, documentId2];
        } else if (Array.isArray(documentIds) && documentIds.length > 1) {
            ids = documentIds;
        }
        if (!ids) {
            throw new HttpException('Invalid parameters', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        const rowDocuments = await guardians.getVcDocuments(null, { id: ids });
        let samePolicy: boolean = true;
        const policyIds: string[] = [];
        for (const id of ids) {
            const doc = rowDocuments.find((e) => e.id === id);
            if (doc) {
                policyIds.push(doc.policyId);
            } else {
                policyIds.push(null);
            }
            if (policyIds.length > 1 && policyIds[policyIds.length - 2] !== policyIds[policyIds.length - 1]) {
                samePolicy = false;
            }
        }

        const idLvl = 0;
        const eventsLvl = 0;
        const propLvl = 2;
        const childrenLvl = 0;
        const user = null;
        const refLvl = samePolicy ? 'Revert' : 'Merge';
        const keyLvl = samePolicy ? 'Default' : 'Property';

        try {
            const comparationVc = await guardians.compareDocuments(
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
            const comparationVpArray = await guardians.compareVPDocuments(
                user,
                null,
                policyIds,
                '1',
                '2',
                '2',
                '0',
                0,
                'Direct'
            );
            return {
                projects: comparationVc,
                presentations: comparationVpArray
            }
        } catch (error) {
            await InternalException(error, this.logger, null);
        }
    }

    /**
     */
    @Get('/properties')
    @ApiOperation({
        summary: 'Get all properties',
        description: 'Get all properties',
    })
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        isArray: true,
        type: PropertiesDTO,
        example: [{ id: 'f3b2a9c1e4d5678901234567', title: 'string', value: 'string' }]
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(PropertiesDTO, InternalServerErrorDTO)
    @UseCache({ ttl: CACHE.LONG_TTL })
    @HttpCode(HttpStatus.ACCEPTED)
    async getPolicyProperties(): Promise<any> {
        try {
            const projectService = new ProjectService();
            return await projectService.getPolicyProperties();
        } catch (error) {
            await InternalException(error, this.logger, null);
        }
    }
}
