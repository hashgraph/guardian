import { PinoLogger, RunFunctionAsync } from '@guardian/common';
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiAcceptedResponse, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions, TaskAction } from '@guardian/interfaces';
import { DemoKeyResponseDTO, DemoTaskResponseDTO, InternalServerErrorDTO, ObjectExamples, PolicyRoleDTO, RegisteredUserDTO } from '#middlewares';
import { Auth, AuthUser } from '#auth';
import { Guardians, InternalException, ServiceError, TaskManager, Users } from '#helpers';

@Controller('demo')
@ApiTags('demo')
export class DemoApi {
    constructor(private readonly logger: PinoLogger) {
    }

    /**
     * Returns list of registered users
     */
    @Get('/registered-users')
    @ApiOperation({
        summary: 'Returns list of registered users.',
        description: 'Returns list of registered users.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: [RegisteredUserDTO],
        example: ObjectExamples.REGISTERED_USERS_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyRoleDTO)
    @HttpCode(HttpStatus.OK)
    async registeredUsers(): Promise<RegisteredUserDTO[]> {
        const users = new Users();
        const guardians = new Guardians();
        try {
            const demoUsers: any = await users.getAllUserAccountsDemo();

            for (const element of demoUsers) {
                if (element.did) {
                    element.policyRoles = await guardians.getUserRoles(element.did);
                } else {
                    element.policyRoles = [];
                }
            }

            return demoUsers;
        } catch (error) {
            await InternalException(error, this.logger, null);
        }
    }

    /**
     * Generate demo key
     */
    @Get('/random-key')
    @Auth(
        Permissions.DEMO_KEY_CREATE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
        // UserRole.AUDITOR
    )
    @ApiOperation({
        summary: 'Generate demo key.',
        description: 'Generate demo key.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: DemoKeyResponseDTO,
        example: ObjectExamples.DEMO_KEY_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    async randomKey(
        @AuthUser() user: any
    ): Promise<DemoKeyResponseDTO> {
        try {
            const guardians = new Guardians();
            const role = user?.role;

            return await guardians.generateDemoKey(role, user.id.toString());
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
        // try {
        //     const guardians = new Guardians();
        //     let role = null;
        //     try {
        //         const authHeader = req?.headers?.authorization;
        //         if (authHeader) {
        //             const users = new Users();
        //             const token = authHeader.split(' ')[1];
        //             const user = await users.getUserByToken(token) as any;
        //             role = user?.role;
        //         }
        //     } catch (error) {
        //         role = null;
        //     }
        //     const demoKey = await guardians.generateDemoKey(role);
        //     return demoKey;
        // } catch (error) {
        //     new Logger().error(error, ['API_GATEWAY']);
        //     throw error;
        // }
    }

    /**
     * Generate demo key (async)
     */
    @Get('/push/random-key')
    @Auth(
        Permissions.DEMO_KEY_CREATE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
        // UserRole.AUDITOR
    )
    @ApiOperation({
        summary: 'Generate demo key.',
        description: 'Generate demo key.',
    })
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        type: DemoTaskResponseDTO,
        example: ObjectExamples.PUSH_RANDOM_KEY_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async pushRandomKey(
        @AuthUser() user: any
    ): Promise<DemoTaskResponseDTO> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.CREATE_RANDOM_KEY, user?.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.generateDemoKeyAsync(user?.role, task, user.id.toString());
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });
        return task;
    }
}
