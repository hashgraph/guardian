import { Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import { Controller, Get, HttpCode, HttpException, HttpStatus, Post, Req, Response } from '@nestjs/common';

@Controller('ipfs')
export class IpfsApi {
    @Post('/file')
    @HttpCode(HttpStatus.CREATED)
    async postFile(@Req() req, @Response() res): Promise<any> {
        try {
            if (!Object.values(req.body).length) {
                throw new HttpException('Body content in request is empty', HttpStatus.UNPROCESSABLE_ENTITY)
            }

            const guardians = new Guardians();
            const { cid } = await guardians.addFileIpfs(req.body);
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

    @Get('/file/:cid')
    @HttpCode(HttpStatus.OK)
    async getFile(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const result = await guardians.getFileIpfs(req.params.cid, 'raw');
            const resultBuffer = Buffer.from(result);
            if (!result) {
                throw new HttpException('File is not uploaded', HttpStatus.NOT_FOUND)
            }
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
