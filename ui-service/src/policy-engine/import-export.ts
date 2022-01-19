import { Response, Router } from 'express';
import { AuthenticatedRequest } from '../auth/auth.interface';
import JSZip from 'jszip'
import { getMongoRepository } from 'typeorm';
import { Policy } from '@entity/policy';
import { Guardians } from '@helpers/guardians';
import { findAllEntities } from '@helpers/utils';
import {GenerateUUIDv4} from '@policy-engine/helpers/uuidv4';

export const importExportAPI = Router();

importExportAPI.get('/:policyId/export', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const policy = await getMongoRepository(Policy).findOne(req.params.policyId);
        const guardians = new Guardians();

        const refs = findAllEntities(policy.config, 'schema');
        const tokenIds = findAllEntities(policy.config, 'tokenId');

        const [schemas, tokens] = await Promise.all([
            guardians.exportSchemes(refs),
            guardians.getTokens({ids: tokenIds})
        ]);

        const zip = new JSZip();
        zip.folder('schemas')
        for (let schema of schemas) {
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
    } catch(e) {
        res.status(500).send({code: 500, message: e.message});
    }
});

importExportAPI.post('/import', async (req: AuthenticatedRequest, res: Response) => {
    try {
        let {policy, tokens, schemas} = req.body
        const guardians = new Guardians();

        const dateNow = '_' + Date.now();

        for (let token of tokens) {
            delete token.id;
            delete token.selected;
        }
        for (let schema of schemas) {
            delete schema.owner;
            delete schema.id;
            delete schema.status;
        }

        const policyRepository = getMongoRepository(Policy);
        policy.policyTag = policy.tag + dateNow;
        if (await policyRepository.findOne({name: policy.name})) {
            policy.name = policy.name + dateNow;
        }

        delete policy.id;
        delete policy.status;
        policy.owner = req.user.did;

        await Promise.all([
            guardians.importTokens(tokens),
            guardians.importSchemes(schemas),
            policyRepository.save(policyRepository.create(policy))
        ]);

        res.status(201).json(await policyRepository.find({owner: req.user.did}));
    } catch (e) {
        res.status(500).send({code: 500, message: e.message});
    }
});

importExportAPI.post('/import/preview', async (req: AuthenticatedRequest, res: Response) => {
    try {
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
    } catch (e) {
        res.status(500).send({code: 500, message: e.message});
    }
})
