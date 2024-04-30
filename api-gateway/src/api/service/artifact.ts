import { Permissions } from '@guardian/interfaces';
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
    Query,
    Param,
    Response,
    UploadedFiles,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiExtraModels,
    ApiInternalServerErrorResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    getSchemaPath,
    ApiBody,
    ApiConsumes
} from '@nestjs/swagger';
import { InternalServerErrorDTO } from '../../middlewares/validation/schemas/errors.js';
import { ApiImplicitQuery } from '@nestjs/swagger/dist/decorators/api-implicit-query.decorator.js';
import { ArtifactDTOItem } from '../../middlewares/validation/schemas/artifacts.js';
import { ApiImplicitParam } from '@nestjs/swagger/dist/decorators/api-implicit-param.decorator.js';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthUser } from '../../auth/authorization-helper.js';
import { Auth } from '../../auth/auth.decorator.js';
import { IAuthUser } from '@guardian/common';
import { pageHeader } from 'middlewares/validation/page-header.js';

@Controller('artifacts')
@ApiTags('artifacts')
export class ArtifactApi {
    /**
     * Get artifacts
     */
    @Get('/')
    @Auth(
        Permissions.ARTIFACT_FILE_VIEW,
        // UserRole.STANDARD_REGISTRY,
    )
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
        isArray: true,
        headers: pageHeader,
        type: ArtifactDTOItem
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(ArtifactDTOItem, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getArtifacts(
        @AuthUser() user: IAuthUser,
        @Query('type') type: string,
        @Query('policyId') policyId: string,
        @Query('toolId') toolId: string,
        @Query('id') id: string,
        @Query('pageIndex') pageIndex: number,
        @Query('pageSize') pageSize: number,
        @Response() res: any
    ): Promise<any> {
        try {
            const options: any = { owner: user.did };
            if (type) {
                options.type = type;
            }
            if (policyId) {
                options.policyId = policyId;
            }
            if (toolId) {
                options.toolId = toolId;
            }
            if (id) {
                options.id = id;
            }
            if (pageIndex && pageSize) {
                options.pageIndex = pageIndex;
                options.pageSize = pageSize;
            }
            const guardians = new Guardians();
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
    @Auth(
        Permissions.ARTIFACT_FILE_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
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
        isArray: true,
        type: ArtifactDTOItem
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(ArtifactDTOItem, InternalServerErrorDTO)
    @UseInterceptors(FilesInterceptor('artifacts'))
    @HttpCode(HttpStatus.CREATED)
    async uploadArtifacts(
        @AuthUser() user: IAuthUser,
        @Param('parentId') parentId: string,
        @UploadedFiles() files: any
    ): Promise<any> {
        try {
            if (!files) {
                throw new HttpException('There are no files to upload', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const owner = user.did;
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
    @Auth(
        Permissions.ARTIFACT_FILE_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
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
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(ArtifactDTOItem, InternalServerErrorDTO)
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteArtifact(
        @AuthUser() user: IAuthUser,
        @Param('artifactId') artifactId: string,
    ): Promise<any> {
        try {
            const guardian = new Guardians();
            await guardian.deleteArtifact(artifactId, user.did);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
