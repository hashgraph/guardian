import { IAuthUser, PinoLogger } from '@guardian/common';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Response } from '@nestjs/common';
import { Permissions } from '@guardian/interfaces';
import { ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiQuery, ApiExtraModels, ApiParam } from '@nestjs/swagger';
import { Examples, InternalServerErrorDTO, FormulaDTO, FormulaRelationshipsDTO, pageHeader } from '#middlewares';
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
    @ApiOkResponse({
        description: 'Successful operation.',
        type: FormulaDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
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
            await InternalException(error, this.logger);
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
        type: FormulaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(FormulaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getFormulas(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('policyInstanceTopicId') policyInstanceTopicId?: string
    ): Promise<FormulaDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const { items, count } = await guardians.getFormulas({
                policyInstanceTopicId,
                pageIndex,
                pageSize
            }, owner);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger);
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
        type: FormulaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
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
            await InternalException(error, this.logger);
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
        type: FormulaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
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
            await InternalException(error, this.logger);
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
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
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
            await InternalException(error, this.logger);
        }
    }


    /**
     * Get relationships by id
     */
    @Get('/:formulaId/relationships')
    @Auth(Permissions.SCHEMAS_RULE_READ)
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
        type: FormulaRelationshipsDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
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
            await InternalException(error, this.logger);
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
    @ApiOkResponse({
        description: 'Successful operation.',
        type: FormulaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
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
            await InternalException(error, this.logger);
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
    @ApiOkResponse({
        description: 'Successful operation. Response zip file.'
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
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
            await InternalException(error, this.logger);
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
        type: FormulaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
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
            await InternalException(error, this.logger);
        }
    }
}
