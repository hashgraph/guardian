import { Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Param, Post, Req, Response } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Auth } from '@auth/auth.decorator';
import { UserRole } from '@guardian/interfaces';

@Controller('ipfs')
@ApiTags('ipfs')
export class IpfsApi {
    @ApiOperation({
        summary: 'Add file from ipfs.',
        description: 'Add file from ipfs.',
    })
    @Auth(
        UserRole.STANDARD_REGISTRY,
        UserRole.USER,
        UserRole.AUDITOR
    )
    @Post('/file')
    @HttpCode(HttpStatus.CREATED)
    async postFile(@Body() body: any): Promise<string> {
        try {
            if (!Object.values(body).length) {
                throw new HttpException('Body content in request is empty', HttpStatus.UNPROCESSABLE_ENTITY)
            }

            const guardians = new Guardians();
            const {cid} = await guardians.addFileIpfs(body);
            if (!cid) {
                throw new HttpException('File is not uploaded', HttpStatus.BAD_REQUEST);
            }

            return JSON.stringify(cid);
        } catch (error) {
            new Logger().error(error.message, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * @param body
     * @param policyId
     */
    @ApiOperation({
        summary: 'Add file from ipfs for dry run mode.',
        description: 'Add file from ipfs for dry run mode.',
    })
    @Auth(
        UserRole.STANDARD_REGISTRY,
        UserRole.USER,
        UserRole.AUDITOR
    )
    @Post('/file/dry-run/:policyId')
    @HttpCode(HttpStatus.CREATED)
    async postFileDryRun(@Body() body: any, @Param('policyId') policyId: any): Promise<string> {
        try {
            if (!Object.values(body).length) {
                throw new HttpException('Body content in request is empty', HttpStatus.UNPROCESSABLE_ENTITY)
            }

            const guardians = new Guardians();
            const {cid} = await guardians.addFileToDryRunStorage(body, policyId);

            return JSON.stringify(cid);
        } catch (error) {
            new Logger().error(error.message, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * use cache long ttl
     * @param req
     * @param res
     */
    @ApiOperation({
        summary: 'Get file from ipfs.',
        description: 'Get file from ipfs.',
    })
    @ApiSecurity('bearerAuth')
    @Get('/file/:cid')
    @HttpCode(HttpStatus.OK)
    async getFile(@Req() req, @Response() res): Promise<any> {
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
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * use cache long ttl
     * @param cid
     * @param res
     */
    @ApiOperation({
        summary: 'Get file from ipfs for dry run mode.',
        description: 'Get file from ipfs for dry run mode.',
    })
    @Auth(
        UserRole.STANDARD_REGISTRY,
        UserRole.USER,
        UserRole.AUDITOR
    )
    @Get('/file/:cid/dry-run')
    @HttpCode(HttpStatus.OK)
    async getFileDryRun(@Param('cid') cid: string, @Response() res): Promise<any> {
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
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }
}
