import { permissionHelper } from '@auth/authorization-helper';
import { Response, Router, NextFunction } from 'express';
import { PolicyType, UserRole } from '@guardian/interfaces';
import { AuthenticatedRequest, Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import { PolicyEngine } from '@helpers/policy-engine';
import createError from 'http-errors';

/**
 * Artifact route
 */
export const artifactAPI = Router();

artifactAPI.get('/',
  permissionHelper(UserRole.STANDARD_REGISTRY),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
        return res.setHeader('X-Total-Count', count).json(artifacts);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

artifactAPI.post('/:policyId', permissionHelper(UserRole.STANDARD_REGISTRY),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const guardian = new Guardians();
        const policyEngine = new PolicyEngine();
        const policy = await policyEngine.getPolicy({
            filters: {
                id: req.params.policyId,
                owner: req.user.did
            }
        });
        if (!policy || policy.status !== PolicyType.DRAFT) {
            return next(createError(422, 'There is no appropriate policy or policy is not in DRAFT status'));
        }
        const files = req.files;
        if (!files) {
            return next(createError(422, 'There are no files to upload'));
        }
        const artifacts = Array.isArray(files.artifacts) ? files.artifacts : [files.artifacts];
        const uploadedArtifacts = [];
        for (const artifact of artifacts) {
            if (!artifact) {
                continue;
            }
            uploadedArtifacts.push(await guardian.uploadArtifact(artifact, req.user.did, req.params.policyId));
        }
        return res.status(201).json(uploadedArtifacts);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

artifactAPI.delete('/:artifactId',
  permissionHelper(UserRole.STANDARD_REGISTRY),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const guardian = new Guardians();
        await guardian.deleteArtifact(req.params.artifactId, req.user.did)
        return res.status(204).send();
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});
