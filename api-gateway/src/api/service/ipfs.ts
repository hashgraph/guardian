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
import { ApiBody, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@guardian/interfaces';
import { Auth, AuthUser } from '#auth';
import { Examples, InternalServerErrorDTO } from '#middlewares';
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
        summary: 'Add file from ipfs.',
        description: 'Add file from ipfs.',
    })
    @ApiBody({
        description: 'Binary data.',
        required: true,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: String
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
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
        summary: 'Add file to ipfs directly.',
        description: 'Add file to ipfs directly.',
    })
    @ApiBody({
        description: 'Binary data.',
        required: true,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: String
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
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
        summary: 'Add file from ipfs for dry run mode.',
        description: 'Add file from ipfs for dry run mode.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Binary data.',
        required: true,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: String
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
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
        summary: 'Get file from ipfs.',
        description: 'Get file from ipfs.',
    })
    @ApiParam({
        name: 'cid',
        type: String,
        description: 'File cid',
        required: true,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'string',
            format: 'binary'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
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
        summary: 'Get file from ipfs for dry run mode.',
        description: 'Get file from ipfs for dry run mode.',
    })
    @ApiParam({
        name: 'cid',
        type: String,
        description: 'File cid',
        required: true,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'string',
            format: 'binary'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @UseCache({ ttl: CACHE.LONG_TTL })
    @HttpCode(HttpStatus.OK)
    async getFileDryRun(
        @AuthUser() user: IAuthUser,
        @Param('cid') cid: string
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            const result = await guardians.getFileFromDryRunStorage(user, cid, 'raw');
            if (result.type !== 'Buffer') {
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
        summary: 'Remove file from ipfs.',
        description: 'Remove file from ipfs.',
    })
    @ApiParam({
        name: 'cid',
        type: String,
        description: 'File cid',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.'
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
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
