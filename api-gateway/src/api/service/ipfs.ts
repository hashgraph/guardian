import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Param, Post, Req, Response } from '@nestjs/common';
import { ApiExtraModels, ApiInternalServerErrorResponse, ApiOperation, ApiSecurity, ApiTags, ApiBody, ApiOkResponse, ApiParam } from '@nestjs/swagger';
import { Permissions } from '@guardian/interfaces';
import { Auth } from '../../auth/auth.decorator.js';
import { CACHE } from '../../constants/index.js';
import { InternalServerErrorDTO } from '../../middlewares/validation/index.js';
import { Guardians, UseCache, InternalException } from '../../helpers/index.js';

@Controller('ipfs')
@ApiTags('ipfs')
export class IpfsApi {
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
        @Body() body: any
    ): Promise<string> {
        try {
            if (!Object.values(body).length) {
                throw new HttpException('Body content in request is empty', HttpStatus.UNPROCESSABLE_ENTITY)
            }

            const guardians = new Guardians();
            const { cid } = await guardians.addFileIpfs(body);
            if (!cid) {
                throw new HttpException('File is not uploaded', HttpStatus.BAD_REQUEST);
            }

            return JSON.stringify(cid);
        } catch (error) {
            await InternalException(error);
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
        example: '000000000000000000000001'
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
        @Body() body: any
    ): Promise<string> {
        try {
            if (!Object.values(body).length) {
                throw new HttpException('Body content in request is empty', HttpStatus.UNPROCESSABLE_ENTITY)
            }

            const guardians = new Guardians();
            const { cid } = await guardians.addFileToDryRunStorage(body, policyId);

            return JSON.stringify(cid);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get file
     */
    @Get('/file/:cid')
    @ApiSecurity('bearerAuth')
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
    @UseCache({ ttl: CACHE.LONG_TTL, isExpress: true })
    @HttpCode(HttpStatus.OK)
    async getFile(
        @Req() req: any,
        @Response() res: any
    ): Promise<any> {
        if (!req.user) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
        try {
            const guardians = new Guardians();
            const result = await guardians.getFileIpfs(req.params.cid, 'raw');
            if (result.type !== 'Buffer') {
                throw new HttpException('File is not found', HttpStatus.NOT_FOUND)
            }
            const resultBuffer = Buffer.from(result);
            res.writeHead(200, {
                'Content-Type': 'binary/octet-stream',
                'Content-Length': resultBuffer.length,
            });
            return res.end(resultBuffer, 'binary');
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get file (dry run)
     */
    @Get('/file/:cid/dry-run')
    @Auth(
        Permissions.IPFS_FILE_VIEW,
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
    @UseCache({ ttl: CACHE.LONG_TTL, isExpress: true })
    @HttpCode(HttpStatus.OK)
    async getFileDryRun(
        @Param('cid') cid: string,
        @Response() res: any
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            const result = await guardians.getFileFromDryRunStorage(cid, 'raw');
            if (result.type !== 'Buffer') {
                throw new HttpException('File is not found', HttpStatus.NOT_FOUND)
            }
            const resultBuffer = Buffer.from(result);
            res.writeHead(200, {
                'Content-Type': 'binary/octet-stream',
                'Content-Length': resultBuffer.length,
            });
            return res.end(resultBuffer, 'binary');
        } catch (error) {
            await InternalException(error);
        }
    }
}
