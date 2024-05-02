import { Guardians } from '../../helpers/guardians.js';
import { ContractType, Permissions } from '@guardian/interfaces';
import { Logger, IAuthUser } from '@guardian/common';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpException,
    HttpStatus,
    Param,
    Post,
    Query,
    Response,
} from '@nestjs/common';
import {
    ApiInternalServerErrorResponse,
    ApiOkResponse,
    ApiCreatedResponse,
    ApiOperation,
    ApiExtraModels,
    ApiTags,
    ApiBody,
    ApiQuery,
    ApiParam,
} from '@nestjs/swagger';
import { InternalServerErrorDTO } from '../../middlewares/validation/schemas/errors.js';
import {
    ContractConfigDTO,
    ContractDTO,
    RetirePoolDTO,
    RetirePoolTokenDTO,
    RetireRequestDTO,
    RetireRequestTokenDTO,
    WiperRequestDTO,
} from '../../middlewares/validation/schemas/contracts.js';
import { UseCache } from '../../helpers/decorators/cache.js';
import { AuthUser } from '../../auth/authorization-helper.js';
import { Auth } from '../../auth/auth.decorator.js';
import { pageHeader } from 'middlewares/validation/page-header.js';

/**
 * Contracts api
 */
@Controller('contracts')
@ApiTags('contracts')
export class ContractsApi {
    //#region Common contract endpoints

    /**
     * Get all contracts
     */
    @Get()
    @Auth(
        Permissions.CONTRACT_CONTRACT_VIEW,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER
    )
    @ApiOperation({
        summary: 'Return a list of all contracts.',
        description: 'Returns all contracts.',
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        example: 0,
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        example: 20,
    })
    @ApiQuery({
        name: 'type',
        enum: ContractType,
        description: 'Contract type',
        example: ContractType.RETIRE,
    })
    @ApiOkResponse({
        description: 'Contracts.',
        isArray: true,
        headers: pageHeader,
        type: ContractDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ContractDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getContracts(
        @AuthUser() user: IAuthUser,
        @Query('type') type: ContractType,
        @Query('pageIndex') pageIndex: number,
        @Query('pageSize') pageSize: number,
        @Response() res: any
    ): Promise<ContractDTO[]> {
        try {
            const guardians = new Guardians();
            const [contracts, count] = await guardians.getContracts(
                user.parent || user.did,
                type,
                pageIndex,
                pageSize
            );
            return res.setHeader('X-Total-Count', count).json(contracts);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Create new smart-contract
     */
    @Post('/')
    @Auth(
        Permissions.CONTRACT_CONTRACT_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Create contract.',
        description: 'Create smart-contract. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiBody({
        type: ContractConfigDTO,
    })
    @ApiCreatedResponse({
        description: 'Created contract.',
        type: ContractDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ContractDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async createContract(
        @AuthUser() user: IAuthUser,
        @Body() body: ContractConfigDTO
    ): Promise<ContractDTO> {
        try {
            const { description, type } = body;
            const guardians = new Guardians();
            return await guardians.createContract(user.did, description, type);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Import new smart-contract
     */
    @Post('/import')
    @Auth(
        Permissions.CONTRACT_CONTRACT_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Import contract.',
        description: 'Import smart-contract. Only users with the Standard Registry role are allowed to make the request.',
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
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ContractDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async importContract(
        @AuthUser() user: IAuthUser,
        @Body() body: any
    ): Promise<ContractDTO> {
        try {
            const { contractId, description } = body;
            const guardians = new Guardians();
            return await guardians.importContract(user.did, contractId, description);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get contract permissions
     */
    @Get('/:contractId/permissions')
    @Auth(
        Permissions.CONTRACT_PERMISSIONS_VIEW,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Get contract permissions.',
        description: 'Get smart-contract permissions. Only users with the Standard Registry role are allowed to make the request.',
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
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @UseCache()
    @HttpCode(HttpStatus.OK)
    async contractPermissions(
        @AuthUser() user: IAuthUser,
        @Param('contractId') contractId: string,
    ): Promise<number> {
        try {
            const guardians = new Guardians();
            return await guardians.checkContractPermissions(user.did, contractId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Remove contract
     */
    @Delete('/:contractId')
    @Auth(
        Permissions.CONTRACT_CONTRACT_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Remove contract.',
        description: 'Remove smart-contract. Only users with the Standard Registry role are allowed to make the request.',
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
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async removeContract(
        @AuthUser() user: IAuthUser,
        @Param('contractId') contractId: string,
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.removeContract(user.did, contractId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    //#endregion
    //#region Wipe contract endpoints

    /**
     * Get list of all wipe requests
     */
    @Get('/wipe/requests')
    @Auth(
        Permissions.CONTRACT_WIPE_REQUEST_VIEW,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Return a list of all wipe requests.',
        description: 'Returns all wipe requests. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        example: 0,
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        example: 20,
    })
    @ApiQuery({
        name: 'contractId',
        type: String,
        description: 'Contract identifier',
        example: '0.0.1',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: WiperRequestDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    // @UseCache({ isExpress: true })
    @ApiExtraModels(ContractDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getWipeRequests(
        @AuthUser() user: IAuthUser,
        @Query('contractId') contractId: string,
        @Query('pageIndex') pageIndex: number,
        @Query('pageSize') pageSize: number,
        @Response() res: any
    ): Promise<WiperRequestDTO[]> {
        try {
            const guardians = new Guardians();
            const [contracts, count] = await guardians.getWipeRequests(
                user.parent || user.did,
                contractId,
                pageIndex,
                pageSize
            );
            res.locals.data = contracts
            return res.setHeader('X-Total-Count', count).json(contracts);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Enable wipe requests
     */
    @Post('/wipe/:contractId/requests/enable')
    @Auth(
        Permissions.CONTRACT_WIPE_REQUEST_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Enable wipe requests.',
        description: 'Enable wipe contract requests. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        type: String,
        required: true,
        description: 'Contract identifier',
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async enableWipeRequests(
        @AuthUser() user: IAuthUser,
        @Param('contractId') contractId: string,
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.enableWipeRequests(user.did, contractId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Disable wipe requests
     */
    @Post('/wipe/:contractId/requests/disable')
    @Auth(
        Permissions.CONTRACT_WIPE_REQUEST_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Disable wipe requests.',
        description: 'Disable wipe contract requests. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        type: String,
        required: true,
        description: 'Contract identifier',
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async disableWipeRequests(
        @AuthUser() user: IAuthUser,
        @Param('contractId') contractId: string,
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.disableWipeRequests(user.did, contractId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Approve wipe request
     */
    @Post('/wipe/requests/:requestId/approve')
    @Auth(
        Permissions.CONTRACT_WIPE_REQUEST_PUBLISH,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Approve wipe request.',
        description: 'Approve wipe contract request. Only users with the Standard Registry role are allowed to make the request.',
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
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async approveWipeRequest(
        @AuthUser() user: IAuthUser,
        @Param('requestId') requestId: string,
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.approveWipeRequest(user.did, requestId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Reject wipe request
     */
    @Delete('/wipe/requests/:requestId/reject')
    @Auth(
        Permissions.CONTRACT_WIPE_REQUEST_PUBLISH,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Reject wipe request.',
        description: 'Reject wipe contract request. Only users with the Standard Registry role are allowed to make the request.',
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
        description: 'Reject and ban'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async rejectWipeRequest(
        @AuthUser() user: IAuthUser,
        @Param('requestId') requestId: string,
        @Query('ban') ban: boolean,
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.rejectWipeRequest(
                user.did,
                requestId,
                String(ban).toLowerCase() === 'true'
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Remove all wipe requests
     */
    @Delete('/wipe/:contractId/requests')
    @Auth(
        Permissions.CONTRACT_WIPE_REQUEST_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Clear wipe requests.',
        description: 'Clear wipe contract requests. Only users with the Standard Registry role are allowed to make the request.',
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
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async clearWipeRequests(
        @AuthUser() user: IAuthUser,
        @Param('contractId') contractId: string,
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.clearWipeRequests(user.did, contractId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Add wipe admin
     */
    @Post('/wipe/:contractId/admin/:hederaId')
    @Auth(
        Permissions.CONTRACT_WIPE_ADMIN_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Add wipe admin.',
        description: 'Add wipe contract admin. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        description: 'Contract identifier',
        type: String,
        required: true,
        example: '652745597a7b53526de37c05',
    })
    @ApiParam({
        name: 'hederaId',
        description: 'Hedera identifier',
        type: String,
        required: true,
        example: '0.0.1',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async wipeAddAdmin(
        @AuthUser() user: IAuthUser,
        @Param('contractId') contractId: string,
        @Param('hederaId') hederaId: string
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.addWipeAdmin(user.did, contractId, hederaId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Remove wipe admin
     */
    @Delete('/wipe/:contractId/admin/:hederaId')
    @Auth(
        Permissions.CONTRACT_WIPE_ADMIN_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Remove wipe admin.',
        description: 'Remove wipe contract admin. Only users with the Standard Registry role are allowed to make the request.',
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
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async wipeRemoveAdmin(
        @AuthUser() user: IAuthUser,
        @Param('contractId') contractId: string,
        @Param('hederaId') hederaId: string
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.removeWipeAdmin(user.did, contractId, hederaId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Add wipe manager
     */
    @Post('/wipe/:contractId/manager/:hederaId')
    @Auth(
        Permissions.CONTRACT_WIPE_MANAGER_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Add wipe manager.',
        description: 'Add wipe contract manager. Only users with the Standard Registry role are allowed to make the request.',
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
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async wipeAddManager(
        @AuthUser() user: IAuthUser,
        @Param('contractId') contractId: string,
        @Param('hederaId') hederaId: string
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.addWipeManager(user.did, contractId, hederaId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Remove wipe manager
     */
    @Delete('/wipe/:contractId/manager/:hederaId')
    @Auth(
        Permissions.CONTRACT_WIPE_MANAGER_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Remove wipe manager.',
        description: 'Remove wipe contract admin. Only users with the Standard Registry role are allowed to make the request.',
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
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async wipeRemoveManager(
        @AuthUser() user: IAuthUser,
        @Param('contractId') contractId: string,
        @Param('hederaId') hederaId: string
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.removeWipeManager(user.did, contractId, hederaId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Add wipe wiper
     */
    @Post('/wipe/:contractId/wiper/:hederaId')
    @Auth(
        Permissions.CONTRACT_WIPER_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Add wipe wiper.',
        description: 'Add wipe contract wiper. Only users with the Standard Registry role are allowed to make the request.',
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
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async wipeAddWiper(
        @AuthUser() user: IAuthUser,
        @Param('contractId') contractId: string,
        @Param('hederaId') hederaId: string
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.addWipeWiper(user.did, contractId, hederaId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Remove wipe wiper
     */
    @Delete('/wipe/:contractId/wiper/:hederaId')
    @Auth(
        Permissions.CONTRACT_WIPER_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Remove wipe wiper.',
        description: 'Remove wipe contract admin. Only users with the Standard Registry role are allowed to make the request.',
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
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async wipeRemoveWiper(
        @AuthUser() user: IAuthUser,
        @Param('contractId') contractId: string,
        @Param('hederaId') hederaId: string
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.removeWipeWiper(user.did, contractId, hederaId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    //#endregion
    //#region Retire contract endpoints

    /**
     * Sync retire contract pools
     */
    @Post('/retire/:contractId/pools/sync')
    @Auth(
        Permissions.CONTRACT_POOL_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Sync retire pools.',
        description: 'Sync retire contract pools. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        type: String,
        required: true,
        description: 'Contract identifier',
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Sync date.',
        type: Date,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(RetireRequestDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async retireSyncPools(
        @AuthUser() user: IAuthUser,
        @Param('contractId') contractId: string
    ): Promise<string> {
        try {
            const guardians = new Guardians();
            return await guardians.syncRetirePools(user.did, contractId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get list of all retire requests
     */
    @Get('/retire/requests')
    @Auth(
        Permissions.CONTRACT_RETIRE_REQUEST_VIEW,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER
    )
    @ApiOperation({
        summary: 'Return a list of all retire requests.',
        description: 'Returns all retire requests.',
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        example: 0,
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        example: 20,
    })
    @ApiQuery({
        name: 'contractId',
        type: String,
        description: 'Contract identifier',
        example: '0.0.1',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: RetireRequestDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(RetireRequestDTO, InternalServerErrorDTO)
    // @UseCache({ isExpress: true })
    @HttpCode(HttpStatus.OK)
    async getRetireRequests(
        @AuthUser() user: IAuthUser,
        @Query('contractId') contractId: string,
        @Query('pageIndex') pageIndex: number,
        @Query('pageSize') pageSize: number,
        @Response() res: any
    ): Promise<RetireRequestDTO[]> {
        try {
            const guardians = new Guardians();
            const [contracts, count] = await guardians.getRetireRequests(
                user.did,
                contractId,
                pageIndex,
                pageSize
            );
            res.locals.data = contracts
            return res.setHeader('X-Total-Count', count).json(contracts);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get list of all retire pools
     */
    @Get('/retire/pools')
    @Auth(
        Permissions.CONTRACT_POOL_VIEW,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER
    )
    @ApiOperation({
        summary: 'Return a list of all retire pools.',
        description: 'Returns all retire pools.',
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        example: 0,
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        example: 20,
    })
    @ApiQuery({
        name: 'contractId',
        type: String,
        description: 'Contract identifier',
        example: '0.0.1',
    })
    @ApiQuery({
        name: 'tokens',
        type: String,
        description: 'Tokens',
        example: '0.0.1,0.0.2,0.0.3',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: RetirePoolDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(RetirePoolDTO, InternalServerErrorDTO)
    // @UseCache({ isExpress: true })
    @HttpCode(HttpStatus.OK)
    async getRetirePools(
        @AuthUser() user: IAuthUser,
        @Query('contractId') contractId: string,
        @Query('tokens') tokens: string,
        @Query('pageIndex') pageIndex: number,
        @Query('pageSize') pageSize: number,
        @Response() res: any
    ): Promise<RetirePoolDTO[]> {
        try {
            const guardians = new Guardians();
            const [contracts, count] = await guardians.getRetirePools(
                user.did,
                tokens?.split(','),
                contractId,
                pageIndex,
                pageSize
            );
            res.locals.data = contracts
            return res.setHeader('X-Total-Count', count).json(contracts);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Remove retire requests.
     */
    @Delete('/retire/:contractId/requests')
    @Auth(
        Permissions.CONTRACT_RETIRE_REQUEST_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Clear retire requests.',
        description: 'Clear retire contract requests. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        type: String,
        required: true,
        description: 'Contract identifier',
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(RetireRequestDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async clearRetireRequests(
        @AuthUser() user: IAuthUser,
        @Param('contractId') contractId: string
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.clearRetireRequests(user.did, contractId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Clear retire pools.
     */
    @Delete('/retire/:contractId/pools')
    @Auth(
        Permissions.CONTRACT_POOL_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Clear retire pools.',
        description: 'Clear retire contract pools. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'contractId',
        type: String,
        required: true,
        description: 'Contract identifier',
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(RetireRequestDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async clearRetirePools(
        @AuthUser() user: IAuthUser,
        @Param('contractId') contractId: string,
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.clearRetirePools(user.did, contractId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Set retire pool.
     */
    @Post('/retire/:contractId/pools')
    @Auth(
        Permissions.CONTRACT_POOL_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Set retire pool.',
        description: 'Set retire contract pool. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiBody({
        type: RetirePoolTokenDTO,
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
        type: RetirePoolDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(RetirePoolDTO, RetirePoolTokenDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async setRetirePool(
        @AuthUser() user: IAuthUser,
        @Param('contractId') contractId: string,
        @Body() body: any
    ): Promise<RetirePoolDTO> {
        try {
            const guardians = new Guardians();
            return await guardians.setRetirePool(user.did, contractId, body);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Unset retire pool.
     */
    @Delete('/retire/pools/:poolId')
    @Auth(
        Permissions.CONTRACT_POOL_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Unset retire pool.',
        description: 'Unset retire contract pool. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'poolId',
        type: String,
        description: 'Pool Identifier',
        required: true,
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async unsetRetirePool(
        @AuthUser() user: IAuthUser,
        @Param('poolId') poolId: string,
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.unsetRetirePool(user.did, poolId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Unset retire request.
     */
    @Delete('/retire/requests/:requestId')
    @Auth(
        Permissions.CONTRACT_RETIRE_REQUEST_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Unset retire request.',
        description: 'Unset retire contract request. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'requestId',
        type: String,
        description: 'Request Identifier',
        required: true,
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async unsetRetireRequest(
        @AuthUser() user: IAuthUser,
        @Param('requestId') requestId: string
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.unsetRetireRequest(user.did, requestId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Retire tokens.
     */
    @Post('/retire/pools/:poolId/retire')
    @Auth(
        Permissions.CONTRACT_RETIRE_REQUEST_CREATE,
        //???? UserRole.STANDARD_REGISTRY,
        // UserRole.USER
    )
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
        required: true,
        example: '652745597a7b53526de37c05',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(RetireRequestTokenDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async retire(
        @AuthUser() user: IAuthUser,
        @Param('poolId') poolId: string,
        @Body() body: any
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.retire(user.did, poolId, body);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Approve retire request
     */
    @Post('/retire/requests/:requestId/approve')
    @Auth(
        Permissions.CONTRACT_RETIRE_REQUEST_PUBLISH,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Approve retire request.',
        description: 'Approve retire contract request. Only users with the Standard Registry role are allowed to make the request.',
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
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async approveRetire(
        @AuthUser() user: IAuthUser,
        @Param('requestId') requestId: string
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.approveRetire(user.did, requestId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Cancel retire request.
     */
    @Delete('/retire/requests/:requestId/cancel')
    @Auth(
        Permissions.CONTRACT_RETIRE_REQUEST_CREATE,
        //???? UserRole.STANDARD_REGISTRY,
        // UserRole.USER
    )
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
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async cancelRetireRequest(
        @AuthUser() user: IAuthUser,
        @Param('requestId') requestId: string
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.cancelRetire(user.did, requestId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Add retire admin.
     */
    @Post('/retire/:contractId/admin/:hederaId')
    @Auth(
        Permissions.CONTRACT_RETIRE_ADMIN_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Add retire admin.',
        description: 'Add retire contract admin. Only users with the Standard Registry role are allowed to make the request.',
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
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async retireAddAdmin(
        @AuthUser() user: IAuthUser,
        @Param('contractId') contractId: string,
        @Param('hederaId') hederaId: string
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.addRetireAdmin(user.did, contractId, hederaId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Remove wipe admin.
     */
    @Delete('/retire/:contractId/admin/:hederaId')
    @Auth(
        Permissions.CONTRACT_RETIRE_ADMIN_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Remove wipe admin.',
        description: 'Remove wipe contract admin. Only users with the Standard Registry role are allowed to make the request.',
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
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async retireRemoveAdmin(
        @AuthUser() user: IAuthUser,
        @Param('contractId') contractId: string,
        @Param('hederaId') hederaId: string
    ): Promise<boolean> {
        try {
            const guardians = new Guardians();
            return await guardians.removeRetireAdmin(user.did, contractId, hederaId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get a list of all retire vcs
     */
    @Get('/retire')
    @Auth(
        Permissions.CONTRACT_DOCUMENT_VIEW,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER
    )
    @ApiOperation({
        summary: 'Return a list of all retire vcs.',
        description: 'Returns all retire vcs.',
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        example: 0,
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        example: 20,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: 'object',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(RetirePoolDTO, InternalServerErrorDTO)
    @UseCache({ isExpress: true })
    @HttpCode(HttpStatus.OK)
    async getRetireVCs(
        @AuthUser() user: IAuthUser,
        @Query('pageIndex') pageIndex: number,
        @Query('pageSize') pageSize: number,
        @Response() res: any
    ): Promise<any[]> {
        try {
            const guardians = new Guardians();
            const [vcs, count] = await guardians.getRetireVCs(user.did, pageIndex, pageSize);
            res.locals.data = vcs
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
