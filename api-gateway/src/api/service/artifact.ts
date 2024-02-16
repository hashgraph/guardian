import { UserRole } from '@guardian/interfaces';
import { Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import { Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Post, Req, Response } from '@nestjs/common';
import { checkPermission } from '@auth/authorization-helper';
import {
    ApiExtraModels,
    ApiInternalServerErrorResponse,
    ApiOkResponse,
    ApiOperation,
    ApiSecurity,
    ApiTags,
    ApiUnauthorizedResponse,
    ApiForbiddenResponse,
    getSchemaPath
} from '@nestjs/swagger';
import { InternalServerErrorDTO } from '@middlewares/validation/schemas/errors';
import { ApiImplicitQuery } from '@nestjs/swagger/dist/decorators/api-implicit-query.decorator';
import { ArtifactDTOItem } from '@middlewares/validation/schemas/artifacts';
import { ApiImplicitParam } from '@nestjs/swagger/dist/decorators/api-implicit-param.decorator';

@Controller('artifacts')
@ApiTags('artifacts')
export class ArtifactApi {
    /**
     * Get artifacts
     * @param req
     * @param res
     */
    @Get('/')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Returns all artifacts.',
        description: 'Returns all artifacts.',
    })
    @ApiImplicitQuery({
        name: 'type',
        enum: ['tool', 'policy'],
        description: 'Tool|Policy',
        required: false
    })
    @ApiImplicitQuery({
        name: 'policyId',
        type: String,
        description: 'Policy identifier',
        required: false
    })
    @ApiImplicitQuery({
        name: 'toolId',
        type: String,
        description: 'Tool identifier',
        required: false
    })
    @ApiImplicitQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false
    })
    @ApiImplicitQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'array',
            items: {
                $ref: getSchemaPath(ArtifactDTOItem),
            }
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiExtraModels(ArtifactDTOItem, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getArtifacts(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const guardians = new Guardians();
            const options: any = {
                owner: req.user.did,
            }
            if (req.query) {
                options.type = req.query.type;
                options.policyId = req.query.policyId;
                options.toolId = req.query.toolId;
                options.id = req.query.id;
            }
            if (req.query && req.query.pageIndex && req.query.pageSize) {
                options.pageIndex = req.query.pageIndex;
                options.pageSize = req.query.pageSize;
            }
            const { artifacts, count } = await guardians.getArtifacts(options);
            return res.setHeader('X-Total-Count', count).json(artifacts);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Upload artifact
     */
    @Post('/:parentId')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Upload artifact.',
        description: 'Upload artifact. For users with the Standard Registry role only.',
    })
    @ApiImplicitParam({
        name: 'parentId',
        type: String,
        description: 'Parent ID',
        required: true,
        example: '000000000000000000000001'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'array',
            items: {
                $ref: getSchemaPath(ArtifactDTOItem),
            }
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiExtraModels(ArtifactDTOItem, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async uploadArtifacts(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const files = req.files;
            if (!files) {
                throw new HttpException('There are no files to upload', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const owner = req.user.did;
            const parentId = req.params.parentId;
            const uploadedArtifacts = [];
            const artifacts = Array.isArray(files.artifacts) ? files.artifacts : [files.artifacts];
            const guardian = new Guardians();
            for (const artifact of artifacts) {
                if (artifact) {
                    const result = await guardian.uploadArtifact(artifact, owner, parentId);
                    uploadedArtifacts.push(result);
                }
            }
            return res.status(201).json(uploadedArtifacts);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Delete artifact
     */
    @Delete('/:artifactId')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Delete artifact.',
        description: 'Delete artifact.',
    })
    @ApiImplicitParam({
        name: 'artifactId',
        type: String,
        description: 'Artifact ID',
        required: true,
        example: '000000000000000000000001'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'array',
            items: {
                $ref: getSchemaPath(ArtifactDTOItem),
            }
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiExtraModels(ArtifactDTOItem, InternalServerErrorDTO)
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteArtifact(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const guardian = new Guardians();
            await guardian.deleteArtifact(req.params.artifactId, req.user.did)
            return res.status(204).send();
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
