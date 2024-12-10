import { IAuthUser, PinoLogger } from '@guardian/common';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Response } from '@nestjs/common';
import { Permissions } from '@guardian/interfaces';
import { ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiQuery, ApiExtraModels, ApiParam } from '@nestjs/swagger';
import { Examples, InternalServerErrorDTO, PolicyLabelDTO, PolicyLabelRelationshipsDTO, VcDocumentDTO, pageHeader } from '#middlewares';
import { Guardians, InternalException, EntityOwner } from '#helpers';
import { AuthUser, Auth } from '#auth';

@Controller('policy-labels')
@ApiTags('policy-labels')
export class PolicyLabelsApi {
    constructor(private readonly logger: PinoLogger) { }

    /**
     * Creates a new policy label
     */
    @Post('/')
    @Auth(Permissions.STATISTICS_LABEL_CREATE)
    @ApiOperation({
        summary: 'Creates a new policy label.',
        description: 'Creates a new policy label.',
    })
    @ApiBody({
        description: 'Configuration.',
        type: PolicyLabelDTO,
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyLabelDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(PolicyLabelDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async createPolicyLabel(
        @AuthUser() user: IAuthUser,
        @Body() label: PolicyLabelDTO
    ): Promise<PolicyLabelDTO> {
        try {
            if (!label) {
                throw new HttpException('Invalid config.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.createPolicyLabel(label, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get page
     */
    @Get('/')
    @Auth(Permissions.STATISTICS_LABEL_READ)
    @ApiOperation({
        summary: 'Return a list of all policy labels.',
        description: 'Returns all policy labels.',
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
    })
    @ApiQuery({
        name: 'policyInstanceTopicId',
        type: String,
        description: 'Policy Instance Topic Id',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: PolicyLabelDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(PolicyLabelDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyLabels(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('policyInstanceTopicId') policyInstanceTopicId?: string
    ): Promise<PolicyLabelDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const { items, count } = await guardians.getPolicyLabels({
                policyInstanceTopicId, pageIndex, pageSize
            }, owner);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get policy label by id
     */
    @Get('/:labelId')
    @Auth(Permissions.STATISTICS_LABEL_READ)
    @ApiOperation({
        summary: 'Retrieves policy label.',
        description: 'Retrieves policy label for the specified ID.'
    })
    @ApiParam({
        name: 'labelId',
        type: String,
        description: 'policy label Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyLabelDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(PolicyLabelDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyLabelById(
        @AuthUser() user: IAuthUser,
        @Param('labelId') labelId: string
    ): Promise<PolicyLabelDTO> {
        try {
            if (!labelId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getPolicyLabelById(labelId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Update policy label
     */
    @Put('/:labelId')
    @Auth(Permissions.STATISTICS_LABEL_CREATE)
    @ApiOperation({
        summary: 'Updates policy label.',
        description: 'Updates policy label configuration for the specified label ID.',
    })
    @ApiParam({
        name: 'labelId',
        type: 'string',
        required: true,
        description: 'policy label Identifier',
        example: Examples.DB_ID,
    })
    @ApiBody({
        description: 'Object that contains a configuration.',
        required: true,
        type: PolicyLabelDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyLabelDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(PolicyLabelDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async updatePolicyLabel(
        @AuthUser() user: IAuthUser,
        @Param('labelId') labelId: string,
        @Body() item: PolicyLabelDTO
    ): Promise<PolicyLabelDTO> {
        try {
            if (!labelId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getPolicyLabelById(labelId, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.updatePolicyLabel(labelId, item, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Delete policy label
     */
    @Delete('/:labelId')
    @Auth(Permissions.STATISTICS_LABEL_CREATE)
    @ApiOperation({
        summary: 'Deletes the policy label.',
        description: 'Deletes the policy label with the provided ID.',
    })
    @ApiParam({
        name: 'labelId',
        type: 'string',
        required: true,
        description: 'policy label Identifier',
        example: Examples.DB_ID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async deletePolicyLabel(
        @AuthUser() user: IAuthUser,
        @Param('labelId') labelId: string
    ): Promise<boolean> {
        try {
            if (!labelId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.deletePolicyLabel(labelId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Activate policy label
     */
    @Put('/:labelId/publish')
    @Auth(Permissions.STATISTICS_LABEL_CREATE)
    @ApiOperation({
        summary: 'Publishes policy label.',
        description: 'Publishes policy label for the specified label ID.',
    })
    @ApiParam({
        name: 'labelId',
        type: 'string',
        required: true,
        description: 'policy label Identifier',
        example: Examples.DB_ID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyLabelDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(PolicyLabelDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async publishPolicyLabel(
        @AuthUser() user: IAuthUser,
        @Param('labelId') labelId: string
    ): Promise<PolicyLabelDTO> {
        try {
            if (!labelId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getPolicyLabelById(labelId, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.publishPolicyLabel(labelId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get relationships by id
     */
    @Get('/:labelId/relationships')
    @Auth(Permissions.STATISTICS_LABEL_READ)
    @ApiOperation({
        summary: 'Retrieves policy label relationships.',
        description: 'Retrieves policy label relationships for the specified ID.'
    })
    @ApiParam({
        name: 'labelId',
        type: String,
        description: 'policy label Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyLabelRelationshipsDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(PolicyLabelRelationshipsDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyLabelRelationships(
        @AuthUser() user: IAuthUser,
        @Param('labelId') labelId: string
    ): Promise<PolicyLabelRelationshipsDTO> {
        try {
            if (!labelId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getPolicyLabelRelationships(labelId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Import labels
     */
    @Post('/:policyId/import/file')
    @Auth(Permissions.STATISTICS_LABEL_CREATE)
    @ApiOperation({
        summary: 'Imports new labels from a zip file.',
        description: 'Imports new labels from the provided zip file into the local DB.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'A zip file containing labels to be imported.',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyLabelDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(PolicyLabelDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async importPolicyLabel(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() zip: any
    ): Promise<PolicyLabelDTO> {
        const guardian = new Guardians();
        try {
            const owner = new EntityOwner(user);
            return await guardian.importPolicyLabel(zip, policyId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Export labels
     */
    @Get('/:labelId/export/file')
    @Auth(Permissions.STATISTICS_LABEL_READ)
    @ApiOperation({
        summary: 'Returns a zip file containing labels.',
        description: 'Returns a zip file containing labels.',
    })
    @ApiParam({
        name: 'labelId',
        type: String,
        description: 'policy label Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation. Response zip file.'
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async exportPolicyLabel(
        @AuthUser() user: IAuthUser,
        @Param('labelId') labelId: string,
        @Response() res: any
    ): Promise<any> {
        const guardian = new Guardians();
        try {
            const owner = new EntityOwner(user);
            const file: any = await guardian.exportPolicyLabel(labelId, owner);
            res.header('Content-disposition', `attachment; filename=theme_${Date.now()}`);
            res.header('Content-type', 'application/zip');
            return res.send(file);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Preview policy label
     */
    @Post('/import/file/preview')
    @Auth(Permissions.STATISTICS_LABEL_CREATE)
    @ApiOperation({
        summary: 'Imports a zip file containing labels.',
        description: 'Imports a zip file containing labels.',
    })
    @ApiBody({
        description: 'File.',
    })
    @ApiOkResponse({
        description: 'policy label preview.',
        type: PolicyLabelDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(PolicyLabelDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async previewPolicyLabel(
        @AuthUser() user: IAuthUser,
        @Body() body: any
    ): Promise<any> {
        try {
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.previewPolicyLabel(body, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Preview policy label
     */
    @Post('/components')
    @Auth(Permissions.STATISTICS_LABEL_CREATE)
    @ApiOperation({
        summary: '.',
        description: '.',
    })
    @ApiBody({
        description: 'Filters.',
    })
    @ApiOkResponse({
        description: '.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(PolicyLabelDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async searchComponents(
        @AuthUser() user: IAuthUser,
        @Body() body: any
    ): Promise<any> {
        try {
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.searchComponents(body, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get documents
     */
    @Get('/:labelId/documents')
    @Auth(Permissions.STATISTICS_STATISTIC_READ)
    @ApiOperation({
        summary: 'Return a list of all documents.',
        description: 'Returns all documents.',
    })
    @ApiParam({
        name: 'labelId',
        type: String,
        description: 'policy label Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: VcDocumentDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(VcDocumentDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyLabelDocuments(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('labelId') labelId: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<VcDocumentDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const { items, count } = await guardians.getPolicyLabelDocuments(labelId, owner, pageIndex, pageSize);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }


    /**
     * Get document
     */
    @Get('/:labelId/documents/:documentId')
    @Auth(Permissions.STATISTICS_STATISTIC_READ)
    @ApiOperation({
        summary: 'Return a list of all documents.',
        description: 'Returns all documents.',
    })
    @ApiParam({
        name: 'labelId',
        type: String,
        description: 'policy label Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'documentId',
        type: String,
        description: 'Document Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: VcDocumentDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(VcDocumentDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyLabelDocument(
        @AuthUser() user: IAuthUser,
        @Param('labelId') labelId: string,
        @Param('documentId') documentId: string,
    ): Promise<VcDocumentDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.getPolicyLabelDocument(documentId, labelId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }
}
