import { PinoLogger, RunFunctionAsync } from '@guardian/common';
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions, TaskAction } from '@guardian/interfaces';
import { InternalServerErrorDTO, RegisteredUsersDTO, TaskDTO } from '#middlewares';
import { Auth, AuthUser } from '#auth';
import { Guardians, InternalException, NewTask, ServiceError, TaskManager, Users } from '#helpers';

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
        type: RegisteredUsersDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(RegisteredUsersDTO, InternalServerErrorDTO)
    // @UseCache()
    @HttpCode(HttpStatus.OK)
    async registeredUsers(): Promise<RegisteredUsersDTO> {
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

            return demoUsers
        } catch (error) {
            await InternalException(error);
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
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async randomKey(
        @AuthUser() user: any
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            const role = user?.role;

            return await guardians.generateDemoKey(role, user.id.toString());
        } catch (error) {
            await InternalException(error);
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
    async pushRandomKey(
        @AuthUser() user: any
    ): Promise<NewTask> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.CREATE_RANDOM_KEY, user?.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.generateDemoKeyAsync(user?.role, task, user.id.toString());
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });
        return task;
    }
}
