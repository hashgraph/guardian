import { PolicyType } from '@guardian/interfaces';
import { Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import { PolicyEngine } from '@helpers/policy-engine';
import { Controller, Delete, Get, Post, Req, Response } from '@nestjs/common';

@Controller('artifacts')
export class ArtifactApi {

    /**
     * Get artifacts
     * @param req
     * @param res
     */
    @Get('/')
    async getArtifacts(@Req() req, @Response() res): Promise<any> {
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
            throw error
        }
    }

    /**
     * upload
     * @param req
     * @param res
     */
    @Post('/:policyId')
    async uploadArtifacts(@Req() req, @Response() res): Promise<any> {
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
                throw new Error('There is no appropriate policy or policy is not in DRAFT status')
                // return next(createError(422, 'There is no appropriate policy or policy is not in DRAFT status'));
            }
            const files = req.files;
            if (!files) {
                throw new Error('There are no files to upload')
                // return next(createError(422, 'There are no files to upload'));
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
            throw error;
        }
    }

    @Delete('/:artifactId')
    async deleteArtifact(@Req() req, @Response() res): Promise<any> {
        try {
            const guardian = new Guardians();
            await guardian.deleteArtifact(req.params.artifactId, req.user.did)
            return res.status(204).send();
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }
}
