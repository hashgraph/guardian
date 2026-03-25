import { Permissions, TaskAction } from '@guardian/interfaces';
import { IAuthUser, PinoLogger, RunFunctionAsync } from '@guardian/common';
import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Req, Response, Query, Delete } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBody, ApiExtraModels, ApiInternalServerErrorResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnauthorizedResponse, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import {
    CredentialsDTO,
    DidDocumentDTO,
    DidDocumentStatusDTO,
    DidDocumentWithKeyDTO,
    DidKeyStatusDTO,
    DidVerificationMethodEntryDTO,
    Examples,
    InternalServerErrorDTO,
    ObjectExamples,
    PolicyKeyConfigDTO,
    PolicyKeyDTO,
    ProfileDTO,
    TaskDTO,
    UnauthorizedErrorDTO,
    UnprocessableEntityErrorDTO,
    pageHeader
} from '#middlewares';
import { Auth, AuthUser } from '#auth';
import { CacheService, getCacheKey, Guardians, InternalException, ServiceError, TaskManager, UseCache } from '#helpers';
import { CACHE, PREFIXES } from '#constants';

@Controller('profiles')
@ApiTags('profiles')
export class ProfileApi {
    constructor(private readonly cacheService: CacheService, private readonly logger: PinoLogger) {
    }

    /**
     * Get user profile for the authenticated user (JWT); path username is not used by the server.
     */
    @Get('/:username/')
    @Auth(Permissions.PROFILES_USER_READ)
    @ApiOperation({
        summary: 'Returns the authenticated user\'s account info.',
        description:
            'Returns account information for the **currently authenticated user** (Bearer token). ' +
            'The `username` path segment is **not** used to choose whose profile is returned; authorization alone determines the subject. ' +
            'Clients often pass their own username in the path for URL compatibility. ' +
            'For users with the Standard Registry role the response also includes address book and VC document information.',
    })
    @ApiParam({
        name: 'username',
        type: String,
        description:
            'Present for URL compatibility with existing clients. The server does not use this value when resolving the resource—the response is always the profile of the user identified by the Bearer token.',
        required: true,
        example: 'username'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ProfileDTO,
        example: ObjectExamples.PROFILE_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    @UseCache()
    async getProfile(
        @AuthUser() user: IAuthUser
    ): Promise<ProfileDTO> {
        try {
            const guardians = new Guardians();
            return await guardians.getProfile(user);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Update profile for the authenticated user (JWT); path username is not used by the server.
     */
    @Put('/:username')
    @Auth(
        Permissions.PROFILES_USER_UPDATE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
        // UserRole.AUDITOR
    )
    @ApiOperation({
        summary: 'Sets Hedera credentials for the authenticated user.',
        description:
            'Applies to the **currently authenticated user** (Bearer token). ' +
            'The `username` path segment is **not** used to choose whose profile is updated; authorization alone determines the subject. ' +
            'Clients often pass their own username in the path for URL compatibility. ' +
            'Sets Hedera credentials and related DID/VC data. For users with the Standard Registry role it also creates an address book.'
    })
    @ApiParam({
        name: 'username',
        type: String,
        description:
            'Present for URL compatibility with existing clients. The server does not use this value when applying the update—the request always targets the user identified by the Bearer token.',
        required: true,
        example: 'username'
    })
    @ApiBody({
        description: 'Hedera account, optional DID/VC payloads, and optional Fireblocks signing options.',
        required: true,
        type: CredentialsDTO,
        examples: {
            connectLocalStandardRegistry: {
                summary: 'Local Hedera key + SR VC subject fields',
                value: ObjectExamples.PROFILE_CREDENTIALS_PUT_BODY
            }
        }
    })
    @ApiNoContentResponse({
        description: ''
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized request.',
        type: UnauthorizedErrorDTO,
        example: {
            statusCode: 401,
            message: 'Unauthorized request'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    async setUserProfile(
        @AuthUser() user: IAuthUser,
        @Body() profile: any,
        @Req() req
    ): Promise<void> {
        const username: string = user.username;
        const guardians = new Guardians();
        try {
            await guardians.createUserProfileCommon(user, username, profile);
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
        }

        const invalidedCacheTags = [`/${PREFIXES.PROFILES}/${username}`];

        await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user))
    }

    /**
     * Update profile asynchronously for the authenticated user (JWT); path username is not used by the server.
     */
    @Put('/push/:username')
    @Auth(
        Permissions.PROFILES_USER_UPDATE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
        // UserRole.AUDITOR
    )
    @ApiOperation({
        summary: 'Sets Hedera credentials asynchronously for the authenticated user.',
        description:
            'Applies to the **currently authenticated user** (Bearer token). ' +
            'The `username` path segment is **not** used to choose whose profile is updated; authorization alone determines the subject. ' +
            'Clients often pass their own username in the path for URL compatibility. ' +
            'Starts a background task to connect Hedera credentials, publish DID/VC documents as required, and ' +
            'for Standard Registry users create an address book. ' +
            'Returns immediately with `202 Accepted` and a **task** identifier—use the worker-tasks API or your client ' +
            'notifications to track completion or errors.'
    })
    @ApiParam({
        name: 'username',
        type: String,
        description:
            'Present for URL compatibility with existing clients. The server does not use this value when applying the update—the request always targets the user identified by the Bearer token.',
        required: true,
        example: 'username'
    })
    @ApiBody({
        description:
            'Hedera account, optional DID/VC payloads, and optional Fireblocks signing options. ' +
            'Submission is accepted immediately; processing happens in the background.',
        required: true,
        type: CredentialsDTO,
        examples: {
            connectLocalStandardRegistry: {
                summary: 'Local Hedera key + SR VC subject fields',
                value: ObjectExamples.PROFILE_CREDENTIALS_PUT_BODY
            }
        }
    })
    @ApiAcceptedResponse({
        description: 'Task accepted for asynchronous processing. Poll or subscribe for task status.',
        type: TaskDTO,
        example: ObjectExamples.PROFILE_ASYNC_PUT_ACCEPTED_TASK
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async setUserProfileAsync(
        @AuthUser() user: IAuthUser,
        @Body() profile: any,
        @Req() req
    ): Promise<TaskDTO> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.CONNECT_USER, user.id);
        const username: string = user.username;
        const invalidedCacheTags = [`/${PREFIXES.PROFILES}/${username}`, `/${PREFIXES.ACCOUNTS}/session`];

        taskManager.registerCallback(task, async () => {
            await this.cacheService.invalidate(
                getCacheKey([req.url, ...invalidedCacheTags], user)
            );
        });

        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.createUserProfileCommonAsync(user, username, profile, task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
        });
        return task;
    }

    /**
     * Get user balance
     */
    @Get('/:username/balance')
    @Auth(
        Permissions.PROFILES_BALANCE_READ,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
        // UserRole.AUDITOR
    )
    @ApiOperation({
        summary: 'Returns user\'s Hedera account balance.',
        description: 'Requests Hedera account balance.'
    })
    @ApiParam({
        name: 'username',
        type: String,
        description: 'The name of the user for whom to fetch the balance.',
        required: true,
        example: 'username'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'string',
            example: '833.88244301 ℏ'
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Invalid Account' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @UseCache({ ttl: CACHE.SHORT_TTL })
    @HttpCode(HttpStatus.OK)
    async getUserBalance(
        @AuthUser() user: IAuthUser,
        @Param('username') username: string
    ): Promise<string> {
        if (!user.did) {
            return null;
        }
        const guardians = new Guardians();
        const balance = await guardians.getUserBalance(user, username);
        if (isNaN(parseFloat(balance))) {
            throw new HttpException(balance, HttpStatus.UNPROCESSABLE_ENTITY);
        }
        //For backward compatibility
        return JSON.stringify(balance);
    }

    /**
     * Restore user profile for the authenticated user (JWT); path username is not used by the server.
     */
    @Put('/restore/:username')
    @Auth(
        Permissions.PROFILES_RESTORE_ALL,
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Restore user data (policy, DID documents, VC documents).',
        description:
            'Applies to the **currently authenticated user** (Bearer token). ' +
            'The `username` path segment is **not** used to choose whose data is restored; authorization alone determines the subject. ' +
            'Clients often pass their own username in the path for URL compatibility. ' +
            'Starts a background task to restore user data (policy, DID documents, VC documents). ' +
            'Returns immediately with `202 Accepted` and a **task** identifier.'
    })
    @ApiParam({
        name: 'username',
        type: String,
        description:
            'Present for URL compatibility with existing clients. The server does not use this value when applying the update—the request always targets the user identified by the Bearer token.',
        required: true,
        example: 'username'
    })
    @ApiBody({
        description: 'Object that contains the Hedera account data.',
        required: true,
        type: CredentialsDTO,
        examples: {
            restoreUserProfile: {
                summary: 'Topic and Hedera credentials (`didDocument` may be null; `didKeys` may be empty)',
                value: ObjectExamples.PROFILE_PUT_RESTORE_USERNAME_REQUEST
            },
            restoreUserProfileWithDid: {
                summary: 'Topic, Hedera credentials, full DID document, and didKeys',
                value: ObjectExamples.PROFILE_PUT_RESTORE_USERNAME_REQUEST_WITH_DID
            }
        }
    })
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        type: TaskDTO,
        example: ObjectExamples.PROFILE_PUT_RESTORE_USERNAME_ACCEPTED_TASK
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async restoreUserProfile(
        @AuthUser() user: IAuthUser,
        @Body() profile: any,
        @Req() req
    ): Promise<TaskDTO> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.RESTORE_USER_PROFILE, user.id);
        const username: string = user.username;

        const invalidedCacheTags = [`/${PREFIXES.PROFILES}/${username}`];
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.restoreUserProfileCommonAsync(user, username, profile, task);

            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user))
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });

            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user))
        });
        return task;
    }

    /**
     * List of available recovery topics for the authenticated user (JWT); path username is not used by the server.
     */
    @Put('/restore/topics/:username')
    @Auth(
        Permissions.PROFILES_RESTORE_ALL,
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'List of available recovery topics.',
        description:
            'Applies to the **currently authenticated user** (Bearer token). ' +
            'The `username` path segment is **not** used to choose whose recovery topics are listed; authorization alone determines the subject. ' +
            'Clients often pass their own username in the path for URL compatibility. ' +
            'Starts a background task to list available recovery topics. ' +
            'Returns immediately with `202 Accepted` and a **task** identifier.'
    })
    @ApiParam({
        name: 'username',
        type: String,
        description:
            'Present for URL compatibility with existing clients. The server does not use this value when applying the update—the request always targets the user identified by the Bearer token.',
        required: true,
        example: 'username'
    })
    @ApiBody({
        description: 'Object that contains the Hedera account data.',
        required: true,
        type: CredentialsDTO,
        examples: {
            restoreTopics: {
                summary: 'Hedera credentials (didDocument may be null)',
                value: ObjectExamples.PROFILE_RESTORE_TOPICS_REQUEST
            },
            restoreTopicsWithDid: {
                summary: 'Hedera credentials with full DID document',
                value: ObjectExamples.PROFILE_RESTORE_TOPICS_REQUEST_WITH_DID
            }
        }
    })
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        type: TaskDTO,
        example: ObjectExamples.PROFILE_RESTORE_TOPICS_ACCEPTED_TASK
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async restoreTopic(
        @AuthUser() user: IAuthUser,
        @Body() profile: any,
        @Req() req
    ): Promise<TaskDTO> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.GET_USER_TOPICS, user.id);
        const username: string = user.username;

        const invalidedCacheTags = [`/${PREFIXES.PROFILES}/${username}`];
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.getAllUserTopicsAsync(user, username, profile, task);

            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user))
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });

            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user))
        });
        return task;
    }

    /**
     * Validate DID document format.
     */
    @Post('/did-document/validate')
    @Auth(
        Permissions.PROFILES_USER_UPDATE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER
    )
    @ApiOperation({
        summary: 'Validate DID document format.',
        description:
            'Checks the DID document and returns whether required Hedera verification methods (Ed25519 + BLS) are present. ' +
            'Response includes `keys` grouped by verification method type.'
    })
    @ApiBody({
        description: 'DID Document.',
        required: true,
        type: DidDocumentDTO,
        examples: {
            validDidDocument: {
                summary: 'Valid verification method types',
                value: ObjectExamples.PROFILE_DID_DOCUMENT_VALIDATE_REQUEST_VALID
            },
            invalidDidDocument: {
                summary: 'Invalid type (e.g. wrong `verificationMethod[].type`)',
                value: ObjectExamples.PROFILE_DID_DOCUMENT_VALIDATE_REQUEST_INVALID
            }
        }
    })
    @ApiOkResponse({
        description: 'HTTP 200 for both valid and invalid documents; inspect `valid` and `error`.',
        type: DidDocumentStatusDTO,
        examples: {
            valid: {
                summary: 'DID document passes validation',
                value: ObjectExamples.PROFILE_DID_DOCUMENT_VALIDATE_RESPONSE_VALID
            },
            invalid: {
                summary: 'Validation failed (e.g. required method type missing)',
                value: ObjectExamples.PROFILE_DID_DOCUMENT_VALIDATE_RESPONSE_INVALID
            }
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Body is empty' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(DidVerificationMethodEntryDTO)
    @HttpCode(HttpStatus.OK)
    async validateDidDocument(
        @AuthUser() user: IAuthUser,
        @Body() document: any
    ): Promise<DidDocumentStatusDTO> {
        if (!document) {
            throw new HttpException('Body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const guardians = new Guardians();
            return await guardians.validateDidDocument(user, document);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Validate DID document keys.
     */
    @Post('/did-keys/validate')
    @Auth(
        Permissions.PROFILES_USER_UPDATE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER
    )
    @ApiOperation({
        summary: 'Validate DID document keys.',
        description:
            'For each entry in `keys`, checks that `id` matches a verification method in `document` and that `key` validates against it. ' +
            'Returns the same array with a `valid` flag per entry (HTTP 200 even when some keys fail).'
    })
    @ApiBody({
        description: 'DID document plus `keys`: `{ id, key }` where `id` is the full verification method id.',
        required: true,
        type: DidDocumentWithKeyDTO,
        examples: {
            invalidKeys: {
                summary: 'Placeholder keys (validation fails)',
                value: ObjectExamples.PROFILE_DID_KEYS_VALIDATE_REQUEST_INVALID
            },
            validKeys: {
                summary: 'Private keys matching verification methods',
                value: ObjectExamples.PROFILE_DID_KEYS_VALIDATE_REQUEST_VALID
            }
        }
    })
    @ApiOkResponse({
        description: 'Array of results in the same order as request `keys`.',
        isArray: true,
        type: DidKeyStatusDTO,
        examples: {
            invalidKeys: {
                summary: 'Placeholder keys — `valid: false`',
                value: ObjectExamples.PROFILE_DID_KEYS_VALIDATE_RESPONSE_INVALID
            },
            validKeys: {
                summary: 'Matching keys — `valid: true`',
                value: ObjectExamples.PROFILE_DID_KEYS_VALIDATE_RESPONSE_VALID
            }
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Document is empty' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    async validateDidKeys(
        @AuthUser() user: IAuthUser,
        @Body() body: any
    ): Promise<DidKeyStatusDTO[]> {
        if (!body) {
            throw new HttpException('Body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        const { document, keys } = body;
        if (!document) {
            throw new HttpException('Document is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        if (!keys) {
            throw new HttpException('Keys is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const guardians = new Guardians();
            return await guardians.validateDidKeys(user, document, keys);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get page
     */
    @Get('/keys')
    @Auth(Permissions.PROFILES_USER_UPDATE)
    @ApiOperation({
        summary: 'Returns the list of existing keys.',
        description: 'Returns the list of existing keys.',
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
        type: PolicyKeyDTO,
        example: ObjectExamples.PROFILE_GET_KEYS_RESPONSE_LIST
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    async getPolicyLabels(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
    ): Promise<PolicyKeyDTO[]> {
        try {
            const guardians = new Guardians();
            const { items, count } = await guardians.getKeys(user, { pageIndex, pageSize });
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Create or import a policy signing key (same route).
     */
    @Post('/keys')
    @Auth(Permissions.PROFILES_USER_UPDATE)
    @ApiOperation({
        summary: 'Create or import a policy signing key.',
        description:
            'Registers a **policy message key** for the authenticated user\'s DID. ' +
            '**Generate:** send only `messageId`—the server creates a private key for that policy. The owner can copy the `messageId` and returned `key` from the response and pass them **out of band** to another person. ' +
            '**Import:** the recipient calls this endpoint with the same `messageId` plus the DER-encoded private `key` they received, so their account can use the policy like the original owner.'
    })
    @ApiBody({
        description:
            '`messageId` is always the policy **message id**. `key` is optional: omit it to **generate** a new key; ' +
            'provide it to **import** a key that was shared with you.',
        required: true,
        type: PolicyKeyConfigDTO,
        examples: {
            generateKeyForPolicy: {
                summary: 'Generate key for a policy message',
                description:
                    'Only `messageId` is sent; the server generates the private key. Use this to obtain a key for a specific policy, then share `messageId` and the private `key` from the response with another user manually.',
                value: ObjectExamples.PROFILE_POST_KEYS_REQUEST_MESSAGE_ONLY
            },
            remoteUserImport: {
                summary: 'Import key (remote user)',
                description:
                    'The **remote user** sends the same `messageId` and the DER private `key` they received out of band so this profile can use that policy.',
                value: ObjectExamples.PROFILE_POST_KEYS_REQUEST_IMPORT
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyKeyDTO,
        example: ObjectExamples.PROFILE_POST_KEYS_RESPONSE
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Message ID is empty' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    async generateKey(
        @AuthUser() user: IAuthUser,
        @Body() body: PolicyKeyConfigDTO
    ): Promise<PolicyKeyDTO> {
        if (!body) {
            throw new HttpException('Body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        const { messageId, key } = body;
        if (!messageId) {
            throw new HttpException('Message ID is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const guardians = new Guardians();
            return await guardians.generateKey(user, messageId, key);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Delete key
     */
    @Delete('/keys/:id')
    @Auth(Permissions.PROFILES_USER_UPDATE)
    @ApiOperation({
        summary: 'Deletes the key.',
        description: 'Deletes the key with the specified ID.',
    })
    @ApiParam({
        name: 'id',
        type: 'string',
        required: true,
        description: 'Key Identifier',
        example: Examples.DB_ID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
        example: true
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Invalid id' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    async deleteKey(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string
    ): Promise<boolean> {
        try {
            if (!id) {
                throw new HttpException('Invalid id', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const guardians = new Guardians();
            return await guardians.deleteKey(user, id);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
