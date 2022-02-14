import { Response, Router } from 'express';
import { AuthenticatedRequest } from '../auth/auth.interface';
import JSZip from 'jszip'
import { getMongoRepository } from 'typeorm';
import { Policy } from '@entity/policy';
import { Guardians } from '@helpers/guardians';
import { findAllEntities } from '@helpers/utils';
import { PolicyImportExportHelper } from './helpers/policy-import-export-helper';
import { HederaMirrorNodeHelper } from 'vc-modules';
import { IPFS } from '@helpers/ipfs';

export const importExportAPI = Router();

importExportAPI.get('/:policyId/export/file', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const policy = await getMongoRepository(Policy).findOne(req.params.policyId);
        if (!policy) {
            throw new Error(`Cannot export policy ${req.params.policyId}`);
        }

        const zip = await PolicyImportExportHelper.generateZipFile(policy);
        const arcStream = zip.generateNodeStream();
        res.setHeader('Content-disposition', `attachment; filename=${policy.name}`);
        res.setHeader('Content-type', 'application/zip');
        arcStream.pipe(res);
    } catch(e) {
        res.status(500).send({code: 500, message: e.message});
    }
});

importExportAPI.get('/:policyId/export/message', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const policy = await getMongoRepository(Policy).findOne(req.params.policyId);
        if (!policy) {
            throw new Error(`Cannot export policy ${req.params.policyId}`);
        }

        res.status(200).send({
            id: policy.id,
            name: policy.name,
            description: policy.description,
            version: policy.version,
            messageId: policy.messageId,
            owner: policy.owner
        })
    } catch (e) {
        res.status(500).send({ code: 500, message: e.message });
    }
});

importExportAPI.post('/import/message', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const messageId = req.body.messageId;
        if (!messageId) {
            throw new Error('Policy ID in body is empty');
        }

        const ipfsHelper = new IPFS();
        const topicMessage = await HederaMirrorNodeHelper.getPolicyTopicMessage(messageId);
        const message = topicMessage.message;
        const zip = await ipfsHelper.getFile(message.cid, "raw");

        if (!zip) {
            throw new Error('file in body is empty');
        }

        const policyToImport = await PolicyImportExportHelper.parseZipFile(zip);
        const policies = await PolicyImportExportHelper.importPolicy(policyToImport, req.user.did);
        res.status(201).json(policies);
    } catch (e) {
        res.status(500).send({ code: 500, message: e.message });
    }
});

importExportAPI.post('/import/file', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const zip = req.body;
        if (!zip) {
            throw new Error('file in body is empty');
        }
        const policyToImport = await PolicyImportExportHelper.parseZipFile(zip);
        const policies = await PolicyImportExportHelper.importPolicy(policyToImport, req.user.did);
        res.status(201).json(policies);
    } catch (e) {
        res.status(500).send({ code: 500, message: e.message });
    }
});

importExportAPI.post('/import/message/preview', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const messageId = req.body.messageId;
        if (!messageId) {
            throw new Error('Policy ID in body is empty');
        }

        const ipfsHelper = new IPFS();
        const topicMessage = await HederaMirrorNodeHelper.getPolicyTopicMessage(messageId);
        const message = topicMessage.message;
        const zip = await ipfsHelper.getFile(message.cid, "raw");

        if (!zip) {
            throw new Error('file in body is empty');
        }

        const guardians = new Guardians();
        const policyToImport = await PolicyImportExportHelper.parseZipFile(zip);
        const schemasIds = findAllEntities(policyToImport.policy.config, 'schema');
        // const schemas = await guardians.getSchemaPreview(schemasIds);
        // res.status(200).json({ ...policyToImport, schemas });
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

importExportAPI.post('/import/file/preview', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const zip = req.body;
        if (!zip) {
            throw new Error('file in body is empty');
        }
        const policyToImport = await PolicyImportExportHelper.parseZipFile(zip);
        res.status(200).json(policyToImport);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});