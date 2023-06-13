import { PolicyType, UserRole } from '@guardian/interfaces';
import { Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import { PolicyEngine } from '@helpers/policy-engine';
import { Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Post, Req, Response } from '@nestjs/common';
import { checkPermission } from '@auth/authorization-helper';
import { ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { InternalServerErrorDTO } from '@middlewares/validation/schemas/errors';
import { ApiImplicitQuery } from '@nestjs/swagger/dist/decorators/api-implicit-query.decorator';
import { ArtifactDTOItem } from '@middlewares/validation/schemas/atrifacts';

@Controller('artifacts')
@ApiTags('artifacts')
export class ArtifactApi {

    /**
     * Get artifacts
     * @param req
     * @param res
     */
    @ApiOperation({
        summary: 'Returns all artifacts.',
        description: 'Returns all artifacts.',
    })
    @ApiExtraModels(ArtifactDTOItem, InternalServerErrorDTO)
    @ApiImplicitQuery({
        name: 'policyId',
        type: String,
        description: 'Policy identifier',
        required: false
    })
    @ApiImplicitQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false
    })
    @ApiImplicitQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'array',
            items: {
                $ref: getSchemaPath(ArtifactDTOItem),
            }
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Get('/')
    @HttpCode(HttpStatus.OK)
    async getArtifacts(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
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
            throw error;
        }
    }

    /**
     * upload
     * @param req
     * @param res
     */
    @Post('/:policyId')
    @HttpCode(HttpStatus.CREATED)
    async uploadArtifacts(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
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
                throw new HttpException('There is no appropriate policy or policy is not in DRAFT status', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const files = req.files;
            if (!files) {
                throw new HttpException('There are no files to upload', HttpStatus.UNPROCESSABLE_ENTITY)
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
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteArtifact(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
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
