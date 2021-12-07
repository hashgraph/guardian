import {Response, Router} from 'express';
import {AuthenticatedRequest} from '../auth/auth.interface';
import JSZip from 'jszip'

export const importExportAPI = Router();

const FILENAME = 'policy.zip'

importExportAPI.get('/export', async (req: AuthenticatedRequest, res: Response) => {
    const zip = new JSZip();
    zip.file('schema1.json', '{"test": "this is test1"}');
    zip.file('schema2.json', '{"test": "this is test2"}');

    const arcStream = zip.generateNodeStream();

    res.setHeader('Content-disposition', `attachment; filename=${FILENAME}`);
    res.setHeader('Content-type', 'application/zip');
    // console.log(archive)
    arcStream.pipe(res);
});
