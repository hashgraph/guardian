import { Guardians } from '@helpers/guardians';
import { ContractType, UserRole } from '@guardian/interfaces';
import { Logger } from '@guardian/common';
import { Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Post, Req, Response, } from '@nestjs/common';
import { checkPermission } from '@auth/authorization-helper';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiExtraModels, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnauthorizedResponse, } from '@nestjs/swagger';
import { InternalServerErrorDTO } from '@middlewares/validation/schemas/errors';
import { ContractDTO, RetirePoolDTO, RetirePoolTokenDTO, RetireRequestDTO, RetireRequestTokenDTO, WiperRequestDTO, } from '@middlewares/validation/schemas/contracts';

/**
 * Contracts api
 */
@Controller('contracts')
@ApiTags('contracts')
export class ContractsApi {
    //#region Common contract endpoints
    @Get()
    @ApiBearerAuth()
    @ApiExtraModels(ContractDTO, InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Return a list of all contracts.',
        description: 'Returns all contracts.',
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description:
            'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0,
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20,
    })
    @ApiQuery({
        name: 'type',
        enum: ContractType,
        description: 'Contract type',
        required: false,
        example: ContractType.RETIRE,
    })
    @ApiOkResponse({
        description: 'Contracts.',
        isArray: true,
        headers: {
            'x-total-count': {
                schema: {
                    type: 'integer',
                },
                description: 'Total items in the collection.',
            },
        },
        type: ContractDTO,
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async getContracts(@Req() req, @Response() res): Promise<any> {
        await checkPermission(
            UserRole.STANDARD_REGISTRY,
            UserRole.USER
        )(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            const [contracts, count] = await guardians.getContracts(
                user.parent || user.did,
                req.query.type as any,
                req.query.pageIndex as any,
                req.query.pageSize as any
            );
            return res.setHeader('X-Total-Count', count).json(contracts);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('/')
    @ApiBearerAuth()
    @ApiExtraModels(ContractDTO, InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Create contract.',
        description:
            'Create smart-contract. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                description: {
                    type: 'string',
                },
            },
        },
    })
    @ApiCreatedResponse({
        description: 'Created contract.',
        type: ContractDTO,
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.CREATED)
    async createContract(@Req() req): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const { description, type } = req.body;
            const guardians = new Guardians();
            return await guardians.createContract(user.did, description, type);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('/import')
    @ApiBearerAuth()
    @ApiExtraModels(ContractDTO, InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Import contract.',
        description:
            'Import smart-contract. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                contractId: {
                    type: 'string',
                    description: 'Hedera Identifier',
                    example: '0.0.1',
                },
                description: {
                    type: 'string',
                },
            },
            required: ['contractId'],
        },
    })
    @ApiOkResponse({
        description: 'Imported contract.',
        type: ContractDTO,
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async importContract(@Req() req): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const { contractId, description } = req.body;
            const guardians = new Guardians();
            return await guardians.importContract(
                user.did,
                contractId,
                description
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * use cache
     * @param req
     */
    @Get('/:contractId/permissions')
    @ApiBearerAuth()
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Get contract permissions.',
        description:
            'Get smart-contract permissions. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        type: 'string',
        required: true,
        description: 'Contract Identifier',
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Contract permissions.',
        type: Number,
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async contractPermissions(@Req() req): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return await guardians.checkContractPermissions(
                user.did,
                req.params.contractId
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Delete('/:contractId')
    @ApiBearerAuth()
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Remove contract.',
        description:
            'Remove smart-contract. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        type: 'string',
        required: true,
        description: 'Contract Identifier',
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async removeContract(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.removeContract(
                    user?.did,
                    req.params?.contractId as string
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
    //#endregion
    //#region Wipe contract endpoints

    /**
     * use cache
     * @param req
     * @param res
     */
    @Get('/wipe/requests')
    @ApiBearerAuth()
    @ApiExtraModels(ContractDTO, InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Return a list of all wipe requests.',
        description:
            'Returns all wipe requests. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description:
            'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0,
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20,
    })
    @ApiQuery({
        name: 'contractId',
        type: String,
        description: 'Contract identifier',
        required: false,
        example: '0.0.1',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: {
            'x-total-count': {
                schema: {
                    type: 'integer',
                },
                description: 'Total items in the collection.',
            },
        },
        type: WiperRequestDTO,
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async getWipeRequests(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            const [contracts, count] = await guardians.getWipeRequests(
                user.parent || user.did,
                req.query.contractId as any,
                req.query.pageIndex as any,
                req.query.pageSize as any
            );
            return res.setHeader('X-Total-Count', count).json(contracts);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('/wipe/:contractId/requests/enable')
    @ApiBearerAuth()
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Enable wipe requests.',
        description:
            'Enable wipe contract requests. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        type: String,
        description: 'Contract identifier',
        required: false,
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async enableWipeRequests(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.enableWipeRequests(
                    user.did,
                    req.params.contractId
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('/wipe/:contractId/requests/disable')
    @ApiBearerAuth()
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Disable wipe requests.',
        description:
            'Disable wipe contract requests. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        type: String,
        description: 'Contract identifier',
        required: false,
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async disableWipeRequests(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.disableWipeRequests(
                    user.did,
                    req.params.contractId
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('/wipe/requests/:requestId/approve')
    @ApiBearerAuth()
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Approve wipe request.',
        description:
            'Approve wipe contract request. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'requestId',
        type: String,
        description: 'Request identifier',
        required: true,
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async approveWipeRequest(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.approveWipeRequest(
                    user.did,
                    req.params.requestId
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Delete('/wipe/requests/:requestId/reject')
    @ApiBearerAuth()
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Reject wipe request.',
        description:
            'Reject wipe contract request. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'requestId',
        type: String,
        description: 'Request identifier',
        required: true,
        example: '652745597a7b53526de37c05',
    })
    @ApiQuery({
        name: 'ban',
        type: Boolean,
        description: 'Reject and ban',
        required: false,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async rejectWipeRequest(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.rejectWipeRequest(
                    user.did,
                    req.params.requestId,
                    req.query.ban?.toLowerCase() === 'true'
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Delete('/wipe/:contractId/requests')
    @ApiBearerAuth()
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Clear wipe requests.',
        description:
            'Clear wipe contract requests. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        type: String,
        description: 'Contract identifier',
        required: true,
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async clearWipeRequests(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.clearWipeRequests(
                    user.did,
                    req.params.contractId
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('/wipe/:contractId/admin/:hederaId')
    @ApiBearerAuth()
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Add wipe admin.',
        description:
            'Add wipe contract admin. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        type: String,
        description: 'Contract identifier',
        required: true,
        example: '652745597a7b53526de37c05',
    })
    @ApiParam({
        name: 'hederaId',
        type: String,
        description: 'Hedera identifier',
        required: true,
        example: '0.0.1',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async wipeAddAdmin(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.addWipeAdmin(
                    user.did,
                    req.params.contractId,
                    req.params.hederaId
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Delete('/wipe/:contractId/admin/:hederaId')
    @ApiBearerAuth()
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Remove wipe admin.',
        description:
            'Remove wipe contract admin. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        type: String,
        description: 'Contract identifier',
        required: true,
        example: '652745597a7b53526de37c05',
    })
    @ApiParam({
        name: 'hederaId',
        type: String,
        description: 'Hedera identifier',
        required: true,
        example: '0.0.1',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async wipeRemoveAdmin(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.removeWipeAdmin(
                    user.did,
                    req.params.contractId,
                    req.params.hederaId
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('/wipe/:contractId/manager/:hederaId')
    @ApiBearerAuth()
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Add wipe manager.',
        description:
            'Add wipe contract manager. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        type: String,
        description: 'Contract identifier',
        required: true,
        example: '652745597a7b53526de37c05',
    })
    @ApiParam({
        name: 'hederaId',
        type: String,
        description: 'Hedera identifier',
        required: true,
        example: '0.0.1',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async wipeAddManager(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.addWipeManager(
                    user.did,
                    req.params.contractId,
                    req.params.hederaId
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Delete('/wipe/:contractId/manager/:hederaId')
    @ApiBearerAuth()
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Remove wipe manager.',
        description:
            'Remove wipe contract admin. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        type: String,
        description: 'Contract identifier',
        required: true,
        example: '652745597a7b53526de37c05',
    })
    @ApiParam({
        name: 'hederaId',
        type: String,
        description: 'Hedera identifier',
        required: true,
        example: '0.0.1',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async wipeRemoveManager(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.removeWipeManager(
                    user.did,
                    req.params.contractId,
                    req.params.hederaId
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('/wipe/:contractId/wiper/:hederaId')
    @ApiBearerAuth()
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Add wipe wiper.',
        description:
            'Add wipe contract wiper. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        type: String,
        description: 'Contract identifier',
        required: true,
        example: '652745597a7b53526de37c05',
    })
    @ApiParam({
        name: 'hederaId',
        type: String,
        description: 'Hedera identifier',
        required: true,
        example: '0.0.1',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async wipeAddWiper(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.addWipeWiper(
                    user.did,
                    req.params.contractId,
                    req.params.hederaId
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Delete('/wipe/:contractId/wiper/:hederaId')
    @ApiBearerAuth()
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Remove wipe wiper.',
        description:
            'Remove wipe contract admin. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        type: String,
        description: 'Contract identifier',
        required: true,
        example: '652745597a7b53526de37c05',
    })
    @ApiParam({
        name: 'hederaId',
        type: String,
        description: 'Hedera identifier',
        required: true,
        example: '0.0.1',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async wipeRemoveWiper(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.removeWipeWiper(
                    user.did,
                    req.params.contractId,
                    req.params.hederaId
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    //#endregion
    //#region Retire contract endpoints

    @Post('/retire/:contractId/pools/sync')
    @ApiBearerAuth()
    @ApiExtraModels(RetireRequestDTO, InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Sync retire pools.',
        description:
            'Sync retire contract pools. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        type: String,
        description: 'Contract identifier',
        required: false,
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Sync date.',
        type: Date,
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async retireSyncPools(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.syncRetirePools(user.did, req.params.contractId)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * use cache
     * @param req
     * @param res
     */
    @Get('/retire/requests')
    @ApiBearerAuth()
    @ApiExtraModels(RetireRequestDTO, InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Return a list of all retire requests.',
        description: 'Returns all retire requests.',
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description:
            'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0,
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20,
    })
    @ApiQuery({
        name: 'contractId',
        type: String,
        description: 'Contract identifier',
        required: false,
        example: '0.0.1',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: {
            'x-total-count': {
                schema: {
                    type: 'integer',
                },
                description: 'Total items in the collection.',
            },
        },
        type: RetireRequestDTO,
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async getRetireRequests(@Req() req, @Response() res): Promise<any> {
        await checkPermission(
            UserRole.STANDARD_REGISTRY,
            UserRole.USER
        )(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            const [contracts, count] = await guardians.getRetireRequests(
                user.did,
                req.query.contractId as any,
                req.query.pageIndex as any,
                req.query.pageSize as any
            );
            return res.setHeader('X-Total-Count', count).json(contracts);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * use cache
     * @param req
     * @param res
     */
    @Get('/retire/pools')
    @ApiBearerAuth()
    @ApiExtraModels(RetirePoolDTO, InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Return a list of all retire pools.',
        description: 'Returns all retire pools.',
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description:
            'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0,
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20,
    })
    @ApiQuery({
        name: 'contractId',
        type: String,
        description: 'Contract identifier',
        required: false,
        example: '0.0.1',
    })
    @ApiQuery({
        name: 'tokens',
        type: String,
        description: 'Tokens',
        required: false,
        example: '0.0.1,0.0.2,0.0.3',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: {
            'x-total-count': {
                schema: {
                    type: 'integer',
                },
                description: 'Total items in the collection.',
            },
        },
        type: RetirePoolDTO,
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async getRetirePools(@Req() req, @Response() res): Promise<any> {
        await checkPermission(
            UserRole.STANDARD_REGISTRY,
            UserRole.USER
        )(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            const [contracts, count] = await guardians.getRetirePools(
                user.did,
                req.query.tokens?.split(','),
                req.query.contractId as any,
                req.query.pageIndex as any,
                req.query.pageSize as any
            );
            return res.setHeader('X-Total-Count', count).json(contracts);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Delete('/retire/:contractId/requests')
    @ApiBearerAuth()
    @ApiExtraModels(RetireRequestDTO, InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Clear retire requests.',
        description:
            'Clear retire contract requests. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        type: String,
        description: 'Contract identifier',
        required: false,
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async clearRetireRequests(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.clearRetireRequests(
                    user.did,
                    req.params.contractId
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Delete('/retire/:contractId/pools')
    @ApiBearerAuth()
    @ApiExtraModels(RetireRequestDTO, InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Clear retire pools.',
        description:
            'Clear retire contract pools. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        type: String,
        description: 'Contract identifier',
        required: false,
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async clearRetirePools(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.clearRetirePools(
                    user.did,
                    req.params.contractId
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('/retire/:contractId/pools')
    @ApiBearerAuth()
    @ApiExtraModels(RetirePoolDTO, RetirePoolTokenDTO, InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Set retire pool.',
        description:
            'Set retire contract pool. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiBody({
        type: RetirePoolTokenDTO,
    })
    @ApiParam({
        name: 'contractId',
        type: String,
        description: 'Contract identifier',
        required: false,
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: RetirePoolDTO,
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async setRetirePool(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.setRetirePool(
                    user.did,
                    req.params.contractId,
                    req.body
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Delete('/retire/pools/:poolId')
    @ApiBearerAuth()
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Unset retire pool.',
        description:
            'Unset retire contract pool. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'poolId',
        type: String,
        description: 'Pool Identifier',
        required: false,
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async unsetRetirePool(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.unsetRetirePool(user.did, req.params.poolId)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Delete('/retire/requests/:requestId')
    @ApiBearerAuth()
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Unset retire request.',
        description:
            'Unset retire contract request. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'requestId',
        type: String,
        description: 'Request Identifier',
        required: false,
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async unsetRetireRequest(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.unsetRetireRequest(
                    user.did,
                    req.params.requestId
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('/retire/pools/:poolId/retire')
    @ApiBearerAuth()
    @ApiExtraModels(RetireRequestTokenDTO, InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Retire tokens.',
        description: 'Retire tokens.',
    })
    @ApiBody({
        type: RetireRequestTokenDTO,
    })
    @ApiParam({
        name: 'poolId',
        type: String,
        description: 'Pool Identifier',
        required: false,
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async retire(@Req() req, @Response() res): Promise<any> {
        await checkPermission(
            UserRole.STANDARD_REGISTRY,
            UserRole.USER
        )(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.retire(user.did, req.params.poolId, req.body)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('/retire/requests/:requestId/approve')
    @ApiBearerAuth()
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Approve retire request.',
        description:
            'Approve retire contract request. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'requestId',
        type: String,
        description: 'Request identifier',
        required: true,
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async approveRetire(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.approveRetire(user.did, req.params.requestId)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Delete('/retire/requests/:requestId/cancel')
    @ApiBearerAuth()
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Cancel retire request.',
        description: 'Cancel retire contract request.',
    })
    @ApiParam({
        name: 'requestId',
        type: String,
        description: 'Request identifier',
        required: true,
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async cancelRetireRequest(@Req() req, @Response() res): Promise<any> {
        await checkPermission(
            UserRole.STANDARD_REGISTRY,
            UserRole.USER
        )(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.cancelRetire(user.did, req.params.requestId)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('/retire/:contractId/admin/:hederaId')
    @ApiBearerAuth()
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Add retire admin.',
        description:
            'Add retire contract admin. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        type: String,
        description: 'Contract identifier',
        required: true,
        example: '652745597a7b53526de37c05',
    })
    @ApiParam({
        name: 'hederaId',
        type: String,
        description: 'Hedera identifier',
        required: true,
        example: '0.0.1',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async retireAddAdmin(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.addRetireAdmin(
                    user.did,
                    req.params.contractId,
                    req.params.hederaId
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Delete('/retire/:contractId/admin/:hederaId')
    @ApiBearerAuth()
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Remove wipe admin.',
        description:
            'Remove wipe contract admin. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        type: String,
        description: 'Contract identifier',
        required: true,
        example: '652745597a7b53526de37c05',
    })
    @ApiParam({
        name: 'hederaId',
        type: String,
        description: 'Hedera identifier',
        required: true,
        example: '0.0.1',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async retireRemoveAdmin(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.removeRetireAdmin(
                    user.did,
                    req.params.contractId,
                    req.params.hederaId
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * use cache
     * @param req
     * @param res
     */
    @Get('/retire')
    @ApiBearerAuth()
    @ApiExtraModels(RetirePoolDTO, InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Return a list of all retire vcs.',
        description: 'Returns all retire vcs.',
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description:
            'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0,
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: {
            'x-total-count': {
                schema: {
                    type: 'integer',
                },
                description: 'Total items in the collection.',
            },
        },
        type: 'object',
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async getRetireVCs(@Req() req, @Response() res): Promise<any> {
        await checkPermission(
            UserRole.STANDARD_REGISTRY,
            UserRole.USER
        )(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            const [vcs, count] = await guardians.getRetireVCs(
                user.did,
                req.query.pageIndex as any,
                req.query.pageSize as any
            );
            return res.setHeader('X-Total-Count', count).json(vcs);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
    //#endregion
}
