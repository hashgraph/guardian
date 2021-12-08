import {Response, Router} from 'express';
import {AuthenticatedRequest} from '../auth/auth.interface';
import JSZip from 'jszip'
import {getMongoRepository} from 'typeorm';
import {Policy} from '@entity/policy';
import {Guardians} from '@helpers/guardians';
import {findAllEntities} from '@helpers/utils';

export const importExportAPI = Router();

const FILENAME = 'policy.zip'

importExportAPI.get('/export/:policyId', async (req: AuthenticatedRequest, res: Response) => {
    const policy = await getMongoRepository(Policy).findOne(req.params.policyId);
    const guardians = new Guardians();

    const [schemas, tokens] = await Promise.all([
        Promise.all(findAllEntities(policy.config, 'schema').map(id => guardians.getSchemes({type: id}))),
        Promise.all(findAllEntities(policy.config, 'tokenId').map(id => guardians.getTokens({tokenId: id})))
    ]);

    res.json({
        schemas,
        tokens,
        policy
    })

    // const zip = new JSZip();
    // zip.file('schema1.json', '{"test": "this is test1"}');
    // zip.file('schema2.json', '{"test": "this is test2"}');
    //
    // const arcStream = zip.generateNodeStream();
    //
    // res.setHeader('Content-disposition', `attachment; filename=${FILENAME}`);
    // res.setHeader('Content-type', 'application/zip');
    // arcStream.pipe(res);
});
