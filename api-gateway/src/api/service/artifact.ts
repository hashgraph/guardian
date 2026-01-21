import { Permissions } from '@guardian/interfaces';
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
    UseInterceptors,
    Version,
    Req,
    Res
} from '@nestjs/common';
import { ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiBody, ApiConsumes, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AuthUser, Auth } from '#auth';
import { IAuthUser, PinoLogger } from '@guardian/common';
import { Guardians, InternalException, AnyFilesInterceptor, UploadedFiles, EntityOwner, CacheService, UseCache, getCacheKey } from '#helpers';
import { pageHeader, Examples, InternalServerErrorDTO, ArtifactDTOItem } from '#middlewares';
import { ARTIFACT_REQUIRED_PROPS, PREFIXES } from '#constants'
import { FastifyReply } from 'fastify';
import { FilenameSanitizer } from 'helpers/filename-sanitizer';

@Controller('artifacts')
@ApiTags('artifacts')
export class ArtifactApi {

    constructor(private readonly cacheService: CacheService, private readonly logger: PinoLogger) {
    }
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
    @UseCache({ isFastify: true })
    async getArtifacts(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Req() req,
        @Query('id') id: string,
        @Query('type') type?: string,
        @Query('policyId') policyId?: string,
        @Query('toolId') toolId?: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
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
            const { artifacts, count } = await guardians.getArtifacts(user, options);

            req.locals = artifacts

            return res.header('X-Total-Count', count).send(artifacts);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get artifacts V2 04.06.2024
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
    @Version('2')
    async getArtifactsV2(
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

            options.fields = Object.values(ARTIFACT_REQUIRED_PROPS)

            const guardians = new Guardians();
            const { artifacts, count } = await guardians.getArtifactsV2(user, options);

            return res.header('X-Total-Count', count).send(artifacts);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
    @UseInterceptors(AnyFilesInterceptor({
        allowedFields: ['artifacts'],
        requiredFields: ['artifacts']
    }))
    @HttpCode(HttpStatus.CREATED)
    async uploadArtifacts(
        @AuthUser() user: IAuthUser,
        @Param('parentId') parentId: string,
        @UploadedFiles() files: any,
        @Req() req,
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
            const invalidedCacheKeys = [`/${PREFIXES.ARTIFACTS}`]
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheKeys], user))

            return uploadedArtifacts;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
        @Req() req,
    ): Promise<boolean> {
        try {
            const guardian = new Guardians();
            const invalidedCacheTags = [PREFIXES.ARTIFACTS];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await guardian.deleteArtifact(artifactId, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    @Get('/files/:fileId')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
    )
    @ApiOperation({ summary: 'Download file by id', description: 'Returns file from GridFS' })
    @ApiParam({ name: 'fileId', type: String, required: true, description: 'File _id' })
    @HttpCode(HttpStatus.OK)
    async downloadFile(
        @AuthUser() user: IAuthUser,
        @Param('fileId') fileId: string,
        @Res({ passthrough: true }) res: FastifyReply
    ) {
        try {
            if (!fileId) {
                res.code(HttpStatus.BAD_REQUEST);
                return { message: 'fileId is required' };
            }

            const guardian = new Guardians();
            const { buffer, filename, contentType } = await guardian.csvGetFile(fileId, user);

            res.header('Content-Type', contentType || 'text/csv; charset=utf-8');
            res.header('X-Content-Type-Options', 'nosniff');
            res.header(
                'Content-Disposition',
                `attachment; filename="${FilenameSanitizer.sanitize(filename || fileId)}"`
            );

            return res.send(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    @Post('/files')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
    )
    @ApiOperation({ summary: 'Uploads/overwrites file', description: 'Uploads/overwrites file in GridFS' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        required: true,
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                fileId: { type: 'string', description: 'Existing file _id to overwrite (optional)' }
            }
        }
    })
    @UseInterceptors(AnyFilesInterceptor({
        allowedFields: ['file', 'fileId'],
        requiredFields: ['file']
    }))
    @HttpCode(HttpStatus.CREATED)
    async upsertFile(
        @AuthUser() user: IAuthUser,
        @UploadedFiles() files: any,
        @Req() req,
    ) {
        try {
            const guardian = new Guardians();

            const file = (files || []).find((f: any) => f.fieldname === 'file');
            if (!file?.buffer) {
                throw new HttpException('File is required', HttpStatus.BAD_REQUEST);
            }

            return  await guardian.upsertFile({
                file: {
                    buffer: file.buffer,
                    originalname: file.originalname,
                    mimetype: file.mimetype
                },
                fileId: req.body?.fileId || undefined
            }, user);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    @Delete('/files/:fileId')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
    )
    @ApiOperation({
        summary: 'Delete file by id',
        description: 'Deletes file from GridFS by _id'
    })
    @ApiParam({
        name: 'fileId',
        type: String, required: true,
        description: 'File _id'
    })
    @HttpCode(HttpStatus.OK)
    async deleteFile(
        @AuthUser() user: IAuthUser,
        @Param('fileId') fileId: string,
        @Res({ passthrough: true }) res: FastifyReply
    ) {
        try {
            if (!fileId?.trim()) {
                res.code(HttpStatus.BAD_REQUEST);
                return { message: 'fileId is required' };
            }
            const guardians = new Guardians();
            return await guardians.deleteGridFile(user, fileId);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
