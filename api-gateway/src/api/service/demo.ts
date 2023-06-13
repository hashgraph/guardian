import { Guardians } from '@helpers/guardians';
import { Users } from '@helpers/users';
import { Logger, RunFunctionAsync } from '@guardian/common';
import { TaskManager } from '@helpers/task-manager';
import { ServiceError } from '@helpers/service-requests-base';
import { Controller, Get, HttpCode, HttpStatus, Req, Response } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller('demo')
@ApiTags('demo')
export class DemoApi {

    /**
     * @deprecated 2023-03-01
     */
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
    @Get('/push/randomKey')
    @HttpCode(HttpStatus.CREATED)
    async pushRandomKey(@Req() req, @Response() res): Promise<any> {
        const taskManager = new TaskManager();
        const { taskId, expectation } = taskManager.start('Create random key');

        const authHeader = req?.headers?.authorization;
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            let role = null;
            if (authHeader) {
                try {
                    const users = new Users();
                    const token = authHeader.split(' ')[1];
                    const user = await users.getUserByToken(token) as any;
                    role = user?.role;
                } catch (error) {
                    role = null;
                }
            }

            await guardians.generateDemoKeyAsync(role, taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: 500, message: error.message });
        });

        return res.status(201).send({ taskId, expectation });
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
        const { taskId, expectation } = taskManager.start('Create random key');

        const authHeader = req?.headers?.authorization;
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            let role = null;
            if (authHeader) {
                try {
                    const users = new Users();
                    const token = authHeader.split(' ')[1];
                    const user = await users.getUserByToken(token) as any;
                    role = user?.role;
                } catch (error) {
                    role = null;
                }
            }

            await guardians.generateDemoKeyAsync(role, taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: 500, message: error.message });
        });

        return res.status(202).send({ taskId, expectation });
    }

}
