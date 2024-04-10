import { Guardians } from '@helpers/guardians';
import { ITokenInfo, TaskAction, UserRole } from '@guardian/interfaces';
import { Logger, RunFunctionAsync } from '@guardian/common';
import { PolicyEngine } from '@helpers/policy-engine';
import { TaskManager } from '@helpers/task-manager';
import { ServiceError } from '@helpers/service-requests-base';
import { prepareValidationResponse } from '@middlewares/validation';
import { Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Post, Put, Req, Response, } from '@nestjs/common';
import { checkPermission } from '@auth/authorization-helper';
import { ApiBearerAuth, ApiBody, ApiExtraModels, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiSecurity, ApiTags, ApiUnauthorizedResponse, ApiUnprocessableEntityResponse, } from '@nestjs/swagger';
import { InternalServerErrorDTO } from '@middlewares/validation/schemas';
import { Auth } from '@auth/auth.decorator';

/**
 * Token route
 */
// export const tokenAPI = Router();

/**
 * Connect policies to tokens
 * @param tokens
 * @param map
 * @param policyId
 * @param notEmpty
 */
function setTokensPolicies<T>(tokens: any[], map: any[], policyId?: any, notEmpty?: boolean): T[] {
    if (!tokens) {
        return [];
    }
    for (const token of tokens) {
        token.policies = token.policies || [];
        token.policyIds = token.policyIds || [];
        token.canDelete = true;
        for (const policyObject of map) {
            if (policyObject.tokenIds.includes(token.tokenId)) {
                token.policies.push(`${policyObject.name} (${policyObject.version || 'DRAFT'})`);
                token.policyIds.push(policyObject.id.toString());
                token.canDelete = token.canDelete && policyObject.status === 'DRAFT';
            }
        }
    }
    if (policyId) {
        tokens = tokens.filter(t => t.policyIds.includes(policyId));
    }
    if (notEmpty) {
        tokens = tokens.filter(t => !!t.policyIds.length);
    }
    return tokens;

}

/**
 * Set policy in dynamic tokens
 * @param tokens
 * @param engineService
 */
async function setDynamicTokenPolicy(tokens: any[], engineService?: PolicyEngine): Promise<any> {
    if (!tokens || !engineService) {
        return tokens;
    }
    for (const token of tokens) {
        if (!token.policyId) {
            continue;
        }
        const policy = await engineService.getPolicy({
            filters: {
                id: token.policyId,
            }
        });
        token.policies = [`${policy.name} (${policy.version || 'DRAFT'})`];
        token.policyIds = [policy.id];
    }
    return tokens;
}

@Controller('tokens')
@ApiTags('tokens')
export class TokensApi {
    @Get('/')
    @HttpCode(HttpStatus.OK)
    async getTokens(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        try {
            const guardians = new Guardians();
            const engineService = new PolicyEngine();

            const user = req.user;
            const policyId = req.query?.policy;

            let pageIndex: number;
            let pageSize: number;
            if (req.query && req.query.pageIndex && req.query.pageSize) {
                pageIndex = Number.parseInt(req.query.pageIndex, 10);
                pageSize = Number.parseInt(req.query.pageSize, 10);
            }

            let tokensAndCount = {
                items: [],
                count: 0
            }

            if (user.role === UserRole.STANDARD_REGISTRY) {
                tokensAndCount = await guardians.getTokensPage(user.did, pageIndex, pageSize);
                const map = await engineService.getTokensMap(user.did);
                tokensAndCount.items = await setDynamicTokenPolicy(tokensAndCount.items, engineService);
                tokensAndCount.items = setTokensPolicies(tokensAndCount.items, map, policyId, false);
            } else if (user.did) {
                tokensAndCount = await guardians.getAssociatedTokens(user.did, pageIndex, pageSize);
                const map = await engineService.getTokensMap(user.parent, 'PUBLISH');
                tokensAndCount.items = await setDynamicTokenPolicy(tokensAndCount.items, engineService);
                tokensAndCount.items = setTokensPolicies(tokensAndCount.items, map, policyId, true);
            }
            return res
                .setHeader('X-Total-Count', tokensAndCount.count)
                .json(tokensAndCount.items);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/')
    @HttpCode(HttpStatus.CREATED)
    async newToken(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const guardians = new Guardians();
            const engineService = new PolicyEngine();
            const user = req.user;

            if (!user.did) {
                return res.status(422).json(prepareValidationResponse('User not registered'));
            }

            let tokens = await guardians.setToken({
                token: req.body,
                owner: user.did
            });

            tokens = await guardians.getTokens({ did: user.did });
            const map = await engineService.getTokensMap(user.did);
            tokens = setTokensPolicies(tokens, map);

            return res.status(201).json(tokens);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/push')
    @HttpCode(HttpStatus.ACCEPTED)
    async pushTokenAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const user = req.user;
        if (!user.did) {
            return res.status(422).json(prepareValidationResponse('User not registered'));
        }
        const token = req.body;
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.CREATE_TOKEN, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.setTokenAsync(token, user.did, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
        });

        return res.status(202).send(task);
    }

    @Put('/')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Update token.',
        description: 'Update token. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiBody({
        description: 'Token',
        required: true,
        schema: {
            type: 'object'
        }
    })
    @ApiOkResponse({
        description: 'Updated token.',
        schema: {
            'type': 'object'
        },
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.'
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.CREATED)
    async updateToken(@Req() req): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const user = req.user;
        const token = req.body;

        if (!user.did) {
            throw new HttpException('User is not registered', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        if (!token.tokenId) {
            throw new HttpException('The field tokenId is required', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        const guardians = new Guardians();
        const tokenObject = await guardians.getTokenById(token.tokenId);

        if (!tokenObject) {
            throw new HttpException('Token not found', HttpStatus.NOT_FOUND)
        }

        if (tokenObject.owner !== user.did) {
            throw new HttpException('Invalid creator.', HttpStatus.FORBIDDEN)
        }

        return await guardians.updateToken(token);
    }

    @Put('/push')
    @HttpCode(HttpStatus.ACCEPTED)
    async updateTokenAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const token = req.body;

            if (!user.did) {
                return res.status(422).json(prepareValidationResponse('User not registered'));
            }

            if (!token.tokenId) {
                return res.status(422).json(prepareValidationResponse('The field tokenId is required'));
            }

            const guardians = new Guardians();
            const tokenObject = await guardians.getTokenById(token.tokenId);

            if (!tokenObject) {
                throw new HttpException('Token not found', HttpStatus.NOT_FOUND)
            }

            if (tokenObject.owner !== user.did) {
                throw new HttpException('Invalid creator.', HttpStatus.FORBIDDEN)
            }

            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.UPDATE_TOKEN, user.id);
            RunFunctionAsync<ServiceError>(async () => {
                await guardians.updateTokenAsync(token, task);
            }, async (error) => {
                new Logger().error(error, ['API_GATEWAY']);
                taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
            });

            return res.status(202).send(task);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Delete('/push/:tokenId')
    @HttpCode(HttpStatus.ACCEPTED)
    async deleteTokenAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const tokenId = req.params.tokenId;

            if (!user.did) {
                return res.status(422).json(prepareValidationResponse('User not registered'));
            }

            const guardians = new Guardians();
            const tokenObject = await guardians.getTokenById(tokenId);

            if (!tokenObject) {
                throw new HttpException('Token does not exist.', HttpStatus.NOT_FOUND)
            }

            if (tokenObject.owner !== user.did) {
                throw new HttpException('Invalid creator.', HttpStatus.FORBIDDEN);
            }

            const engineService = new PolicyEngine();
            const map = await engineService.getTokensMap(user.did);
            setTokensPolicies([tokenObject], map, undefined, false);

            if (!tokenObject.canDelete) {
                throw new HttpException('Token cannot be deleted', HttpStatus.FORBIDDEN);
            }

            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.DELETE_TOKEN, user.id);
            RunFunctionAsync<ServiceError>(async () => {
                await guardians.deleteTokenAsync(tokenId, task);
            }, async (error) => {
                new Logger().error(error, ['API_GATEWAY']);
                taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
            });

            return res.status(202).send(task);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Put('/:tokenId/associate')
    @HttpCode(HttpStatus.OK)
    async associateToken(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.USER)(req.user);
        try {
            const guardians = new Guardians();
            const tokenId = req.params.tokenId;
            const userDid = req.user.did;
            if (!userDid) {
                return res.status(422).json(prepareValidationResponse('User not registered'));
            }
            const status = await guardians.associateToken(tokenId, userDid);
            return res.json(status);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND)
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new HttpException('Token does not exist.', HttpStatus.NOT_FOUND)
            }
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Put('/push/:tokenId/associate')
    @HttpCode(HttpStatus.ACCEPTED)
    async associateTokenAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.USER)(req.user);
        const tokenId = req.params.tokenId;
        const user = req.user;
        if (!user.did) {
            return res.status(422).json(prepareValidationResponse('User not registered'));
        }

        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.ASSOCIATE_TOKEN, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.associateTokenAsync(tokenId, user.did, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
        });

        return res.status(202).send(task);
    }

    @Put('/:tokenId/dissociate')
    @HttpCode(HttpStatus.OK)
    async dissociateToken(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.USER)(req.user);
        try {
            const guardians = new Guardians();
            const tokenId = req.params.tokenId;
            const userDid = req.user.did;
            if (!userDid) {
                return res.status(422).json(prepareValidationResponse('User not registered'));
            }
            const status = await guardians.dissociateToken(tokenId, userDid);
            return res.json(status);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND)
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new HttpException('Token does not exist.', HttpStatus.NOT_FOUND)
            }
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Put('/push/:tokenId/dissociate')
    @HttpCode(HttpStatus.ACCEPTED)
    async dissociateTokenAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.USER)(req.user);
        const tokenId = req.params.tokenId;
        const user = req.user;
        if (!user.did) {
            return res.status(422).json(prepareValidationResponse('User not registered'));
        }
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.DISSOCIATE_TOKEN, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.dissociateTokenAsync(tokenId, user.did, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
        });

        return res.status(202).send(task);
    }

    @Put('/:tokenId/:username/grant-kyc')
    @HttpCode(HttpStatus.OK)
    async grantKyc(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const guardians = new Guardians();
            const tokenId = req.params.tokenId;
            const username = req.params.username;
            const userDid = req.user.did;
            if (!userDid) {
                return res.status(422).json(prepareValidationResponse('User not registered'));
            }
            return res.json(await guardians.grantKycToken(tokenId, username, userDid));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND)
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new HttpException('Token not found', HttpStatus.NOT_FOUND)
            }
            throw error;
        }
    }

    @Put('/push/:tokenId/:username/grant-kyc')
    @HttpCode(HttpStatus.ACCEPTED)
    async grantKycAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const user = req.user;
        if (!user.did) {
            return res.status(422).json(prepareValidationResponse('User not registered'));
        }
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.GRANT_KYC, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.grantKycTokenAsync(tokenId, username, user.did, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
        });

        return res.status(202).send(task);
    }

    @Put('/:tokenId/:username/revoke-kyc')
    @HttpCode(HttpStatus.OK)
    async revokeKyc(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const guardians = new Guardians();
            const tokenId = req.params.tokenId;
            const username = req.params.username;
            const userDid = req.user.did;
            if (!userDid) {
                return res.status(422).json(prepareValidationResponse('User not registered'));
            }
            const result = await guardians.revokeKycToken(tokenId, username, userDid);
            return res.json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND)
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new HttpException('Token not found', HttpStatus.NOT_FOUND)
            }
            throw error;
        }
    }

    @Put('/push/:tokenId/:username/revoke-kyc')
    @HttpCode(HttpStatus.ACCEPTED)
    async revokeKycAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const user = req.user;
        if (!user.did) {
            throw new HttpException('User not registered', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.REVOKE_KYC, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.revokeKycTokenAsync(tokenId, username, user.did, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
        });

        return res.status(202).send(task);
    }

    @Put('/:tokenId/:username/freeze')
    @HttpCode(HttpStatus.OK)
    async freezeToken(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const guardians = new Guardians();
            const tokenId = req.params.tokenId;
            const username = req.params.username;
            const userDid = req.user.did;
            if (!userDid) {
                return res.status(422).json(prepareValidationResponse('User not registered'));
            }
            const result = await guardians.freezeToken(tokenId, username, userDid);
            return res.json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new HttpException('User not registered', HttpStatus.NOT_FOUND);
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new HttpException('Token not registered', HttpStatus.NOT_FOUND);
            }
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Put('/:tokenId/:username/unfreeze')
    @HttpCode(HttpStatus.OK)
    async unfreezeToken(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const guardians = new Guardians();
            const tokenId = req.params.tokenId;
            const username = req.params.username;
            const userDid = req.user.did;
            if (!userDid) {
                return res.status(422).json(prepareValidationResponse('User not registered'));
            }
            const result = await guardians.unfreezeToken(tokenId, username, userDid);
            return res.json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new HttpException('User not registered', HttpStatus.NOT_FOUND);
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new HttpException('Token not registered', HttpStatus.NOT_FOUND);
            }
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Put('/push/:tokenId/:username/freeze')
    @HttpCode(HttpStatus.ACCEPTED)
    async freezeTokenAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const user = req.user;
        if (!user.did) {
            return res.status(422).json(prepareValidationResponse('User not registered'));
        }
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.FREEZE_TOKEN, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.freezeTokenAsync(tokenId, username, user.did, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
        });

        return res.status(202).send(task);
    }

    @Put('/push/:tokenId/:username/unfreeze')
    @HttpCode(HttpStatus.ACCEPTED)
    async unfreezeTokenAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const user = req.user;
        if (!user.did) {
            return res.status(422).json(prepareValidationResponse('User not registered'));
        }
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.UNFREEZE_TOKEN, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.unfreezeTokenAsync(tokenId, username, user.did, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
        });

        return res.status(202).send(task);
    }

    /**
     * @param req
     * @param res
     */
    @Get('/:tokenId/:username/info')
    @HttpCode(HttpStatus.OK)
    async getTokenInfo(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const guardians = new Guardians();
            const tokenId = req.params.tokenId;
            const username = req.params.username;
            const userDid = req.user.did;
            if (!userDid) {
                return res.status(422).json(prepareValidationResponse('User not registered'));
            }
            const result = await guardians.getInfoToken(tokenId, username, userDid);
            return res.json(result as ITokenInfo);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new HttpException('User not registered', HttpStatus.NOT_FOUND);
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new HttpException('Token not registered', HttpStatus.NOT_FOUND);
            }
            throw error;
        }
    }

    /**
     * @param req
     * @param res
     */
    @Get('/:tokenId/serials')
    @ApiBearerAuth()
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiOperation({
        summary: 'Return token serials.',
        description: 'Returns token serials of current user.',
    })
    @ApiParam({
        name: 'tokenId',
        type: 'string',
        description: 'Token identifier',
        required: true,
        example: '0.0.1',
    })
    @ApiOkResponse({
        description: 'Token serials.',
        isArray: true,
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
    async getTokenSerials(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        try {
            const guardians = new Guardians();
            const tokenId = req.params.tokenId;
            const userDid = req.user.did;
            const result = await guardians.getTokenSerials(tokenId, userDid);
            return res.json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new HttpException('User not registered', HttpStatus.NOT_FOUND);
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new HttpException('Token not registered', HttpStatus.NOT_FOUND);
            }
            throw error;
        }
    }
}
