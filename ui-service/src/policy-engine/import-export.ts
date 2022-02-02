import { Response, Router } from 'express';
import { AuthenticatedRequest } from '../auth/auth.interface';
import JSZip from 'jszip'
import { getMongoRepository } from 'typeorm';
import { Policy } from '@entity/policy';
import { Guardians } from '@helpers/guardians';
import { findAllEntities } from '@helpers/utils';
import {GenerateUUIDv4} from '@policy-engine/helpers/uuidv4';
import { PolicyImportExportHelper } from './helpers/policy-import-export-helper';
import { HederaMirrorNodeHelper } from 'vc-modules';
import { ISubmitModelMessage } from 'interfaces';
import { IPFS } from '@helpers/ipfs';

export const importExportAPI = Router();

importExportAPI.get('/:policyId/export', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const policy = await getMongoRepository(Policy).findOne(req.params.policyId);
        const zip = await PolicyImportExportHelper.generateZipFile(policy);
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
        const policies = await PolicyImportExportHelper.importPolicy(req.body, req.user.did);
        res.status(201).json(policies);
    } catch (e) {
        res.status(500).send({code: 500, message: e.message});
    }
});

importExportAPI.post('/import/topic', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const ipfsHelper = new IPFS();
        const messageId = req.body.messageId;
        const topicMessage = await HederaMirrorNodeHelper.getTopicMessage(messageId) as ISubmitModelMessage;
        const policyToImport = await PolicyImportExportHelper.parseZipFile(await ipfsHelper.getFile(topicMessage.cid, "raw"));
        const policies = await PolicyImportExportHelper.importPolicy(policyToImport, req.user.did);

        res.status(201).json(policies);
    } catch (e) {
        res.status(500).send({code: 500, message: e.message});
    }
});

importExportAPI.get('/import/preview/:messageId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const ipfsHelper = new IPFS();
        const messageId = req.params.messageId;
        const topicMessage = await HederaMirrorNodeHelper.getTopicMessage(messageId) as ISubmitModelMessage;
        const policyToImport = await PolicyImportExportHelper.parseZipFile(await ipfsHelper.getFile(topicMessage.cid, "raw"));
        res.status(200).json(policyToImport);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
})

importExportAPI.post('/import/preview', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await PolicyImportExportHelper.parseZipFile(req.body));
    } catch (e) {
        res.status(500).send({code: 500, message: e.message});
    }
})
