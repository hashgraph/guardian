import { Response, Router } from 'express';
import { IPFS } from '@helpers/ipfs';
import { Logger } from 'logger-helper';

/**
 * IPFS route
 */
export const ipfsAPI = Router();

ipfsAPI.post('/file', async (req: any, res: Response) => {
    try {
        if (!req.user) {
            res.sendStatus(401);
            return;
        }
        if (!req.body) {
            throw new Error("Body content in request is empty");
        }

        const ipfs = new IPFS();
        const { cid } = await ipfs.addFile(req.body);
        if (!cid) {
            throw new Error("File is not uploaded");
        }

        res.status(200).json(cid);
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});
