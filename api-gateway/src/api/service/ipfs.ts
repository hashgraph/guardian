import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Param, Post, StreamableFile } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@guardian/interfaces';
import { Auth } from '#auth';
import { Examples, InternalServerErrorDTO } from '#middlewares';
import { Guardians, InternalException } from '#helpers';

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
    // @UseCache({ ttl: CACHE.LONG_TTL })
    @HttpCode(HttpStatus.OK)
    async getFile(
        @Param('cid') cid: string
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            const result = await guardians.getFileIpfs(cid, 'raw');
            if (result.type !== 'Buffer') {
                throw new HttpException('File is not found', HttpStatus.NOT_FOUND)
            }
            return new StreamableFile(Buffer.from(result));
        } catch (error) {
            await InternalException(error);
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
    // @UseCache({ ttl: CACHE.LONG_TTL })
    @HttpCode(HttpStatus.OK)
    async getFileDryRun(
        @Param('cid') cid: string
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            const result = await guardians.getFileFromDryRunStorage(cid, 'raw');
            if (result.type !== 'Buffer') {
                throw new HttpException('File is not found', HttpStatus.NOT_FOUND)
            }
            return new StreamableFile(Buffer.from(result));
        } catch (error) {
            await InternalException(error);
        }
    }
}
