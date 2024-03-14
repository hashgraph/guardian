import { Guardians } from '@helpers/guardians.js';
import { Users } from '@helpers/users.js';
import { Logger, RunFunctionAsync } from '@guardian/common';
import { TaskManager } from '@helpers/task-manager.js';
import { ServiceError } from '@helpers/service-requests-base.js';
import { Controller, Get, HttpCode, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { TaskAction, UserRole } from '@guardian/interfaces';
import { RegisteredUsersDTO } from '@middlewares/validation/schemas';
import { AuthUser } from '@auth/authorization-helper.js';
import { Auth } from '@auth/auth.decorator.js';

@Controller('demo')
@ApiTags('demo')
export class DemoApi {
    @ApiOperation({
        summary: 'Returns list of registered users.',
        description: 'Returns list of registered users.',
    })
    // @ApiExtraModels(AccountsSessionResponseDTO, InternalServerErrorDTO)
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(RegisteredUsersDTO),
        },
    })
    @Get('/registered-users')
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
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/random-key')
    @Auth(
        UserRole.STANDARD_REGISTRY,
        UserRole.USER,
        UserRole.AUDITOR
    )
    @HttpCode(HttpStatus.OK)
    async randomKey(@AuthUser() user: any): Promise<any> {
        try {
            const guardians = new Guardians();
            const role = user?.role;

            return await guardians.generateDemoKey(role);
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
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

    @Get('/push/random-key')
    @Auth(
        UserRole.STANDARD_REGISTRY,
        UserRole.USER,
        UserRole.AUDITOR
    )
    @HttpCode(HttpStatus.ACCEPTED)
    async pushRandomKey(@AuthUser() user: any): Promise<any> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.CREATE_RANDOM_KEY, user?.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.generateDemoKeyAsync(user?.role, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });

        return task;
    }

}
