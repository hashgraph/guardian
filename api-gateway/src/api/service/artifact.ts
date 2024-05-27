import { Permissions, UserRole } from '@guardian/interfaces';
import { Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Post, Query, Param, Response, UseInterceptors, } from '@nestjs/common';
import { ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiBody, ApiConsumes, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AuthUser, Auth } from '#auth';
import { IAuthUser } from '@guardian/common';
import { Guardians, InternalException, AnyFilesInterceptor, UploadedFiles, EntityOwner } from '#helpers';
import { pageHeader, Examples, InternalServerErrorDTO, ArtifactDTOItem } from '#middlewares';

@Controller('artifacts')
@ApiTags('artifacts')
export class ArtifactApi {
    /**
     * Get artifacts
     */
    @Get('/')
    @Auth(
        Permissions.ARTIFACTS_FILE_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Returns all artifacts.',
        description: 'Returns all artifacts.',
    })
    @ApiQuery({
        name: 'id',
        type: String,
        description: 'Artifact identifier',
        required: false,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'type',
        enum: ['tool', 'policy'],
        description: 'Tool|Policy',
        required: false,
        example: 'policy'
    })
    @ApiQuery({
        name: 'policyId',
        type: String,
        description: 'Policy identifier',
        required: false,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'toolId',
        type: String,
        description: 'Tool identifier',
        required: false,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
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
        @Response() res: any,
        @Query('id') id: string,
        @Query('type') type?: string,
        @Query('policyId') policyId?: string,
        @Query('toolId') toolId?: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<ArtifactDTOItem> {
        try {
            const options: any = {
                owner: new EntityOwner(user)
            };
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
            return res.header('X-Total-Count', count).send(artifacts);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Upload artifact
     */
    @Post('/:parentId')
    @Auth(
        Permissions.ARTIFACTS_FILE_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Upload artifact.',
        description: 'Upload artifact. For users with the Standard Registry role only.',
    })
    @ApiParam({
        name: 'parentId',
        type: String,
        description: 'Parent ID',
        required: true,
        example: Examples.DB_ID
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
    @UseInterceptors(AnyFilesInterceptor())
    @HttpCode(HttpStatus.CREATED)
    async uploadArtifacts(
        @AuthUser() user: IAuthUser,
        @Param('parentId') parentId: string,
        @UploadedFiles() files: any
    ): Promise<any> {
        try {
            if (!files) {
                throw new HttpException('There are no files to upload', HttpStatus.BAD_REQUEST)
            }
            const owner = new EntityOwner(user);
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
            await InternalException(error);
        }
    }

    /**
     * Delete artifact
     */
    @Delete('/:artifactId')
    @Auth(
        Permissions.ARTIFACTS_FILE_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Delete artifact.',
        description: 'Delete artifact.',
    })
    @ApiParam({
        name: 'artifactId',
        type: String,
        description: 'Artifact ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(ArtifactDTOItem, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async deleteArtifact(
        @AuthUser() user: IAuthUser,
        @Param('artifactId') artifactId: string,
    ): Promise<boolean> {
        try {
            const guardian = new Guardians();
            return await guardian.deleteArtifact(artifactId, new EntityOwner(user));
        } catch (error) {
            await InternalException(error);
        }
    }
}
