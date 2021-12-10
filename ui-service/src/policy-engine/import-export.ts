import { Response, Router } from 'express';
import { AuthenticatedRequest } from '../auth/auth.interface';
import JSZip from 'jszip'
import { getMongoRepository } from 'typeorm';
import { Policy } from '@entity/policy';
import { Guardians } from '@helpers/guardians';
import { findAllEntities } from '@helpers/utils';

export const importExportAPI = Router();

const FILENAME = 'policy.zip'

importExportAPI.get('/export/:policyId', async (req: AuthenticatedRequest, res: Response) => {
    const policy = await getMongoRepository(Policy).findOne(req.params.policyId);
    const guardians = new Guardians();

    const uuid = findAllEntities(policy.config, 'schema');
    const tokenIds = findAllEntities(policy.config, 'tokenId');

    const [schemas, tokens] = await Promise.all([
        guardians.exportSchemes(uuid),
        guardians.getTokens({ ids: tokenIds })
    ]);

    const schemaObjects:any[] = schemas.filter(s=> uuid.indexOf(s.uuid) != -1).map(s=> {
        return {
            uuid: s.uuid,
            name: s.name,
            relationships: s.relationships
        }
    });
    const tokenObjects:any[] = tokens.map(s=> {
        return {
            tokenId: s.tokenId,
            tokenName: s.tokenName,
            tokenSymbol: s.tokenSymbol,
        }
    });

    res.json({
        schemas: schemaObjects,
        tokens: tokenObjects,
        policy
    })
});


importExportAPI.post('/export/:policyId/download', async (req: AuthenticatedRequest, res: Response) => {
    const {schemas, tokens} = req.body;

    console.log(schemas, tokens);

    res.json({});

    // const data = {
    //     schemas: [
    //         {
    //             id: ".......",
    //             selected: true,
    //         }
    //     ],
    //     tokens: [
    //         {
    //             id: ".......",
    //             selected: true,
    //             adminKey: true,
    //             kycKey: true,
    //             freezeKey: true,
    //             wipeKey: true,
    //             supplyKey: true,
    //         }
    //     ]
    // }

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