import { Guardians } from '@helpers/guardians';
import { UserRole } from '@guardian/interfaces';
import { Logger } from '@guardian/common';
import { Controller, Delete, Get, HttpCode, HttpStatus, Post, Req, Response } from '@nestjs/common';
import { checkPermission } from '@auth/authorization-helper';
import { ApiTags } from '@nestjs/swagger';

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
    @Get()
    @HttpCode(HttpStatus.OK)
    async getContracts(@Req() req, @Response() res): Promise<any> {
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
            throw error;
        }
    }

    /**
     * Set contracts
     * @param req
     * @param res
     */
    @Post('/')
    @HttpCode(HttpStatus.OK)
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
            throw error;
        }
    }

    @Post('/import')
    @HttpCode(HttpStatus.OK)
    async importContracts(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const {contractId, description} = req.body;
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
            throw error;
        }
    }

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
            throw error;
        }
    }

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
            throw error;
        }
    }

    @Get('/pair')
    @HttpCode(HttpStatus.OK)
    async contractPair(@Req() req, @Response() res): Promise<any> {
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
            throw error;
        }
    }

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
            throw error;
        }
    }

    @Get('/retire/request')
    @HttpCode(HttpStatus.OK)
    async retireRequest(@Req() req, @Response() res): Promise<any> {
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
            throw error;
        }
    }

    @Post('/:contractId/retire/request')
    @HttpCode(HttpStatus.OK)
    async postRetireRequest(@Req() req, @Response() res): Promise<any> {
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
            throw error;
        }
    }

    @Delete('/retire/request')
    @HttpCode(HttpStatus.OK)
    async deleteRetireRequest(@Req() req, @Response() res): Promise<any> {
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
            throw error;
        }
    }

    @Post('/retire')
    @HttpCode(HttpStatus.OK)
    async retire(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const { requestId } = req.body;
            const guardians = new Guardians();
            return res.json(await guardians.retire(user.did, requestId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }
}
