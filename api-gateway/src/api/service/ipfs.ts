import { Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import { Controller, Get, HttpCode, HttpException, HttpStatus, Post, Req, Response } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';

@Controller('ipfs')
@ApiTags('ipfs')
export class IpfsApi {
    @ApiOperation({
        summary: 'Add file from ipfs.',
        description: 'Add file from ipfs.',
    })
    @ApiSecurity('bearerAuth')
    @Post('/file')
    @HttpCode(HttpStatus.CREATED)
    async postFile(@Req() req, @Response() res): Promise<any> {
        if (!req.user) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
        try {
            if (!Object.values(req.body).length) {
                throw new HttpException('Body content in request is empty', HttpStatus.UNPROCESSABLE_ENTITY)
            }

            const guardians = new Guardians();
            const {cid} = await guardians.addFileIpfs(req.body);
            if (!cid) {
                throw new HttpException('File is not uploaded', HttpStatus.BAD_REQUEST)
                // return next(createError(400, 'File is not uploaded'));
            }

            return res.status(201).json(cid);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

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
}
