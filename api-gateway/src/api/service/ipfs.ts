import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpException,
    HttpStatus,
    Param,
    Post,
    Req,
    StreamableFile
} from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiConsumes, ApiCreatedResponse, ApiExtraModels, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiProduces, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { Permissions } from '@guardian/interfaces';
import { Auth, AuthUser } from '#auth';
import { Examples, InternalServerErrorDTO, NotFoundErrorDTO, BadRequestErrorDTO } from '#middlewares';
import { CacheService, getCacheKey, Guardians, InternalException, UseCache } from '#helpers';
import { IAuthUser, PinoLogger } from '@guardian/common';
import { CACHE, PREFIXES } from '#constants';

@Controller('ipfs')
@ApiTags('ipfs')
export class IpfsApi {
    constructor(private readonly cacheService: CacheService, private readonly logger: PinoLogger) {
    }

    /**
     * Add file from ipfs
     */
    @Post('/file')
    @Auth(
        Permissions.IPFS_FILE_CREATE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
        // UserRole.AUDITOR
    )
    @ApiOperation({
        summary: 'Add file to IPFS.',
        description: 'Add file to IPFS.',
    })
    @ApiConsumes('binary/octet-stream')
    @ApiBody({
        description: 'Binary data.',
        required: true,
        schema: { type: 'string', format: 'binary' },
    })
    @ApiCreatedResponse({
        description: 'File added successfully.',
        schema: {
            type: 'string',
            example: 'bafkreibes2bxau2me5o75cxny5mj23ckztpcumoskewz73z52cpankttnm'
        }
    })
    @ApiBadRequestResponse({ description: 'Bad request.', type: BadRequestErrorDTO })
    @ApiUnprocessableEntityResponse({
        description: 'Body content in request is empty.',
        type: InternalServerErrorDTO,
        example: {
            statusCode: 422,
            message: 'Body content in request is empty'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async postFile(
        @Body() body: any,
        @AuthUser() user: IAuthUser,
        @Req() req
    ): Promise<string> {
        try {
            if (!Object.values(body).length) {
                throw new HttpException('Body content in request is empty', HttpStatus.UNPROCESSABLE_ENTITY)
            }

            const guardians = new Guardians();
            const { cid } = await guardians.addFileIpfs(user, body);
            if (!cid) {
                throw new HttpException('File is not uploaded', HttpStatus.BAD_REQUEST);
            }

            const invalidedCacheTags = [
                `${PREFIXES.IPFS}file/${cid}`,
                `${PREFIXES.IPFS}file/${cid}/dry-run`,
            ];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], req.user));

            return JSON.stringify(cid);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Add file to ipfs directly
     */
    @Post('/file/direct')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
    )
    @ApiOperation({
        summary: 'Add file to IPFS directly.',
        description: 'Add file to IPFS directly.',
    })
    @ApiConsumes('binary/octet-stream')
    @ApiBody({
        description: 'Binary data.',
        required: false,
        schema: { type: 'string', format: 'binary' },
    })
    @ApiCreatedResponse({
        description: 'File added successfully.',
        schema: {
            type: 'string',
            example: 'bafkreibes2bxau2me5o75cxny5mj23ckztpcumoskewz73z52cpankttnm'
        }
    })
    @ApiBadRequestResponse({ description: 'Bad request.', type: BadRequestErrorDTO })
    @ApiUnprocessableEntityResponse({
        description: 'Body content in request is empty.',
        type: InternalServerErrorDTO,
        example: {
            statusCode: 422,
            message: 'Body content in request is empty'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async postFileDirect(
        @Body() body: any,
        @AuthUser() user: IAuthUser,
        @Req() req
    ): Promise<string> {
        try {
            if (!Object.values(body).length) {
                throw new HttpException('Body content in request is empty', HttpStatus.UNPROCESSABLE_ENTITY)
            }

            const guardians = new Guardians();
            const { cid } = await guardians.addFileIpfsDirect(user, body);
            if (!cid) {
                throw new HttpException('File is not uploaded', HttpStatus.BAD_REQUEST);
            }

            const invalidedCacheTags = [
                `${PREFIXES.IPFS}file/${cid}`,
                `${PREFIXES.IPFS}file/${cid}/dry-run`,
            ];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], req.user));

            return JSON.stringify(cid);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Add file from ipfs for dry run mode
     */
    @Post('/file/dry-run/:policyId')
    @Auth(
        Permissions.IPFS_FILE_CREATE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
        // UserRole.AUDITOR
    )
    @ApiOperation({
        summary: 'Add file to local IPFS simulation for dry run mode.',
        description: 'Add file to local IPFS simulation for dry run mode.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiConsumes('binary/octet-stream')
    @ApiBody({
        description: 'Binary data.',
        required: true,
        schema: { type: 'string', format: 'binary' },
    })
    @ApiCreatedResponse({
        description: 'File added successfully.',
        schema: {
            type: 'string',
            example: '69c115c3892ada2bac183377'
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Body content in request is empty.',
        type: InternalServerErrorDTO,
        example: {
            statusCode: 422,
            message: 'Body content in request is empty'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async postFileDryRun(
        @Param('policyId') policyId: string,
        @Body() body: any,
        @AuthUser() user: IAuthUser,
        @Req() req
    ): Promise<string> {
        try {
            if (!Object.values(body).length) {
                throw new HttpException('Body content in request is empty', HttpStatus.UNPROCESSABLE_ENTITY)
            }

            const guardians = new Guardians();
            const { cid } = await guardians.addFileToDryRunStorage(user, body, policyId);

            const invalidedCacheTags = [
                `${PREFIXES.IPFS}file/${cid}`,
                `${PREFIXES.IPFS}file/${cid}/dry-run`,
            ];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], req.user));

            return JSON.stringify(cid);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get file
     */
    @Get('/file/:cid')
    @Auth(
        Permissions.IPFS_FILE_READ,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
        // UserRole.AUDITOR
    )
    @ApiOperation({
        summary: 'Get file from IPFS.',
        description: 'Get file from IPFS.',
    })
    @ApiParam({
        name: 'cid',
        type: String,
        description: 'File cid',
        required: true,
        example: 'bafkreibes2bxau2me5o75cxny5mj23ckztpcumoskewz73z52cpankttnm'
    })
    @ApiProduces('application/octet-stream')
    @ApiOkResponse({
        description: 'Successful operation. Returns file content.',
        content: {
            'application/octet-stream': {
                schema: {
                    type: 'string',
                    format: 'binary'
                }
            }
        }
    })
    @ApiNotFoundResponse({
        description: 'File is not found.',
        type: NotFoundErrorDTO,
        example: {
            statusCode: 404,
            message: 'File is not found'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(InternalServerErrorDTO, NotFoundErrorDTO)
    @UseCache({ ttl: CACHE.LONG_TTL })
    @HttpCode(HttpStatus.OK)
    async getFile(
        @AuthUser() user: IAuthUser,
        @Param('cid') cid: string
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            const result = await guardians.getFileIpfs(user, cid, 'raw');
            if (result.type !== 'Buffer') {
                throw new HttpException('File is not found', HttpStatus.NOT_FOUND)
            }
            return new StreamableFile(Buffer.from(result));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get file (dry run)
     */
    @Get('/file/:cid/dry-run')
    @Auth(
        Permissions.IPFS_FILE_READ,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
        // UserRole.AUDITOR
    )
    @ApiOperation({
        summary: 'Get file from local IPFS simulation for dry-run mode',
        description: 'Get file from local IPFS simulation for dry-run mode',
    })
    @ApiParam({
        name: 'cid',
        type: String,
        description: 'File cid',
        required: true,
        example: '69c116d7892ada2bac1833a6'
    })
    @ApiProduces('application/octet-stream')
    @ApiOkResponse({
        description: 'Successful operation. Returns file content.',
        content: {
            'application/octet-stream': {
                schema: {
                    type: 'string',
                    format: 'binary'
                }
            }
        }
    })
    @ApiNotFoundResponse({
        description: 'File is not found.',
        type: NotFoundErrorDTO,
        example: {
            statusCode: 404,
            message: 'File is not found'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(InternalServerErrorDTO, NotFoundErrorDTO)
    @UseCache({ ttl: CACHE.LONG_TTL })
    @HttpCode(HttpStatus.OK)
    async getFileDryRun(
        @AuthUser() user: IAuthUser,
        @Param('cid') cid: string
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            const result = await guardians.getFileFromDryRunStorage(user, cid, 'raw');
            if (result?.type !== 'Buffer') {
                throw new HttpException('File is not found', HttpStatus.NOT_FOUND)
            }
            return new StreamableFile(Buffer.from(result));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    @Delete('/file/:cid')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE
    )
    @ApiOperation({
        summary: 'Remove file from IPFS.',
        description: 'Remove file from IPFS.',
    })
    @ApiParam({
        name: 'cid',
        type: String,
        description: 'File cid',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'object',
            nullable: true,
            example: null
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async deleteFile(
        @Param('cid') cid: string,
        @AuthUser() user: IAuthUser,
        @Req() req
    ): Promise<void> {
        try {
            const guardians = new Guardians();
            await guardians.deleteIpfsCid(user, cid);

            const invalidedCacheTags = [
                `${PREFIXES.IPFS}file/${cid}`,
                `${PREFIXES.IPFS}file/${cid}/dry-run`
            ];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], req.user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
