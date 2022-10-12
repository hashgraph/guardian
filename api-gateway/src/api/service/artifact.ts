import { permissionHelper } from '@auth/authorization-helper';
import { Response, Router } from 'express';
import { PolicyType, UserRole } from '@guardian/interfaces';
import { AuthenticatedRequest, Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import { PolicyEngine } from '@helpers/policy-engine';

/**
 * Artifact route
 */
export const artifactAPI = Router();

artifactAPI.get('/', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const policyId = req.query.policyId as string;
        const guardians = new Guardians();
        let pageIndex: any;
        let pageSize: any;
        if (req.query && req.query.pageIndex && req.query.pageSize) {
            pageIndex = req.query.pageIndex;
            pageSize = req.query.pageSize;
        }
        const { artifacts, count } = await guardians.getArtifacts(req.user.did, policyId, pageIndex, pageSize);
        res.status(200).setHeader('X-Total-Count', count).json(artifacts);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: error.code || 500, message: error.message });
    }
});

artifactAPI.post('/:policyId', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardian = new Guardians();
        const policyEngine = new PolicyEngine();
        if (!req.params.policyId) {
            throw new Error('Invalid Policy Identitifer');
        }
        const policy = await policyEngine.getPolicy({
            filters: {
                id: req.params.policyId,
                owner: req.user.did
            }
        });
        if (!policy || policy.status !== PolicyType.DRAFT) {
            throw new Error('There is no appropriate policy or policy is not in DRAFT status');
        }
        const files = req.files;
        if (!files) {
            throw new Error('There are no files to upload');
        }
        const artifacts = Array.isArray(files.artifacts) ? files.artifacts : [files.artifacts];
        const uploadedArtifacts = [];
        for (const artifact of artifacts) {
            if (!artifact) {
                continue;
            }
            uploadedArtifacts.push(await guardian.uploadArtifact(artifact, req.user.did, req.params.policyId as string));
        }
        res.status(201).json(uploadedArtifacts);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: error.code || 500, message: error.message });
    }
});

artifactAPI.delete('/:artifactId', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardian = new Guardians();
        if (!req.params.artifactId) {
            throw new Error('Invalid Artifact Identitifer');
        }
        res.status(201).json(await guardian.deleteArtifact(req.params.artifactId as string, req.user.did));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: error.code || 500, message: error.message });
    }
});