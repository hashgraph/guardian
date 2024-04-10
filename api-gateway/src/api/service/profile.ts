import { Guardians } from '@helpers/guardians';
import { DidDocumentStatus, SchemaEntity, TaskAction, TopicType, UserRole } from '@guardian/interfaces';
import { IAuthUser, Logger, RunFunctionAsync } from '@guardian/common';
import { TaskManager } from '@helpers/task-manager';
import { ServiceError } from '@helpers/service-requests-base';
import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { AuthUser } from '@auth/authorization-helper';
import { Auth } from '@auth/auth.decorator';
import { ApiBody, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ApiImplicitParam } from '@nestjs/swagger/dist/decorators/api-implicit-param.decorator';
import { CredentialsDTO, DidDocumentDTO, DidDocumentStatusDTO, DidDocumentWithKeyDTO, DidKeyStatusDTO, InternalServerErrorDTO, ProfileDTO, TaskDTO } from '@middlewares/validation/schemas';

@Controller('profiles')
@ApiTags('profiles')
export class ProfileApi {
    /**
     * Get user.profile
     */
    @Get('/:username/')
    @Auth(
        UserRole.STANDARD_REGISTRY,
        UserRole.USER,
        UserRole.AUDITOR
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Returns user account info.',
        description: 'Returns user account information. For users with the Standard Registry role it also returns address book and VC document information.',
    })
    @ApiImplicitParam({
        name: 'username',
        type: String,
        description: 'The name of the user for whom to fetch the information',
        required: true,
        example: 'username'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ProfileDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async getProfile(
        @AuthUser() user: IAuthUser
    ): Promise<any> {
        const guardians = new Guardians();
        try {
            let didDocument: any = null;
            if (user.did) {
                const didDocuments = await guardians.getDidDocuments({ did: user.did });
                if (didDocuments) {
                    didDocument = didDocuments[didDocuments.length - 1];
                }
            }

            let vcDocument: any = null;
            if (user.did) {
                let vcDocuments = await guardians.getVcDocuments({
                    owner: user.did,
                    type: SchemaEntity.USER
                });
                if (vcDocuments && vcDocuments.length) {
                    vcDocument = vcDocuments[vcDocuments.length - 1];
                }
                vcDocuments = await guardians.getVcDocuments({
                    owner: user.did,
                    type: SchemaEntity.STANDARD_REGISTRY
                });
                if (vcDocuments && vcDocuments.length) {
                    vcDocument = vcDocuments[vcDocuments.length - 1];
                }
            }

            let topic: any;
            if (user.did || user.parent) {
                const filters = [];
                if (user.did) {
                    filters.push(user.did);
                }
                if (user.parent) {
                    filters.push(user.parent);
                }
                topic = await guardians.getTopic({
                    type: TopicType.UserTopic,
                    owner: { $in: filters }
                });
            }

            return {
                username: user.username,
                role: user.role,
                did: user.did,
                parent: user.parent,
                hederaAccountId: user.hederaAccountId,
                confirmed: !!(didDocument && didDocument.status === DidDocumentStatus.CREATE),
                failed: !!(didDocument && didDocument.status === DidDocumentStatus.FAILED),
                hederaAccountKey: null,
                topicId: topic?.topicId,
                parentTopicId: topic?.parent,
                didDocument,
                vcDocument
            };
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }

    /**
     * Update user profile
     */
    @Put('/:username')
    @Auth(
        UserRole.STANDARD_REGISTRY,
        UserRole.USER,
        UserRole.AUDITOR
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Sets Hedera credentials for the user.',
        description: 'Sets Hedera credentials for the user. For users with the Standard Registry role it also creates an address book.'
    })
    @ApiImplicitParam({
        name: 'username',
        type: String,
        description: 'The name of the user for whom to update the information.',
        required: true,
        example: 'username'
    })
    @ApiBody({
        description: 'Object that contains the Hedera account data.',
        required: true,
        type: CredentialsDTO
    })
    @ApiOkResponse({
        description: 'Created.',
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    async setUserProfile(
        @AuthUser() user: IAuthUser,
        @Body() profile: any
    ): Promise<any> {
        const username: string = user.username;
        const guardians = new Guardians();
        await guardians.createUserProfileCommon(username, profile);
        return;
    }

    /**
     * Update user profile (async)
     */
    @Put('/push/:username')
    @Auth(
        UserRole.STANDARD_REGISTRY,
        UserRole.USER,
        UserRole.AUDITOR
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Sets Hedera credentials for the user.',
        description: 'Sets Hedera credentials for the user. For users with the Standard Registry role it also creates an address book.'
    })
    @ApiImplicitParam({
        name: 'username',
        type: String,
        description: 'The name of the user for whom to update the information.',
        required: true,
        example: 'username'
    })
    @ApiBody({
        description: 'Object that contains the Hedera account data.',
        required: true,
        type: CredentialsDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async setUserProfileAsync(
        @AuthUser() user: IAuthUser,
        @Body() profile: any
    ): Promise<any> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.CONNECT_USER, user.id);
        const username: string = user.username;
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.createUserProfileCommonAsync(username, profile, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
        });
        return task;
    }

    /**
     * use cache 30s
     * Get user balance
     */
    @Get('/:username/balance')
    @Auth(
        UserRole.STANDARD_REGISTRY,
        UserRole.USER,
        UserRole.AUDITOR
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Returns user\'s Hedera account balance.',
        description: 'Requests Hedera account balance. Only users with the Installer role are allowed to make the request.'
    })
    @ApiImplicitParam({
        name: 'username',
        type: String,
        description: 'The name of the user for whom to fetch the balance.',
        required: true,
        example: 'username'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: String
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async getUserBalance(
        @AuthUser() user: IAuthUser,
        @Param('username') username: string
    ): Promise<any> {
        if (!user.did) {
            return null;
        }
        const guardians = new Guardians();
        const balance = await guardians.getUserBalance(username);
        if (isNaN(parseFloat(balance))) {
            throw new HttpException(balance, HttpStatus.UNPROCESSABLE_ENTITY);
        }
        //For backward compatibility
        return JSON.stringify(balance);
    }

    /**
     * Restore user profile
     */
    @Put('/restore/:username')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Restore user data (policy, DID documents, VC documents).',
        description: 'Restore user data (policy, DID documents, VC documents).'
    })
    @ApiImplicitParam({
        name: 'username',
        type: String,
        description: 'The name of the user for whom to restore the information.',
        required: true,
        example: 'username'
    })
    @ApiBody({
        description: 'Object that contains the Hedera account data.',
        required: true,
        type: CredentialsDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async restoreUserProfile(
        @AuthUser() user: IAuthUser,
        @Body() profile: any
    ): Promise<any> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.RESTORE_USER_PROFILE, user.id);
        const username: string = user.username;
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.restoreUserProfileCommonAsync(username, profile, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
        });
        return task;
    }

    /**
     * List of available recovery topics
     */
    @Put('/restore/topics/:username')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'List of available recovery topics.',
        description: 'List of available recovery topics.'
    })
    @ApiImplicitParam({
        name: 'username',
        type: String,
        description: 'The name of the user for whom to restore the information.',
        required: true,
        example: 'username'
    })
    @ApiBody({
        description: 'Object that contains the Hedera account data.',
        required: true,
        type: CredentialsDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async restoreTopic(
        @AuthUser() user: IAuthUser,
        @Body() profile: any
    ): Promise<any> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.GET_USER_TOPICS, user.id);
        const username: string = user.username;
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.getAllUserTopicsAsync(username, profile, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
        });
        return task;
    }

    /**
     * Validate DID document format.
     */
    @Post('/did-document/validate')
    @Auth(
        UserRole.STANDARD_REGISTRY,
        UserRole.USER
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Validate DID document format.',
        description: 'Validate DID document format.',
    })
    @ApiBody({
        description: 'DID Document.',
        required: true,
        type: DidDocumentDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: DidDocumentStatusDTO,
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async validateDidDocument(
        @AuthUser() user: IAuthUser,
        @Body() document: any
    ) {
        if (!document) {
            throw new HttpException('Body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const guardians = new Guardians();
            return await guardians.validateDidDocument(document);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Validate DID document keys.
     */
    @Post('/did-keys/validate')
    @Auth(
        UserRole.STANDARD_REGISTRY,
        UserRole.USER
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Validate DID document keys.',
        description: 'Validate DID document keys.',
    })
    @ApiBody({
        description: 'DID Document and keys.',
        required: true,
        type: DidDocumentWithKeyDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: DidKeyStatusDTO,
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async validateDidKeys(
        @AuthUser() user: IAuthUser,
        @Body() body: any
    ) {
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
            return await guardians.validateDidKeys(document, keys);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
