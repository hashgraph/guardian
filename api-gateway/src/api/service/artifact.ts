import { UserRole } from '@guardian/interfaces';
import { Logger } from '@guardian/common';
import { Guardians } from '../../helpers/guardians.js';
import {
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpException,
    HttpStatus,
    Post,
    Req,
    Response,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiExtraModels,
    ApiInternalServerErrorResponse,
    ApiOkResponse,
    ApiOperation,
    ApiSecurity,
    ApiTags,
    ApiUnauthorizedResponse,
    ApiForbiddenResponse,
    getSchemaPath,
    ApiBody,
    ApiConsumes
} from '@nestjs/swagger';
import { InternalServerErrorDTO } from '../../middlewares/validation/schemas/errors.js';
import { ApiImplicitQuery } from '@nestjs/swagger/dist/decorators/api-implicit-query.decorator.js';
import { ArtifactDTOItem } from '../../middlewares/validation/schemas/artifacts.js';
import { ApiImplicitParam } from '@nestjs/swagger/dist/decorators/api-implicit-param.decorator.js';
import { Auth } from '../../auth/auth.decorator.js';
import { AnyFilesInterceptor } from '../../helpers/interceptors/multipart.js';
import { UploadedFiles } from '../../helpers/decorators/file.js';

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
    @Auth(UserRole.STANDARD_REGISTRY)
    async getArtifacts(@Req() req, @Response() res): Promise<any> {
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
            return res.header('X-Total-Count', count).send(artifacts);
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
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Form data with artifacts.',
        required: true,
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    'artifacts': {
                        type: 'string',
                        format: 'binary',
                    }
                }
            }
        }
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
    @UseInterceptors(AnyFilesInterceptor())
    @HttpCode(HttpStatus.CREATED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async uploadArtifacts(@Req() req, @UploadedFiles() files): Promise<any> {
        try {
            if (!files) {
                throw new HttpException('There are no files to upload', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const owner = req.user.did;
            const parentId = req.params.parentId;
            const uploadedArtifacts = [];
            const guardian = new Guardians();
            for (const artifact of files) {
                if (artifact) {
                    const result = await guardian.uploadArtifact(artifact, owner, parentId);
                    uploadedArtifacts.push(result);
                }
            }
            return uploadedArtifacts;
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
    @Auth(UserRole.STANDARD_REGISTRY)
    async deleteArtifact(@Req() req, @Response() res): Promise<any> {
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
