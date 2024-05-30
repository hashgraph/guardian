import { ClientProxy } from '@nestjs/microservices';
import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Inject, Post, Version } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProjectDTO, PropertiesDTO, CompareDocumentsDTO, CompareDocumentsV2DTO, FilterDocumentsDTO, InternalServerErrorDTO, Examples } from '#middlewares';
import { CACHE } from '#constants';
import { UseCache, Guardians, InternalException, ProjectService } from '#helpers';

/**
 * Projects route
 */
@Controller('projects')
@ApiTags('projects')
export class ProjectsAPI {
    constructor(@Inject('GUARDIANS') public readonly client: ClientProxy) {
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
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: ProjectDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
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
            await InternalException(error);
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
        type: CompareDocumentsDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
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
        const _data = await guardians.getVcDocuments({ id: ids });
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
            await InternalException(error);
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
        type: CompareDocumentsV2DTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
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

        const idLvl = 0;
        const eventsLvl = 0;
        const propLvl = 2;
        const childrenLvl = 0;
        const user = null;

        let samePolicy: boolean = true;
        const _data = await guardians.getVcDocuments({ id: ids });
        for (let index = 1; index < _data.length; index++) {
            if (_data[index - 1].policyId !== _data[index].policyId) {
                samePolicy = false;
                break;
            }
        }

        const policyIds = _data.map((p: any) => p.policyId);

        const refLvl = samePolicy ? 'Revert' : 'Merge';
        const keyLvl = samePolicy ? 'Default' : 'Property';

        try {
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
            return {
                projects: comparationVc,
                presentations: comparationVpArray
            }
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     */
    @Get('/properties')
    @ApiOperation({
        summary: 'Get all properties',
        description: 'Get all properties',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: PropertiesDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(PropertiesDTO, InternalServerErrorDTO)
    @UseCache({ ttl: CACHE.LONG_TTL })
    @HttpCode(HttpStatus.ACCEPTED)
    async getPolicyProperties(): Promise<any> {
        try {
            const projectService = new ProjectService();
            return await projectService.getPolicyProperties();
        } catch (error) {
            await InternalException(error);
        }
    }
}
