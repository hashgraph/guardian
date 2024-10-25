import { IAuthUser, PinoLogger } from '@guardian/common';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Response } from '@nestjs/common';
import { Permissions } from '@guardian/interfaces';
import { ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiQuery, ApiExtraModels, ApiParam } from '@nestjs/swagger';
import { Examples, InternalServerErrorDTO, SchemaRuleDTO, SchemaRuleRelationshipsDTO, pageHeader } from '#middlewares';
import { Guardians, InternalException, EntityOwner } from '#helpers';
import { AuthUser, Auth } from '#auth';

@Controller('schema-rules')
@ApiTags('schema-rules')
export class SchemaRulesApi {
    constructor(private readonly logger: PinoLogger) { }

    /**
     * Creates a new schema rule
     */
    @Post('/')
    @Auth(Permissions.SCHEMAS_RULE_CREATE)
    @ApiOperation({
        summary: 'Creates a new schema rule.',
        description: 'Creates a new schema rule.',
    })
    @ApiBody({
        description: 'Configuration.',
        type: SchemaRuleDTO,
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaRuleDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(SchemaRuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async createSchemaRule(
        @AuthUser() user: IAuthUser,
        @Body() rule: SchemaRuleDTO
    ): Promise<SchemaRuleDTO> {
        try {
            if (!rule) {
                throw new HttpException('Invalid config.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.createSchemaRule(rule, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get page
     */
    @Get('/')
    @Auth(Permissions.SCHEMAS_RULE_READ)
    @ApiOperation({
        summary: 'Return a list of all schema rules.',
        description: 'Returns all schema rules.',
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
        type: SchemaRuleDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(SchemaRuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getSchemaRules(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('policyInstanceTopicId') policyInstanceTopicId?: string
    ): Promise<SchemaRuleDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const { items, count } = await guardians.getSchemaRules({ policyInstanceTopicId, pageIndex, pageSize }, owner);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get schema rule by id
     */
    @Get('/:ruleId')
    @Auth(Permissions.SCHEMAS_RULE_READ)
    @ApiOperation({
        summary: 'Retrieves schema rule.',
        description: 'Retrieves schema rule for the specified ID.'
    })
    @ApiParam({
        name: 'ruleId',
        type: String,
        description: 'Schema rule Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaRuleDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(SchemaRuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getSchemaRuleById(
        @AuthUser() user: IAuthUser,
        @Param('ruleId') ruleId: string
    ): Promise<SchemaRuleDTO> {
        try {
            if (!ruleId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getSchemaRuleById(ruleId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Update schema rule
     */
    @Put('/:ruleId')
    @Auth(Permissions.SCHEMAS_RULE_CREATE)
    @ApiOperation({
        summary: 'Updates schema rule.',
        description: 'Updates schema rule configuration for the specified rule ID.',
    })
    @ApiParam({
        name: 'ruleId',
        type: 'string',
        required: true,
        description: 'Schema Rule Identifier',
        example: Examples.DB_ID,
    })
    @ApiBody({
        description: 'Object that contains a configuration.',
        required: true,
        type: SchemaRuleDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaRuleDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaRuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async updateSchemaRule(
        @AuthUser() user: IAuthUser,
        @Param('ruleId') ruleId: string,
        @Body() item: SchemaRuleDTO
    ): Promise<SchemaRuleDTO> {
        try {
            if (!ruleId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getSchemaRuleById(ruleId, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.updateSchemaRule(ruleId, item, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Delete schema rule
     */
    @Delete('/:ruleId')
    @Auth(Permissions.SCHEMAS_RULE_CREATE)
    @ApiOperation({
        summary: 'Deletes the schema rule.',
        description: 'Deletes the schema rule with the provided ID.',
    })
    @ApiParam({
        name: 'ruleId',
        type: 'string',
        required: true,
        description: 'Schema Rule Identifier',
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
    async deleteSchemaRule(
        @AuthUser() user: IAuthUser,
        @Param('ruleId') ruleId: string
    ): Promise<boolean> {
        try {
            if (!ruleId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.deleteSchemaRule(ruleId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Activate schema rule
     */
    @Put('/:ruleId/activate')
    @Auth(Permissions.SCHEMAS_RULE_CREATE)
    @ApiOperation({
        summary: 'Activates schema rule.',
        description: 'Activates schema rule for the specified rule ID.',
    })
    @ApiParam({
        name: 'ruleId',
        type: 'string',
        required: true,
        description: 'Schema Rule Identifier',
        example: Examples.DB_ID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaRuleDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaRuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async activateSchemaRule(
        @AuthUser() user: IAuthUser,
        @Param('ruleId') ruleId: string
    ): Promise<SchemaRuleDTO> {
        try {
            if (!ruleId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getSchemaRuleById(ruleId, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.activateSchemaRule(ruleId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }


    /**
     * Inactivate schema rule
     */
    @Put('/:ruleId/inactivate')
    @Auth(Permissions.SCHEMAS_RULE_CREATE)
    @ApiOperation({
        summary: 'Inactivates schema rule.',
        description: 'Inactivates schema rule for the specified rule ID.',
    })
    @ApiParam({
        name: 'ruleId',
        type: 'string',
        required: true,
        description: 'Schema Rule Identifier',
        example: Examples.DB_ID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaRuleDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaRuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async inactivateSchemaRule(
        @AuthUser() user: IAuthUser,
        @Param('ruleId') ruleId: string
    ): Promise<SchemaRuleDTO> {
        try {
            if (!ruleId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getSchemaRuleById(ruleId, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.inactivateSchemaRule(ruleId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get relationships by id
     */
    @Get('/:ruleId/relationships')
    @Auth(Permissions.SCHEMAS_RULE_READ)
    @ApiOperation({
        summary: 'Retrieves schema rule relationships.',
        description: 'Retrieves schema rule relationships for the specified ID.'
    })
    @ApiParam({
        name: 'ruleId',
        type: String,
        description: 'Schema Rule Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaRuleRelationshipsDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(SchemaRuleRelationshipsDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getSchemaRuleRelationships(
        @AuthUser() user: IAuthUser,
        @Param('ruleId') ruleId: string
    ): Promise<SchemaRuleRelationshipsDTO> {
        try {
            if (!ruleId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getSchemaRuleRelationships(ruleId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get rules and data
     */
    @Post('/data')
    @Auth(Permissions.SCHEMAS_RULE_EXECUTE)
    @ApiOperation({
        summary: '',
        description: '',
    })
    @ApiBody({
        description: 'Configuration.',
        type: SchemaRuleDTO,
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaRuleDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(SchemaRuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async getSchemaRuleData(
        @AuthUser() user: IAuthUser,
        @Body() options: any
    ): Promise<SchemaRuleDTO> {
        try {
            if (!options) {
                throw new HttpException('Invalid config.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getSchemaRuleData(options, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Import rules
     */
    @Post('/:policyId/import/file')
    @Auth(Permissions.SCHEMAS_RULE_CREATE)
    @ApiOperation({
        summary: 'Imports new rules from a zip file.',
        description: 'Imports new rules from the provided zip file into the local DB.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'A zip file containing rules to be imported.',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaRuleDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaRuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async importSchemaRule(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() zip: any
    ): Promise<SchemaRuleDTO> {
        const guardian = new Guardians();
        try {
            const owner = new EntityOwner(user);
            return await guardian.importSchemaRule(zip, policyId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Export rules
     */
    @Get('/:ruleId/export/file')
    @Auth(Permissions.SCHEMAS_RULE_READ)
    @ApiOperation({
        summary: 'Returns a zip file containing rules.',
        description: 'Returns a zip file containing rules.',
    })
    @ApiParam({
        name: 'ruleId',
        type: String,
        description: 'Schema Rule Identifier',
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
    async exportSchemaRule(
        @AuthUser() user: IAuthUser,
        @Param('ruleId') ruleId: string,
        @Response() res: any
    ): Promise<any> {
        const guardian = new Guardians();
        try {
            const owner = new EntityOwner(user);
            const file: any = await guardian.exportSchemaRule(ruleId, owner);
            res.header('Content-disposition', `attachment; filename=theme_${Date.now()}`);
            res.header('Content-type', 'application/zip');
            return res.send(file);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Preview schema rule
     */
    @Post('/import/file/preview')
    @Auth(Permissions.SCHEMAS_RULE_READ)
    @ApiOperation({
        summary: 'Imports a zip file containing rules.',
        description: 'Imports a zip file containing rules.',
    })
    @ApiBody({
        description: 'File.',
    })
    @ApiOkResponse({
        description: 'Schema rule preview.',
        type: SchemaRuleDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(SchemaRuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async previewSchemaRule(
        @AuthUser() user: IAuthUser,
        @Body() body: any
    ): Promise<any> {
        try {
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.previewSchemaRule(body, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }
}
