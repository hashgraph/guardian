import { Guardians, PolicyEngine, TaskManager, ServiceError, InternalException, ONLY_SR, parseInteger, EntityOwner, getCacheKey, CacheService } from '#helpers';
import { IOwner, IToken, Permissions, PolicyStatus, TaskAction, UserPermissions } from '@guardian/interfaces';
import { IAuthUser, PinoLogger, RunFunctionAsync } from '@guardian/common';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Req, Response, Version } from '@nestjs/common';
import { AuthUser, Auth } from '#auth';
import { ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiExtraModels, ApiTags, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Examples, InternalServerErrorDTO, TaskDTO, TokenDTO, TokenInfoDTO, pageHeader } from '#middlewares';
import { TOKEN_REQUIRED_PROPS } from '#constants';

/**
 * Connect policies to tokens
 * @param tokens
 * @param map
 * @param policyId
 * @param notEmpty
 */
function setTokensPolicies<T>(
    tokens: any[],
    map: any[],
    policyId?: string,
    notEmpty?: boolean
): T[] {
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
async function setDynamicTokenPolicy(
    tokens: any[],
    owner: IOwner
): Promise<any> {
    if (!tokens || !owner) {
        return tokens;
    }
    for (const token of tokens) {
        if (!token.policyId) {
            continue;
        }
        const engineService = new PolicyEngine();
        const policy = await engineService.getPolicy({
            filters: {
                id: token.policyId,
            }
        }, owner);
        token.policies = [`${policy.name} (${policy.version || 'DRAFT'})`];
        token.policyIds = [policy.id];
    }
    return tokens;
}

@Controller('tokens')
@ApiTags('tokens')
export class TokensApi {

    constructor(private readonly cacheService: CacheService, private readonly logger: PinoLogger) {

    }

    /**
     * Return a list of tokens
     */
    @Get('/')
    @Auth(
        Permissions.TOKENS_TOKEN_READ
        // UserRole.STANDARD_REGISTRY
        // UserRole.USER
    )
    @ApiOperation({
        summary: 'Return a list of tokens.',
        description: 'Returns all tokens. For the Standard Registry role it returns only the list of tokens, for other users it also returns token balances as well as the KYC, Freeze, and Association statuses. Not allowed for the Auditor role.',
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
    @ApiQuery({
        name: 'status',
        type: String,
        enum: [
            'Associated',
            'All'
        ],
        description: 'Token status',
        required: false,
        example: 'All'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: TokenDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TokenDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getTokens(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('policyId') policyId?: string,
        @Query('status') status?: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
    ): Promise<TokenDTO[]> {
        try {
            const guardians = new Guardians();
            const engineService = new PolicyEngine();

            let tokensAndCount = { items: [], count: 0 };
            const owner = new EntityOwner(user);
            if (owner) {
                if (UserPermissions.has(user, Permissions.TOKENS_TOKEN_EXECUTE) && status !== 'All') {
                    tokensAndCount = await guardians.getAssociatedTokens(owner, user.did, parseInteger(pageIndex), parseInteger(pageSize));
                    const map = await engineService.getTokensMap(owner, [PolicyStatus.PUBLISH, PolicyStatus.VIEW]);
                    // tokensAndCount.items = await setDynamicTokenPolicy(tokensAndCount.items, owner);
                    tokensAndCount.items = setTokensPolicies(tokensAndCount.items, map, policyId, true);
                } else {
                    tokensAndCount = await guardians.getTokensPage(owner, parseInteger(pageIndex), parseInteger(pageSize));
                    const map = await engineService.getTokensMap(owner);
                    tokensAndCount.items = await setDynamicTokenPolicy(tokensAndCount.items, owner);
                    tokensAndCount.items = setTokensPolicies(tokensAndCount.items, map, policyId, false);
                }
            }
            return res
                .header('X-Total-Count', tokensAndCount.count)
                .send(tokensAndCount.items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Return a list of tokens V2 10.06.2024
     */
    @Get('/')
    @Auth(
        Permissions.TOKENS_TOKEN_READ
        // UserRole.STANDARD_REGISTRY
        // UserRole.USER
    )
    @ApiOperation({
        summary: 'Return a list of tokens.',
        description: 'Returns all tokens. For the Standard Registry role it returns only the list of tokens, for other users it also returns token balances as well as the KYC, Freeze, and Association statuses. Not allowed for the Auditor role.',
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
    @ApiQuery({
        name: 'status',
        type: String,
        enum: [
            'Associated',
            'All'
        ],
        description: 'Token status',
        required: false,
        example: 'All'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: TokenDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TokenDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    @Version('2')
    async getTokensV2(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('policyId') policyId?: string,
        @Query('status') status?: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
    ): Promise<TokenDTO[]> {
        try {
            const guardians = new Guardians();
            const engineService = new PolicyEngine();

            let tokensAndCount = { items: [], count: 0 };
            const owner = new EntityOwner(user);
            if (owner) {
                if (UserPermissions.has(user, Permissions.TOKENS_TOKEN_EXECUTE) && status !== 'All') {
                    tokensAndCount = await guardians.getAssociatedTokens(owner, user.did, parseInteger(pageIndex), parseInteger(pageSize));
                    const map = await engineService.getTokensMap(owner, [PolicyStatus.PUBLISH, PolicyStatus.VIEW]);
                    // tokensAndCount.items = await setDynamicTokenPolicy(tokensAndCount.items, owner);
                    tokensAndCount.items = setTokensPolicies(tokensAndCount.items, map, policyId, true);
                } else {
                    const fields: string[] = Object.values(TOKEN_REQUIRED_PROPS)

                    tokensAndCount = await guardians.getTokensPageV2(fields, owner, parseInteger(pageIndex), parseInteger(pageSize));
                    const map = await engineService.getTokensMap(owner);
                    tokensAndCount.items = await setDynamicTokenPolicy(tokensAndCount.items, owner);
                    tokensAndCount.items = setTokensPolicies(tokensAndCount.items, map, policyId, false);
                }
            }
            return res
                .header('X-Total-Count', tokensAndCount.count)
                .send(tokensAndCount.items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    @Get('/:tokenId')
    @Auth(
        Permissions.TOKENS_TOKEN_READ
    )
    @ApiOperation({
        summary: 'Return a token by id.',
        description: 'Return the token.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: TokenDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TokenDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getTokenByIdWithPolicies(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string,
        @Query('policyId') policyId?: string,
    ): Promise<TokenDTO> {
        try {
            const guardians: Guardians = new Guardians();
            const owner: EntityOwner = new EntityOwner(user);

            const engineService: PolicyEngine = new PolicyEngine();
            const map = await engineService.getTokensMap(owner);

            const tokenById: IToken = await guardians.getTokenById(tokenId, owner);

            const [dynamicTokenById] = await setDynamicTokenPolicy([tokenById], owner);
            const [tokenByIdWithPolicies] = setTokensPolicies([dynamicTokenById], map, policyId, false);

            return tokenByIdWithPolicies;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Creates a new token
     */
    @Post('/')
    @Auth(
        Permissions.TOKENS_TOKEN_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Creates a new token.',
        description: 'Creates a new token.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Object that contains token information.',
        required: true,
        type: TokenDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TokenDTO,
        isArray: true
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TokenDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async newToken(
        @AuthUser() user: IAuthUser,
        @Body() token: TokenDTO,
        @Req() req
    ): Promise<TokenDTO[]> {
        try {
            const guardians = new Guardians();
            const engineService = new PolicyEngine();
            const owner = new EntityOwner(user);

            let tokens = await guardians.setToken(token, owner);
            tokens = await guardians.getTokens({}, owner);
            const map = await engineService.getTokensMap(owner);
            tokens = setTokensPolicies(tokens, map);

            await this.cacheService.invalidate(getCacheKey([req.url], user))

            return tokens;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Creates a new token
     */
    @Post('/push')
    @Auth(
        Permissions.TOKENS_TOKEN_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Creates a new token.',
        description: 'Creates a new token.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Object that contains token information.',
        required: true,
        type: TokenDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TaskDTO, TokenDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async pushTokenAsync(
        @AuthUser() user: IAuthUser,
        @Body() token: TokenDTO
    ): Promise<TaskDTO> {
        if (!user.did) {
            throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const owner = new EntityOwner(user);
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.CREATE_TOKEN, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.setTokenAsync(token, owner, task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
        });

        return task;
    }

    /**
     * Update token
     */
    @Put('/')
    @Auth(
        Permissions.TOKENS_TOKEN_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Update token.',
        description: 'Update token.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Object that contains token information.',
        required: true,
        type: TokenDTO
    })
    @ApiOkResponse({
        description: 'Updated token.',
        type: TokenDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TokenDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async updateToken(
        @AuthUser() user: IAuthUser,
        @Body() token: TokenDTO,
        @Req() req
    ): Promise<TokenDTO> {
        try {
            if (!user.did) {
                throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
            }

            if (!token.tokenId) {
                throw new HttpException('The field tokenId is required.', HttpStatus.UNPROCESSABLE_ENTITY);
            }

            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const tokenObject = await guardians.getTokenById(token.tokenId, owner);

            if (!tokenObject) {
                throw new HttpException('Token not found.', HttpStatus.NOT_FOUND)
            }

            if (tokenObject.owner !== owner.owner) {
                throw new HttpException('Invalid creator.', HttpStatus.FORBIDDEN)
            }

            await this.cacheService.invalidate(getCacheKey([req.url], user))

            return await guardians.updateToken(token, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Update token
     */
    @Put('/push')
    @Auth(
        Permissions.TOKENS_TOKEN_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Update token.',
        description: 'Update token.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Object that contains token information.',
        required: true,
        type: TokenDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TaskDTO, TokenDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async updateTokenAsync(
        @AuthUser() user: IAuthUser,
        @Body() token: TokenDTO
    ): Promise<TaskDTO> {
        try {
            if (!user.did) {
                throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
            }

            if (!token.tokenId) {
                throw new HttpException('Invalid token id.', HttpStatus.UNPROCESSABLE_ENTITY);
            }

            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const tokenObject = await guardians.getTokenById(token.tokenId, owner);

            if (!tokenObject) {
                throw new HttpException('Token not found.', HttpStatus.NOT_FOUND)
            }

            if (tokenObject.owner !== owner.owner) {
                throw new HttpException('Invalid creator.', HttpStatus.FORBIDDEN)
            }

            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.UPDATE_TOKEN, user.id);
            RunFunctionAsync<ServiceError>(async () => {
                await guardians.updateTokenAsync(token, owner, task);
            }, async (error) => {
                await this.logger.error(error, ['API_GATEWAY'], user.id);
                taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
            });

            return task;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Delete token
     */
    @Delete('/push/:tokenId')
    @Auth(
        Permissions.TOKENS_TOKEN_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Deletes the token with the provided schema ID.',
        description: 'Deletes the token with the provided schema ID.' + ONLY_SR,
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Token ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async deleteTokenAsync(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string
    ): Promise<TaskDTO> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const tokenObject = await guardians.getTokenById(tokenId, owner);

            if (!tokenObject) {
                throw new HttpException('Token does not exist.', HttpStatus.NOT_FOUND)
            }

            if (tokenObject.owner !== owner.owner) {
                throw new HttpException('Invalid creator.', HttpStatus.FORBIDDEN);
            }

            const engineService = new PolicyEngine();
            const map = await engineService.getTokensMap(owner);
            setTokensPolicies([tokenObject], map, undefined, false);

            if (!tokenObject.canDelete) {
                throw new HttpException('Token cannot be deleted.', HttpStatus.FORBIDDEN);
            }

            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.DELETE_TOKEN, user.id);
            RunFunctionAsync<ServiceError>(async () => {
                await guardians.deleteTokenAsync(tokenId, owner, task);
            }, async (error) => {
                await this.logger.error(error, ['API_GATEWAY'], user.id);
                taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
            });

            return task;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
    
    /**
     * Delete tokens
     */
    @Post('/push/delete-multiple')
    @Auth(
        Permissions.TOKENS_TOKEN_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Delete multiple tokens.',
        description: 'Delete multiple tokens by their IDs.' + ONLY_SR,
    })
    @ApiParam({
        name: 'tokenIds',
        type: [String],
        description: 'Token Ids',
        required: true,
        example: [Examples.DB_ID]
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async deleteTokensAsync(
        @AuthUser() user: IAuthUser,
        @Body('tokenIds') tokenIds: string[],
        @Req() req
    ): Promise<any> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            
            const tokenObjects = await guardians.getTokens({ ids: tokenIds }, owner);

            if (tokenObjects?.length <= 0) {
                throw new HttpException('Token does not exist.', HttpStatus.NOT_FOUND)
            }

            if (tokenObjects.some(token => token.owner !== owner.owner)) {
                throw new HttpException('Invalid creator.', HttpStatus.FORBIDDEN);
            }

            const engineService = new PolicyEngine();
            const map = await engineService.getTokensMap(owner);
            setTokensPolicies(tokenObjects, map, undefined, false);

            var canDeleteResult = tokenObjects.find(token => !token.canDelete);
            if (canDeleteResult) {
                throw new HttpException(`Token ${canDeleteResult.tokenName} (${canDeleteResult.tokenId}) cannot be deleted.`, HttpStatus.FORBIDDEN);
            }

            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.DELETE_TOKENS, user.id);
            RunFunctionAsync<ServiceError>(async () => {
                await guardians.deleteTokensAsync(tokenIds, owner, task);
            }, async (error) => {
                await this.logger.error(error, ['API_GATEWAY'], user.id);
                taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
            });

            return task;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Associate
     */
    @Put('/:tokenId/associate')
    @Auth(
        Permissions.TOKENS_TOKEN_EXECUTE,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Associates the user with the provided Hedera token.',
        description: 'Associates the user with the provided Hedera token. Only users with the Installer role are allowed to make the request.',
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Token ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TokenInfoDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TokenInfoDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async associateToken(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string
    ): Promise<TokenInfoDTO> {
        try {
            if (!user.did) {
                throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.associateToken(tokenId, null, owner);
        } catch (error) {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new HttpException('User not found.', HttpStatus.NOT_FOUND)
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new HttpException('Token does not exist.', HttpStatus.NOT_FOUND)
            }
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Associate
     */
    @Put('/push/:tokenId/associate')
    @Auth(
        Permissions.TOKENS_TOKEN_EXECUTE,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Associates the user with the provided Hedera token.',
        description: 'Associates the user with the provided Hedera token. Only users with the Installer role are allowed to make the request.',
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Token ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async associateTokenAsync(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string
    ): Promise<TaskDTO> {
        if (!user.did) {
            throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        const owner = new EntityOwner(user);
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.ASSOCIATE_TOKEN, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.associateTokenAsync(tokenId, null, owner, task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
        });

        return task;
    }

    /**
     * Dissociate
     */
    @Put('/:tokenId/dissociate')
    @Auth(
        Permissions.TOKENS_TOKEN_EXECUTE,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Associate the user with the provided Hedera token.',
        description: 'Disassociates the user with the provided Hedera token. Only users with the Installer role are allowed to make the request.',
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Token ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TokenInfoDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TokenInfoDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async dissociateToken(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string
    ): Promise<TokenInfoDTO> {
        try {
            if (!user.did) {
                throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.dissociateToken(tokenId, null, owner);
        } catch (error) {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new HttpException('User not found.', HttpStatus.NOT_FOUND)
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new HttpException('Token does not exist.', HttpStatus.NOT_FOUND)
            }
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Dissociate
     */
    @Put('/push/:tokenId/dissociate')
    @Auth(
        Permissions.TOKENS_TOKEN_EXECUTE,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Associate the user with the provided Hedera token.',
        description: 'Disassociates the user with the provided Hedera token. Only users with the Installer role are allowed to make the request.',
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Token ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async dissociateTokenAsync(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string
    ): Promise<TaskDTO> {
        if (!user.did) {
            throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const owner = new EntityOwner(user);
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.DISSOCIATE_TOKEN, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.dissociateTokenAsync(tokenId, null, owner, task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
        });
        return task;
    }

    /**
     * KYC
     */
    @Put('/:tokenId/:username/grant-kyc')
    @Auth(
        Permissions.TOKENS_TOKEN_MANAGE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Sets the KYC flag for the user.',
        description: 'Sets the KYC flag for the user.' + ONLY_SR,
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Token ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'username',
        type: String,
        description: 'Username',
        required: true,
        example: 'username'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TokenInfoDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TokenInfoDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async grantKyc(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string,
        @Param('username') username: string
    ): Promise<TokenInfoDTO> {
        try {
            if (!user.did) {
                throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.grantKycToken(tokenId, username, owner);
        } catch (error) {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new HttpException('User not found.', HttpStatus.NOT_FOUND)
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new HttpException('Token not found.', HttpStatus.NOT_FOUND)
            }
            throw error;
        }
    }

    /**
     * KYC
     */
    @Put('/push/:tokenId/:username/grant-kyc')
    @Auth(
        Permissions.TOKENS_TOKEN_MANAGE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Sets the KYC flag for the user.',
        description: 'Sets the KYC flag for the user.' + ONLY_SR,
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Token ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'username',
        type: String,
        description: 'Username',
        required: true,
        example: 'username'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async grantKycAsync(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string,
        @Param('username') username: string
    ): Promise<TaskDTO> {
        if (!user.did) {
            throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const owner = new EntityOwner(user);
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.GRANT_KYC, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.grantKycTokenAsync(tokenId, username, owner, task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
        });
        return task;
    }

    /**
     * KYC
     */
    @Put('/:tokenId/:username/revoke-kyc')
    @Auth(
        Permissions.TOKENS_TOKEN_MANAGE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Unsets the KYC flag for the user.',
        description: 'Unsets the KYC flag for the user.' + ONLY_SR
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Token ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'username',
        type: String,
        description: 'Username',
        required: true,
        example: 'username'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TokenInfoDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TokenInfoDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async revokeKyc(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string,
        @Param('username') username: string
    ): Promise<TokenInfoDTO> {
        try {
            const guardians = new Guardians();
            if (!user.did) {
                throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            return await guardians.revokeKycToken(tokenId, username, owner);
        } catch (error) {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new HttpException('User not found.', HttpStatus.NOT_FOUND)
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new HttpException('Token not found.', HttpStatus.NOT_FOUND)
            }
            throw error;
        }
    }

    /**
     * KYC
     */
    @Put('/push/:tokenId/:username/revoke-kyc')
    @Auth(
        Permissions.TOKENS_TOKEN_MANAGE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Unsets the KYC flag for the user.',
        description: 'Unsets the KYC flag for the user.' + ONLY_SR
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Token ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'username',
        type: String,
        description: 'Username',
        required: true,
        example: 'username'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async revokeKycAsync(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string,
        @Param('username') username: string
    ): Promise<TaskDTO> {
        if (!user.did) {
            throw new HttpException('User not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const owner = new EntityOwner(user);
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.REVOKE_KYC, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.revokeKycTokenAsync(tokenId, username, owner, task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
        });
        return task;
    }

    /**
     * Freeze
     */
    @Put('/:tokenId/:username/freeze')
    @Auth(
        Permissions.TOKENS_TOKEN_MANAGE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Freeze transfers of the specified token for the user.',
        description: 'Freezes transfers of the specified token for the user.' + ONLY_SR
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Token ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'username',
        type: String,
        description: 'Username',
        required: true,
        example: 'username'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TokenInfoDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TokenInfoDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async freezeToken(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string,
        @Param('username') username: string
    ): Promise<TokenInfoDTO> {
        try {
            if (!user.did) {
                throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.freezeToken(tokenId, username, owner);
        } catch (error) {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new HttpException('User not registered.', HttpStatus.NOT_FOUND);
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new HttpException('Token not registered.', HttpStatus.NOT_FOUND);
            }
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Unfreeze
     */
    @Put('/:tokenId/:username/unfreeze')
    @Auth(
        Permissions.TOKENS_TOKEN_MANAGE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Unfreezes transfers of the specified token for the user.',
        description: 'Unfreezes transfers of the specified token for the user.' + ONLY_SR
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Token ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'username',
        type: String,
        description: 'Username',
        required: true,
        example: 'username'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TokenInfoDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TokenInfoDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async unfreezeToken(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string,
        @Param('username') username: string
    ): Promise<TokenInfoDTO> {
        try {
            if (!user.did) {
                throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.unfreezeToken(tokenId, username, owner);
        } catch (error) {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new HttpException('User not registered.', HttpStatus.NOT_FOUND);
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new HttpException('Token not registered.', HttpStatus.NOT_FOUND);
            }
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Freeze
     */
    @Put('/push/:tokenId/:username/freeze')
    @Auth(
        Permissions.TOKENS_TOKEN_MANAGE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Freeze transfers of the specified token for the user.',
        description: 'Freezes transfers of the specified token for the user.' + ONLY_SR
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Token ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'username',
        type: String,
        description: 'Username',
        required: true,
        example: 'username'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async freezeTokenAsync(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string,
        @Param('username') username: string
    ): Promise<TaskDTO> {
        if (!user.did) {
            throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const owner = new EntityOwner(user);
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.FREEZE_TOKEN, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.freezeTokenAsync(tokenId, username, owner, task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
        });
        return task;
    }

    /**
     * Unfreeze
     */
    @Put('/push/:tokenId/:username/unfreeze')
    @Auth(
        Permissions.TOKENS_TOKEN_MANAGE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Unfreezes transfers of the specified token for the user.',
        description: 'Unfreezes transfers of the specified token for the user.' + ONLY_SR
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Token ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'username',
        type: String,
        description: 'Username',
        required: true,
        example: 'username'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async unfreezeTokenAsync(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string,
        @Param('username') username: string
    ): Promise<TaskDTO> {
        if (!user.did) {
            throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const owner = new EntityOwner(user);
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.UNFREEZE_TOKEN, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.unfreezeTokenAsync(tokenId, username, owner, task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
        });
        return task;
    }

    /**
     * User info
     */
    @Get('/:tokenId/:username/info')
    @Auth(
        Permissions.TOKENS_TOKEN_MANAGE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Returns user information for the selected token.',
        description: 'Returns user information for the selected token.' + ONLY_SR
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Token ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'username',
        type: String,
        description: 'Username',
        required: true,
        example: 'username'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TokenInfoDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TokenInfoDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getTokenInfo(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string,
        @Param('username') username: string
    ): Promise<TokenInfoDTO> {
        try {
            if (!user.did) {
                throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.getInfoToken(tokenId, username, owner);
        } catch (error) {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new HttpException('User not registered.', HttpStatus.NOT_FOUND);
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new HttpException('Token not registered.', HttpStatus.NOT_FOUND);
            }
            throw error;
        }
    }

    /**
     * Serials
     */
    @Get('/:tokenId/serials')
    @Auth(
        Permissions.TOKENS_TOKEN_READ
        // UserRole.STANDARD_REGISTRY
        // UserRole.USER
    )
    @ApiOperation({
        summary: 'Return token serials.',
        description: 'Returns token serials of current user.',
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Token ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Token serials.',
        isArray: true,
        type: Number,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getTokenSerials(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string
    ): Promise<number[]> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            return await guardians.getTokenSerials(owner, tokenId, user.did);
        } catch (error) {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new HttpException('User not registered.', HttpStatus.NOT_FOUND);
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new HttpException('Token not registered.', HttpStatus.NOT_FOUND);
            }
            throw error;
        }
    }

    /**
     * Policy config menu
     */
    @Get('/menu/all')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        Permissions.MODULES_MODULE_UPDATE,
        Permissions.TOOLS_TOOL_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Return a list of tokens.',
        description: 'Returns tokens menu.' + ONLY_SR
    })
    @ApiOkResponse({
        description: 'Modules.',
        isArray: true,
        type: TokenDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(TokenDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getMenu(
        @AuthUser() user: IAuthUser
    ): Promise<TokenDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const engineService = new PolicyEngine();
            const map = await engineService.getTokensMap(owner, [PolicyStatus.PUBLISH, PolicyStatus.VIEW]);
            let items = await guardians.getTokens({}, owner);
            items = await setDynamicTokenPolicy(items, owner);
            items = setTokensPolicies(items, map, null, false);
            return items;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * User info
     */
    @Get('/:tokenId/relayer-accounts/:relayerAccountId/info')
    @Auth(
        Permissions.TOKENS_TOKEN_MANAGE,
        Permissions.TOKENS_TOKEN_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Returns user information for the selected token.',
        description: 'Returns user information for the selected token.' + ONLY_SR
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Token ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'relayerAccountId',
        type: String,
        description: 'Relayer Account Id',
        required: true,
        example: Examples.ACCOUNT_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TokenInfoDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TokenInfoDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getRelayerAccountInfo(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string,
        @Param('relayerAccountId') relayerAccountId: string
    ): Promise<TokenInfoDTO> {
        try {
            if (!user.did) {
                throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const guardians = new Guardians();
            if (UserPermissions.has(user, Permissions.TOKENS_TOKEN_MANAGE)) {
                return await guardians.getRelayerAccountInfo(tokenId, relayerAccountId, null, user);
            } else {
                const owner = new EntityOwner(user);
                return await guardians.getRelayerAccountInfo(tokenId, relayerAccountId, owner, user);
            }
        } catch (error) {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new HttpException('User not registered.', HttpStatus.NOT_FOUND);
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new HttpException('Token not registered.', HttpStatus.NOT_FOUND);
            }
            throw error;
        }
    }

    /**
     * Associate
     */
    @Put('/:tokenId/associate/:accountId')
    @Auth(
        Permissions.TOKENS_TOKEN_EXECUTE,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Associates the user with the provided Hedera token.',
        description: 'Associates the user with the provided Hedera token. Only users with the Installer role are allowed to make the request.',
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Token ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'accountId',
        type: String,
        description: 'Account ID',
        required: true,
        example: Examples.ACCOUNT_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TokenInfoDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TokenInfoDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async associateWithAccountToken(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string,
        @Param('accountId') accountId: string
    ): Promise<TokenInfoDTO> {
        try {
            if (!user.did) {
                throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.associateToken(tokenId, accountId, owner);
        } catch (error) {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new HttpException('User not found.', HttpStatus.NOT_FOUND)
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new HttpException('Token does not exist.', HttpStatus.NOT_FOUND)
            }
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Associate
     */
    @Put('/push/:tokenId/associate/:accountId')
    @Auth(
        Permissions.TOKENS_TOKEN_EXECUTE,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Associates the user with the provided Hedera token.',
        description: 'Associates the user with the provided Hedera token. Only users with the Installer role are allowed to make the request.',
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Token ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'accountId',
        type: String,
        description: 'Account ID',
        required: true,
        example: Examples.ACCOUNT_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async associateTokenWithAccountAsync(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string,
        @Param('accountId') accountId: string
    ): Promise<TaskDTO> {
        if (!user.did) {
            throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        const owner = new EntityOwner(user);
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.ASSOCIATE_TOKEN, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.associateTokenAsync(tokenId, accountId, owner, task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
        });

        return task;
    }

    /**
     * Dissociate
     */
    @Put('/:tokenId/dissociate/:accountId')
    @Auth(
        Permissions.TOKENS_TOKEN_EXECUTE,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Associate the user with the provided Hedera token.',
        description: 'Disassociates the user with the provided Hedera token. Only users with the Installer role are allowed to make the request.',
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Token ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'accountId',
        type: String,
        description: 'Account ID',
        required: true,
        example: Examples.ACCOUNT_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TokenInfoDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TokenInfoDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async dissociateWithAccountToken(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string,
        @Param('accountId') accountId: string
    ): Promise<TokenInfoDTO> {
        try {
            if (!user.did) {
                throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.dissociateToken(tokenId, accountId, owner);
        } catch (error) {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new HttpException('User not found.', HttpStatus.NOT_FOUND)
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new HttpException('Token does not exist.', HttpStatus.NOT_FOUND)
            }
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Dissociate
     */
    @Put('/push/:tokenId/dissociate/:accountId')
    @Auth(
        Permissions.TOKENS_TOKEN_EXECUTE,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Associate the user with the provided Hedera token.',
        description: 'Disassociates the user with the provided Hedera token. Only users with the Installer role are allowed to make the request.',
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Token ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'accountId',
        type: String,
        description: 'Account ID',
        required: true,
        example: Examples.ACCOUNT_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async dissociateTokenWithAccountAsync(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string,
        @Param('accountId') accountId: string
    ): Promise<TaskDTO> {
        if (!user.did) {
            throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const owner = new EntityOwner(user);
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.DISSOCIATE_TOKEN, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.dissociateTokenAsync(tokenId, accountId, owner, task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
        });
        return task;
    }

}
