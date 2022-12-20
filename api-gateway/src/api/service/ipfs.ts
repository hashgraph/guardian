import { Response, Router } from 'express';
import { AuthenticatedRequest, Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';

/**
 * IPFS route
 */
export const ipfsAPI = Router();

ipfsAPI.post('/file', async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.body) {
            throw new Error('Body content in request is empty');
        }

        const guardians = new Guardians();
        const { cid } = await guardians.addFileIpfs(req.body);
        if (!cid) {
            throw new Error('File is not uploaded');
        }

        res.status(201).json(cid);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

ipfsAPI.get('/file/:cid', async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.body) {
            throw new Error('Body content in request is empty');
        }
        if (!req.params.cid) {
            throw new Error('Invalid file CID');
        }

        const guardians = new Guardians();
        const result = await guardians.getFileIpfs(req.params.cid, 'raw');
        const resultBuffer = Buffer.from(result);
        if (!result) {
            throw new Error('File is not uploaded');
        }
        res.writeHead(200, {
            'Content-Type': 'binary/octet-stream',
            'Content-Length': resultBuffer.length,
        });
        res.end(resultBuffer, 'binary');
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});