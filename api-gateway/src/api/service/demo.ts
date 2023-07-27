import { Guardians } from '@helpers/guardians';
import { Users } from '@helpers/users';
import { Logger, RunFunctionAsync } from '@guardian/common';
import { TaskManager } from '@helpers/task-manager';
import { ServiceError } from '@helpers/service-requests-base';
import { Controller, Get, HttpCode, HttpStatus, Req, Response } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TaskAction } from '@guardian/interfaces';

@Controller('demo')
@ApiTags('demo')
export class DemoApi {

    /**
     * @deprecated 2023-03-01
     */
    @ApiOperation({
        deprecated: true
    })
    @Get('/registeredUsers')
    @HttpCode(HttpStatus.OK)
    async registeredUsers(@Req() req, @Response() res): Promise<any> {
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

            return res.json(demoUsers);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * @deprecated 2023-03-01
     */
    @ApiOperation({
        deprecated: true
    })
    @Get('/randomKey')
    @HttpCode(HttpStatus.OK)
    async randomKey(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            let role = null;
            try {
                const authHeader = req?.headers?.authorization;
                if (authHeader) {
                    const users = new Users();
                    const token = authHeader.split(' ')[1];
                    const user = await users.getUserByToken(token) as any;
                    role = user?.role;
                }
            } catch (error) {
                role = null;
            }
            const demoKey = await guardians.generateDemoKey(role);
            return demoKey;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * @deprecated 2023-03-01
     */
    @ApiOperation({
        deprecated: true
    })
    @Get('/push/randomKey')
    @HttpCode(HttpStatus.CREATED)
    async pushRandomKey(@Req() req, @Response() res): Promise<any> {
        const authHeader = req?.headers?.authorization;
        let user = null;
        if (authHeader) {
            try {
                const users = new Users();
                const token = authHeader.split(' ')[1];
                user = await users.getUserByToken(token) as any;
            } catch {
                user = null;
            }
        }
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.CREATE_RANDOM_KEY, user?.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.generateDemoKeyAsync(user?.role, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });

        return res.status(201).send(task);
    }

    @Get('/registered-users')
    @HttpCode(HttpStatus.OK)
    async registeredUsers2(@Req() req, @Response() res): Promise<any> {
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

            return res.json(demoUsers);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/random-key')
    @HttpCode(HttpStatus.OK)
    async randomKey2(@Req() req): Promise<any> {
        try {
            const guardians = new Guardians();
            let role = null;
            try {
                const authHeader = req?.headers?.authorization;
                if (authHeader) {
                    const users = new Users();
                    const token = authHeader.split(' ')[1];
                    const user = await users.getUserByToken(token) as any;
                    role = user?.role;
                }
            } catch (error) {
                role = null;
            }
            const demoKey = await guardians.generateDemoKey(role);
            return demoKey;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/push/random-key')
    @HttpCode(HttpStatus.ACCEPTED)
    async pushRandomKey2(@Req() req, @Response() res): Promise<any> {
        const taskManager = new TaskManager();
        const authHeader = req?.headers?.authorization;
        let user = null;
        if (authHeader) {
            try {
                const users = new Users();
                const token = authHeader.split(' ')[1];
                user = await users.getUserByToken(token) as any;
            } catch (error) {
                user = null;
            }
        }
        const task = taskManager.start(TaskAction.CREATE_RANDOM_KEY, user?.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.generateDemoKeyAsync(user?.role, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });

        return res.status(202).send(task);
    }

}
