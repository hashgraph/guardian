import { Guardians } from '@helpers/guardians';
import { UserRole } from '@guardian/interfaces';
import { Logger } from '@guardian/common';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Post, Req, Response } from '@nestjs/common';
import { checkPermission } from '@auth/authorization-helper';
import { ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { InternalServerErrorDTO } from '@middlewares/validation/schemas/errors';
import { ImportContractDTO } from '@middlewares/validation/schemas/contracts';

/**
 * Contracts api
 */
@Controller('contracts')
@ApiTags('contracts')
export class ContractsApi {

    /**
     * Get contracts
     * @param req
     * @param res
     */
    @ApiOperation({
        summary: 'Returns all contracts.',
        description: 'Returns all contracts.',
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object',
            'properties': {
                'id': {
                    'type': 'string'
                },
                'contractId': {
                    'type': 'string'
                },
                'description': {
                    'type': 'string'
                },
                'owner': {
                    'type': 'string'
                },
                'isOwnerCreator': {
                    'type': 'string'
                },
                'status': {
                    'type': 'string'
                }
            }
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Get()
    @HttpCode(HttpStatus.OK)
    async getContracts(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            const [contracts, count] = await guardians.getContracts(
                user.parent || user.did,
                req.query.pageIndex as any,
                req.query.pageSize as any
            );
            return res.setHeader('X-Total-Count', count).json(contracts);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Set contracts
     * @param req
     * @param res
     */
    @ApiOperation({
        summary: 'Creates new contract.',
        description: 'Creates new contract. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object',
            'properties': {
                'description': {
                    'type': 'string'
                }
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Post('/')
    @HttpCode(HttpStatus.CREATED)
    async setContracts(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const {description} = req.body;
            const guardians = new Guardians();
            return res.status(201).json(
                await guardians.createContract(user.did, description)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Import new contract.',
        description: 'Creates new contract. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object',
            'properties': {
                'contractId': {
                    'type': 'string'
                },
                'description': {
                    'type': 'string'
                }
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Post('/import')
    @HttpCode(HttpStatus.OK)
    async importContracts(@Body() body: ImportContractDTO, @Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const {contractId, description} = body;
            const guardians = new Guardians();
            return res.json(
                await guardians.importContract(
                    user.did,
                    contractId,
                    description
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Add new contract user.',
        description: 'Add new contract user. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object',
            'properties': {
                'userId': {
                    'type': 'string'
                }
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Post('/:contractId/user')
    @HttpCode(HttpStatus.OK)
    async userContract(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const {userId} = req.body;
            const guardians = new Guardians();
            return res.json(
                await guardians.addUser(user.did, userId, req.params.contractId)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Update contract status.',
        description: 'Update contract status. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'boolean'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Post(':contractId/status')
    @HttpCode(HttpStatus.OK)
    async contractStatus(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.updateStatus(user.did, req.params.contractId)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Creates new contract pair.',
        description: 'Creates new contract pair. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object',
            'properties': {
                'baseTokenId': {
                    'type': 'string'
                },
                'oppositeTokenId': {
                    'type': 'string'
                },
                'baseTokenCount': {
                    'type': 'integer'
                },
                'oppositeTokenCount': {
                    'type': 'integer'
                }
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Get('/pair')
    @HttpCode(HttpStatus.OK)
    async contractPair(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.getContractPair(
                    user.did,
                    user.parent || user.did,
                    req.query?.baseTokenId as string,
                    req.query?.oppositeTokenId as string
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Creates new contract pair.',
        description: 'Creates new contract pair. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object',
            'properties': {
                'baseTokenId': {
                    'type': 'string'
                },
                'oppositeTokenId': {
                    'type': 'string'
                },
                'baseTokenCount': {
                    'type': 'integer'
                },
                'oppositeTokenCount': {
                    'type': 'integer'
                }
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Post('/:contractId/pair')
    @HttpCode(HttpStatus.OK)
    async setPair(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const {
                baseTokenId,
                oppositeTokenId,
                baseTokenCount,
                oppositeTokenCount,
            } = req.body;
            const guardians = new Guardians();
            return res.json(
                await guardians.addContractPair(
                    user.did,
                    req.params.contractId,
                    baseTokenId,
                    oppositeTokenId,
                    baseTokenCount,
                    oppositeTokenCount
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Returns all contract requests.',
        description: 'Returns all contract requests.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'integer'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Get('/retire/request')
    @HttpCode(HttpStatus.OK)
    async retireRequest(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            const [requests, count] = await guardians.getRetireRequests(
                user.parent || user.did,
                user.role === UserRole.USER ? user.did : null,
                req.query?.contractId as string,
                req.query?.pageIndex as any,
                req.query?.pageSize as any
            );
            return res.setHeader('X-Total-Count', count).json(requests);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Creates new contract retire request.',
        description: 'Creates new contract retire request.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object',
            'properties': {
                'id': {
                    'type': 'string'
                },
                'contractId': {
                    'type': 'string'
                },
                'baseTokenId': {
                    'type': 'string'
                },
                'owner': {
                    'type': 'string'
                },
                'oppositeTokenId': {
                    'type': 'string'
                },
                'baseTokenCount': {
                    'type': 'number'
                },
                'oppositeTokenCount': {
                    'type': 'number'
                }
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Post('/:contractId/retire/request')
    @HttpCode(HttpStatus.OK)
    async postRetireRequest(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        try {
            const user = req.user;
            const {
                baseTokenId,
                oppositeTokenId,
                baseTokenCount,
                oppositeTokenCount,
                baseTokenSerials,
                oppositeTokenSerials,
            } = req.body;
            const guardians = new Guardians();
            return res.json(
                await guardians.retireRequest(
                    user.did,
                    req.params.contractId,
                    baseTokenId,
                    oppositeTokenId,
                    baseTokenCount,
                    oppositeTokenCount,
                    baseTokenSerials,
                    oppositeTokenSerials
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Cancel contract requests.',
        description: 'Cancel contract requests.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'boolean'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Delete('/retire/request')
    @HttpCode(HttpStatus.OK)
    async deleteRetireRequest(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            return res.json(
                await guardians.cancelRetireRequest(
                    user.did,
                    req.query?.requestId as string
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Retire tokens.',
        description: 'Retire tokens. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'boolean'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Post('/retire')
    @HttpCode(HttpStatus.OK)
    async retire(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const {requestId} = req.body;
            const guardians = new Guardians();
            return res.json(await guardians.retire(user.did, requestId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
