import { Router, NextFunction} from 'express';
import { AuthenticatedRequest, Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import createError from 'http-errors';
import { prepareValidationResponse } from '@middlewares/validation';
import { Controller, Get, Post, Req, Response } from '@nestjs/common';

@Controller('ipfs')
export class IpfsApi {
    @Post('/file')
    async postFile(@Req() req, @Response() res): Promise<any> {
        try {
            if (!Object.values(req.body).length) {
                return res.status(422).json(prepareValidationResponse('Body content in request is empty'));
            }

            const guardians = new Guardians();
            const { cid } = await guardians.addFileIpfs(req.body);
            if (!cid) {
                throw new Error('File is not uploaded')
                // return next(createError(400, 'File is not uploaded'));
            }

            return res.status(201).json(cid);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    @Get('/file/:cid')
    async getFile(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const result = await guardians.getFileIpfs(req.params.cid, 'raw');
            const resultBuffer = Buffer.from(result);
            if (!result) {
                throw new Error('File is not uploaded')
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

/**
 * IPFS route
 */
// export const ipfsAPI = Router();

// ipfsAPI.post('/file', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     try {
//         if (!Object.values(req.body).length) {
//             return res.status(422).json(prepareValidationResponse('Body content in request is empty'));
//         }
//
//         const guardians = new Guardians();
//         const { cid } = await guardians.addFileIpfs(req.body);
//         if (!cid) {
//             return next(createError(400, 'File is not uploaded'));
//         }
//
//         return res.status(201).json(cid);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// ipfsAPI.get('/file/:cid', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     try {
//         const guardians = new Guardians();
//         const result = await guardians.getFileIpfs(req.params.cid, 'raw');
//         const resultBuffer = Buffer.from(result);
//         if (!result) {
//             return next(createError(404, 'File is not uploaded'));
//         }
//         res.writeHead(200, {
//             'Content-Type': 'binary/octet-stream',
//             'Content-Length': resultBuffer.length,
//         });
//         return res.end(resultBuffer, 'binary');
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });
