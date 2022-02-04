import { Response, Router } from 'express';
import { AuthenticatedRequest } from '../auth/auth.interface';
import JSZip from 'jszip'
import { getMongoRepository } from 'typeorm';
import { Policy } from '@entity/policy';
import { Guardians } from '@helpers/guardians';
import { findAllEntities } from '@helpers/utils';
import { PolicyImportExportHelper } from './helpers/policy-import-export-helper';
import { HederaMirrorNodeHelper } from 'vc-modules';
import { IPolicySubmitMessage, ISubmitModelMessage } from 'interfaces';
import { IPFS } from '@helpers/ipfs';

export const importExportAPI = Router();

importExportAPI.get('/:policyId/export', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const policy = await getMongoRepository(Policy).findOne(req.params.policyId);
        if (!policy) {
            throw new Error(`Cannot export policy ${req.params.policyId}`);
        }

        res.status(200).send({
            name: policy.name,
            version: policy.version,
            messageId: policy.messageId
        })
    } catch(e) {
        res.status(500).send({code: 500, message: e.message});
    }
});

importExportAPI.post('/import', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const ipfsHelper = new IPFS();
        const messageId = req.body.messageId;
        if (!messageId) {
            throw new Error('Policy ID in body is empty');
        }

        const existingPolicy = await getMongoRepository(Policy).findOne({ messageId: messageId });
        if (existingPolicy) {
            throw new Error('Policy already exists');
        }

        const topicMessage = await HederaMirrorNodeHelper.getTopicMessage(messageId);
        const message = JSON.parse(topicMessage.message) as IPolicySubmitMessage;
        const zip = await ipfsHelper.getFile(message.cid, "raw");
        const policyToImport = await PolicyImportExportHelper.parseZipFile(zip);

        console.log(JSON.stringify(policyToImport, null, 4));

        const policies = await PolicyImportExportHelper.importPolicy(policyToImport, req.user.did);
        res.status(201).json(policies);
    } catch (e) {
        res.status(500).send({ code: 500, message: e.message });
    }
});

importExportAPI.post('/import/preview', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const ipfsHelper = new IPFS();
        const guardians = new Guardians();
        const messageId = req.body.messageId;
        const topicMessage = await HederaMirrorNodeHelper.getTopicMessage(messageId);
        const message = JSON.parse(topicMessage.message) as IPolicySubmitMessage;
        const zip = await ipfsHelper.getFile(message.cid, "raw");
        const policyToImport = await PolicyImportExportHelper.parseZipFile(zip);

        console.log(JSON.stringify(policyToImport, null, 4));

        const schemasIds = findAllEntities(policyToImport.policy.config, 'schema');
        const schemas = await guardians.getSchemaPreview(schemasIds);
        res.status(200).json({ ...policyToImport, schemas });
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});