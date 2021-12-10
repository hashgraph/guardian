import { Response, Router } from 'express';
import { AuthenticatedRequest } from '../auth/auth.interface';
import JSZip from 'jszip'
import { getMongoRepository } from 'typeorm';
import { Policy } from '@entity/policy';
import { Guardians } from '@helpers/guardians';
import { findAllEntities } from '@helpers/utils';

export const importExportAPI = Router();

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
    const guardians = new Guardians();
    const zip = new JSZip();
    const {schemas, tokens} = req.body;
    const policy = await getMongoRepository(Policy).findOne(req.params.policyId);

    const [readySchemas, readyTokens] = await Promise.all([
        guardians.exportSchemes(schemas.filter(item => item.selected).map(item => item.uuid)),
        guardians.getTokens({ ids: tokens.filter(item => item.selected).map(item => item.tokenId) })
    ]);

    zip.folder('schemas')
    for (let schema of readySchemas) {
        zip.file(`schemas/${schema.name}.json`, JSON.stringify(schema));
    }

    zip.folder('tokens')
    for (let token of tokens) {
        zip.file(`tokens/${token.tokenName}.json`, JSON.stringify(token));
    }
    zip.file(`policy.json`, JSON.stringify(policy));

    const arcStream = zip.generateNodeStream();

    res.setHeader('Content-disposition', `attachment; filename=${policy.name}`);
    res.setHeader('Content-type', 'application/zip');
    arcStream.pipe(res);

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
});
