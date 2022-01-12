import { Response, Router } from 'express';
import { AuthenticatedRequest } from '../auth/auth.interface';
import JSZip from 'jszip'
import { getMongoRepository } from 'typeorm';
import { Policy } from '@entity/policy';
import { Guardians } from '@helpers/guardians';
import { findAllEntities } from '@helpers/utils';
import {GenerateUUIDv4} from '@policy-engine/helpers/uuidv4';

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

importExportAPI.post('/import', async (req: AuthenticatedRequest, res: Response) => {
    try {
        let {policy, tokens, schemas} = req.body
        const guardians = new Guardians();

        const dateNow = '_' + Date.now();

        const existingTokens = await guardians.getTokens({});
        const existingSchemas = await guardians.getSchemes({});
        for (let token of tokens) {
            delete token.selected;
        }
        tokens = tokens.filter(token => existingTokens.includes(token.tokenId));
        tokens = tokens.map(t => existingTokens.find(_t => t.tokenId === _t.tokenId));

        for (let i = 0; i < schemas.length; ++i) {
            const schema = schemas[i]
            const oldUUID = schema.uuid;
            const newUUID = GenerateUUIDv4();
            if (existingSchemas.map(schema => schema.uuid).includes(oldUUID)) {
                schema.name = schema.name + dateNow;
            }
            schema.uuid = newUUID;
            schemas[i] = JSON.parse(JSON.stringify(schema).replace(new RegExp(oldUUID, 'g'), newUUID));
            policy = JSON.parse(JSON.stringify(policy).replace(new RegExp(oldUUID, 'g'), newUUID));
        }

        const policyRepository = getMongoRepository(Policy);
        policy.policyTag = policy.policyTag + dateNow;
        if (await policyRepository.findOne({name: policy.name})) {
            policy.name = policy.name + dateNow;
        }

        delete policy.id;
        delete policy.status;
        await Promise.all([
            Promise.all(tokens.map(token => guardians.setToken(token))),
            guardians.importSchemes(schemas),
            policyRepository.save(policyRepository.create(policy))
        ]);

        res.json(await policyRepository.find());
    } catch (e) {
        console.error("Failed to import package", e)
        res.status(500).send(e);
    }
});

importExportAPI.put('/import/upload', async (req: AuthenticatedRequest, res: Response) => {
    const zip = new JSZip();

    const content = await zip.loadAsync(req.body);

    let policyString = await content.files['policy.json'].async('string');
    const schemaStringArray = await Promise.all(Object.entries(content.files)
        .filter(file => !file[1].dir)
        .filter(file => /^schemas\/.+/.test(file[0]))
        .map(file => file[1].async('string')));

    const tokensStringArray = await Promise.all(Object.entries(content.files)
        .filter(file => !file[1].dir)
        .filter(file => /^tokens\/.+/.test(file[0]))
        .map(file => file[1].async('string')));

    const policy = JSON.parse(policyString);
    const tokens = tokensStringArray.map(item => JSON.parse(item));
    const schemas = schemaStringArray.map(item => JSON.parse(item));


    res.json({policy, tokens, schemas});
})
