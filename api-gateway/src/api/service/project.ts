import { Logger } from '@guardian/common';
import { ClientProxy } from '@nestjs/microservices';
import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Inject, Post, Req, Response } from '@nestjs/common';
import { ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { ProjectService } from '@helpers/projects';
import { ProjectDTO, PropertiesDTO } from '@middlewares/validation/schemas/projects';
import { CompareDocumentsDTO, FilterDocumentsDTO, InternalServerErrorDTO } from '@middlewares/validation/schemas';
import { Guardians } from '@helpers/guardians';

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
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: ProjectDTO,
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
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async projectSearch(@Req() req, @Response() res): Promise<ProjectDTO[]> {
        const projectService = new ProjectService();

        const categoryIds = req.body.categoryIds;
        const policyIds = req.body.policyIds;

        try {
            const projects = await projectService.search(categoryIds, policyIds);
            return res.send(projects);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
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
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async compareDocuments(@Body() body, @Req() req): Promise<any> {
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
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * use cache long ttl
     * @param req
     * @param res
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
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async getPolicyProperties(@Req() req, @Response() res): Promise<any> {
        try {
            const projectService = new ProjectService();
            const policyProperties = await projectService.getPolicyProperties();
            return res.send(policyProperties);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
