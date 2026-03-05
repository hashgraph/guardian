import { IAuthUser, PinoLogger } from '@guardian/common';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Response } from '@nestjs/common';
import { Permissions, UserPermissions } from '@guardian/interfaces';
import { ApiBody, ApiCreatedResponse, ApiExtraModels, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiProduces, ApiQuery, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { Examples, InternalServerErrorDTO, FormulaDTO, FormulaRelationshipsDTO, pageHeader, FormulasOptionsDTO, FormulasDataDTO } from '#middlewares';
import { Guardians, InternalException, EntityOwner } from '#helpers';
import { AuthUser, Auth } from '#auth';

@Controller('formulas')
@ApiTags('formulas')
export class FormulasApi {
    constructor(private readonly logger: PinoLogger) { }

    /**
     * Creates a new formula
     */
    @Post('/')
    @Auth(Permissions.FORMULAS_FORMULA_CREATE)
    @ApiOperation({
        summary: 'Creates a new formula.',
        description: 'Creates a new formula.',
    })
    @ApiBody({
        description: 'Configuration.',
        type: FormulaDTO,
        required: true
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: FormulaDTO,
        example: { id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Tool name',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            messageId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            status: 'string',
            config: {} }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(FormulaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async createFormula(
        @AuthUser() user: IAuthUser,
        @Body() formula: FormulaDTO
    ): Promise<FormulaDTO> {
        try {
            if (!formula) {
                throw new HttpException('Invalid config.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.createFormula(formula, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get page
     */
    @Get('/')
    @Auth(Permissions.FORMULAS_FORMULA_READ)
    @ApiOperation({
        summary: 'Return a list of all formulas.',
        description: 'Returns all formulas.',
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
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: false,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: FormulaDTO,
        example: [{ id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Tool name',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            messageId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            status: 'string',
            config: {} }]
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(FormulaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getFormulas(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('policyId') policyId?: string
    ): Promise<FormulaDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const { items, count } = await guardians.getFormulas({
                policyId,
                pageIndex,
                pageSize
            }, owner);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get formula by id
     */
    @Get('/:formulaId')
    @Auth(Permissions.FORMULAS_FORMULA_READ)
    @ApiOperation({
        summary: 'Retrieves formula.',
        description: 'Retrieves formula for the specified ID.'
    })
    @ApiParam({
        name: 'formulaId',
        type: String,
        description: 'Formula Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: FormulaDTO,
        example: { id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Tool name',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            messageId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            status: 'string',
            config: {} }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(FormulaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getFormulaById(
        @AuthUser() user: IAuthUser,
        @Param('formulaId') formulaId: string
    ): Promise<FormulaDTO> {
        try {
            if (!formulaId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getFormulaById(formulaId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Update formula
     */
    @Put('/:formulaId')
    @Auth(Permissions.FORMULAS_FORMULA_CREATE)
    @ApiOperation({
        summary: 'Updates formula.',
        description: 'Updates formula configuration for the specified formula ID.',
    })
    @ApiParam({
        name: 'formulaId',
        type: 'string',
        required: true,
        description: 'Formula Identifier',
        example: Examples.DB_ID,
    })
    @ApiBody({
        description: 'Object that contains a configuration.',
        required: true,
        type: FormulaDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: FormulaDTO,
        example: { id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Tool name',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            messageId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            status: 'string',
            config: {} }
    })
    @ApiNotFoundResponse({ description: 'Resource not found.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(FormulaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async updateFormula(
        @AuthUser() user: IAuthUser,
        @Param('formulaId') formulaId: string,
        @Body() item: FormulaDTO
    ): Promise<FormulaDTO> {
        try {
            if (!formulaId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getFormulaById(formulaId, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.updateFormula(formulaId, item, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Delete formula
     */
    @Delete('/:formulaId')
    @Auth(Permissions.FORMULAS_FORMULA_CREATE)
    @ApiOperation({
        summary: 'Deletes the formula.',
        description: 'Deletes the formula with the provided ID.',
    })
    @ApiParam({
        name: 'formulaId',
        type: 'string',
        required: true,
        description: 'Formula Identifier',
        example: Examples.DB_ID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
        example: true
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async deleteFormula(
        @AuthUser() user: IAuthUser,
        @Param('formulaId') formulaId: string
    ): Promise<boolean> {
        try {
            if (!formulaId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.deleteFormula(formulaId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get relationships by id
     */
    @Get('/:formulaId/relationships')
    @Auth(Permissions.FORMULAS_FORMULA_CREATE)
    @ApiOperation({
        summary: 'Retrieves Formula relationships.',
        description: 'Retrieves Formula relationships for the specified ID.'
    })
    @ApiParam({
        name: 'formulaId',
        type: String,
        description: 'Formula Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: FormulaRelationshipsDTO,
        example: { policy: { id: Examples.DB_ID,
            uuid: Examples.UUID,
            name: 'Policy name',
            description: 'Description',
            topicDescription: 'Description',
            policyTag: 'Tag',
            status: 'DRAFT',
            creator: Examples.DID,
            owner: Examples.DID,
            topicId: Examples.ACCOUNT_ID,
            messageId: Examples.MESSAGE_ID,
            codeVersion: '1.0.0',
            createDate: Examples.DATE,
            version: '1.0.0',
            originalChanged: true,
            config: {},
            userRole: 'Installer',
            userRoles: ['Installer'],
            userGroup: {
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }, userGroups: [{
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }], policyRoles: ['Registrant'], policyNavigation: [{
            role: 'Registrant',
            steps: [{
                block: 'Block tag',
                level: 1,
                name: 'Step name'
            }]
        }], policyTopics: [{
            name: 'Project',
            description: 'Project',
            memoObj: 'topic',
            static: false,
            type: 'any'
        }], policyTokens: [{
            tokenName: 'Token name',
            tokenSymbol: 'Token symbol',
            tokenType: 'non-fungible',
            decimals: '',
            changeSupply: true,
            enableAdmin: true,
            enableFreeze: true,
            enableKYC: true,
            enableWipe: true,
            templateTokenTag: 'token_template_0'
        }], policyGroups: [{
            name: 'Group name',
            creator: 'Registrant',
            groupAccessType: 'Private',
            groupRelationshipType: 'Multiple',
            members: ['Registrant']
        }],
        categories: ['string'],
        projectSchema: Examples.UUID,
        tests: [{ id: Examples.DB_ID,
        uuid: Examples.UUID,
        name: 'Test Name',
        policyId: Examples.DB_ID,
        owner: Examples.DID,
        status: 'NEW',
        date: Examples.DATE,
        duration: 0,
        progress: 0,
        resultId: Examples.UUID,
        result: {} }],
        ignoreRules: [{ code: 'string',
        blockType: 'string',
        property: 'string',
        contains: 'string',
        severity: 'warning' }] },
        schemas: [{ id: Examples.DB_ID,
        uuid: Examples.UUID,
        name: 'Schema name',
        description: 'Description',
        entity: 'POLICY',
        iri: Examples.UUID,
        status: 'DRAFT',
        topicId: Examples.ACCOUNT_ID,
        version: '1.0.0',
        owner: Examples.DID,
        messageId: Examples.MESSAGE_ID,
        category: 'POLICY',
        documentURL: Examples.IPFS,
        contextURL: Examples.IPFS,
        document: {},
        context: {} }],
        formulas: [{ id: Examples.DB_ID,
        uuid: Examples.UUID,
        name: 'Tool name',
        description: 'Description',
        creator: Examples.DID,
        owner: Examples.DID,
        messageId: Examples.MESSAGE_ID,
        policyId: Examples.DB_ID,
        policyTopicId: Examples.ACCOUNT_ID,
        policyInstanceTopicId: Examples.ACCOUNT_ID,
        status: 'DRAFT',
        config: {} }] }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(FormulaRelationshipsDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getSchemaRuleRelationships(
        @AuthUser() user: IAuthUser,
        @Param('formulaId') formulaId: string
    ): Promise<FormulaRelationshipsDTO> {
        try {
            if (!formulaId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getFormulaRelationships(formulaId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Import formula
     */
    @Post('/:policyId/import/file')
    @Auth(Permissions.FORMULAS_FORMULA_CREATE)
    @ApiOperation({
        summary: 'Imports new formula from a zip file.',
        description: 'Imports new formula from the provided zip file into the local DB.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'A zip file containing formula to be imported.',
        required: true
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: FormulaDTO,
        example: { id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Tool name',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            messageId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            status: 'string',
            config: {} }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(FormulaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async importFormula(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() zip: any
    ): Promise<FormulaDTO> {
        const guardian = new Guardians();
        try {
            const owner = new EntityOwner(user);
            return await guardian.importFormula(zip, policyId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Export formula
     */
    @Get('/:formulaId/export/file')
    @Auth(Permissions.FORMULAS_FORMULA_READ)
    @ApiOperation({
        summary: 'Returns a zip file containing formula.',
        description: 'Returns a zip file containing formula.',
    })
    @ApiParam({
        name: 'formulaId',
        type: String,
        description: 'Formula Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiProduces('application/zip')
    @ApiOkResponse({
        description: 'Successful operation. Response zip file.',
        schema: {
            type: 'string',
            format: 'binary'
        },
        example: { result: 'ok' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async exportFormula(
        @AuthUser() user: IAuthUser,
        @Param('formulaId') formulaId: string,
        @Response() res: any
    ): Promise<any> {
        const guardian = new Guardians();
        try {
            const owner = new EntityOwner(user);
            const file: any = await guardian.exportFormula(formulaId, owner);
            res.header('Content-disposition', `attachment; filename=theme_${Date.now()}`);
            res.header('Content-type', 'application/zip');
            return res.send(file);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Preview formula
     */
    @Post('/import/file/preview')
    @Auth(Permissions.FORMULAS_FORMULA_CREATE)
    @ApiOperation({
        summary: 'Imports a zip file containing formula.',
        description: 'Imports a zip file containing formula.',
    })
    @ApiBody({
        description: 'File.',
    })
    @ApiOkResponse({
        description: 'Formula preview.',
        type: FormulaDTO,
        example: { id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Tool name',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            messageId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            status: 'string',
            config: {} }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(FormulaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async previewFormula(
        @AuthUser() user: IAuthUser,
        @Body() body: any
    ): Promise<any> {
        try {
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.previewFormula(body, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Draft formula
     */
    @Put('/:formulaId/draft')
    @Auth(Permissions.FORMULAS_FORMULA_CREATE)
    @ApiOperation({
        summary: 'Return formula to editing.',
        description: 'Return formula to editing for the specified formula ID.',
    })
    @ApiParam({
        name: 'formulaId',
        type: String,
        description: 'Formula Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: FormulaDTO,
        example: { id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Tool name',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            messageId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            status: 'string',
            config: {} }
    })
    @ApiNotFoundResponse({ description: 'Resource not found.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(FormulaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async draftFormula(
        @AuthUser() user: IAuthUser,
        @Param('formulaId') formulaId: string
    ): Promise<FormulaDTO> {
        try {
            if (!formulaId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getFormulaById(formulaId, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.draftFormula(formulaId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Dry-Run formula
     */
    @Put('/:formulaId/dry-run')
    @Auth(Permissions.FORMULAS_FORMULA_CREATE)
    @ApiOperation({
        summary: 'Dry Run formula.',
        description: 'Run formula without making any persistent changes or executing transaction.',
    })
    @ApiParam({
        name: 'formulaId',
        type: String,
        description: 'Formula Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: FormulaDTO,
        example: { id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Tool name',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            messageId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            status: 'string',
            config: {} }
    })
    @ApiNotFoundResponse({ description: 'Resource not found.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(FormulaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async dryRunFormula(
        @AuthUser() user: IAuthUser,
        @Param('formulaId') formulaId: string
    ): Promise<FormulaDTO> {
        try {
            if (!formulaId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getFormulaById(formulaId, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.dryRunFormula(formulaId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Publish formula
     */
    @Put('/:formulaId/publish')
    @Auth(Permissions.FORMULAS_FORMULA_CREATE)
    @ApiOperation({
        summary: 'Publishes formula.',
        description: 'Publishes formula for the specified formula ID.',
    })
    @ApiParam({
        name: 'formulaId',
        type: String,
        description: 'Formula Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: FormulaDTO,
        example: { id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Tool name',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            messageId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            status: 'string',
            config: {} }
    })
    @ApiNotFoundResponse({ description: 'Resource not found.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(FormulaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async publishFormula(
        @AuthUser() user: IAuthUser,
        @Param('formulaId') formulaId: string
    ): Promise<FormulaDTO> {
        try {
            if (!formulaId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getFormulaById(formulaId, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.publishFormula(formulaId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get formulas and data
     */
    @Post('/data')
    @Auth()
    @ApiOperation({
        summary: 'Retrieves formulas and associated data.',
        description: 'Retrieves formulas and their associated data based on the provided options.',
    })
    @ApiBody({
        description: 'Options.',
        type: FormulasOptionsDTO,
        required: true
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: FormulasDataDTO,
        example: { formulas: [{ id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Tool name',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            messageId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            status: 'string',
            config: {} }],
            document: { id: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            hash: 'hash',
            signature: 0,
            status: 'NEW',
            tag: 'Block tag',
            type: 'Document type',
            createDate: 'string',
            updateDate: 'string',
            owner: 'string',
            document: { id: 'f3b2a9c1e4d5678901234567',
            type: ['string'],
            credentialSubject: {},
            issuer: {},
            issuanceDate: 'string',
            proof: { type: 'string',
            created: 'string',
            verificationMethod: 'string',
            proofPurpose: 'string',
            jws: 'string' } } },
            relationships: [{ id: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            hash: 'hash',
            signature: 0,
            status: 'NEW',
            tag: 'Block tag',
            type: 'Document type',
            createDate: 'string',
            updateDate: 'string',
            owner: 'string',
            document: { id: 'f3b2a9c1e4d5678901234567',
            type: [{}],
            credentialSubject: {},
            issuer: {},
            issuanceDate: 'string',
            proof: { type: {},
            created: {},
            verificationMethod: {},
            proofPurpose: {},
            jws: {} } } }],
            schemas: [{ id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Schema name',
            description: 'Description',
            entity: 'string',
            iri: 'string',
            status: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            version: '1.0.0',
            owner: 'string',
            messageId: 'f3b2a9c1e4d5678901234567',
            category: 'string',
            documentURL: 'https://example.com',
            contextURL: 'https://example.com',
            document: {},
            context: {} }] }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(FormulasDataDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async getSchemaRuleData(
        @AuthUser() user: IAuthUser,
        @Body() options: FormulasOptionsDTO
    ): Promise<FormulasDataDTO> {
        try {
            if (!options) {
                throw new HttpException('Invalid config.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            if (!UserPermissions.has(user, [Permissions.POLICIES_POLICY_EXECUTE, Permissions.POLICIES_POLICY_MANAGE])) {
                return null;
            } else {
                const owner = new EntityOwner(user);
                const guardian = new Guardians();
                return await guardian.getFormulasData(options, owner);
            }
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
