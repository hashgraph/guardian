import { Guardians } from '@helpers/guardians';
import { Logger, RunFunctionAsync, } from '@guardian/common';
import { TaskManager } from '@helpers/task-manager';
import { ServiceError } from '@helpers/service-requests-base';
import { Controller, HttpCode, HttpStatus, Post, Req, Response } from '@nestjs/common';
import { checkPermission } from '@auth/authorization-helper';
import { UserRole } from '@guardian/interfaces';

@Controller('wizard')
export class WizardApi {
    @Post('/policy')
    @HttpCode(HttpStatus.CREATED)
    async setPolicy(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const wizardConfig = req.body;
            const user = req.user;
            const guardians = new Guardians();
            return res.status(201).json(
                await guardians.wizardPolicyCreate(wizardConfig, user.did)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/policy/push')
    @HttpCode(HttpStatus.ACCEPTED)
    async setPolicyAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const taskManager = new TaskManager();
        const { taskId, expectation } = taskManager.start('Create policy');
        const wizardConfig = req.body;
        const user = req.user;
        RunFunctionAsync<ServiceError>(
            async () => {
                const guardians = new Guardians();
                await guardians.wizardPolicyCreateAsync(
                    wizardConfig,
                    user.did,
                    taskId
                );
            },
            async (error) => {
                new Logger().error(error, ['API_GATEWAY']);
                taskManager.addError(taskId, {
                    code: 500,
                    message: error.message,
                });
            }
        );
        return res.status(202).send({ taskId, expectation });
    }

    @Post('/:policyId/config')
    @HttpCode(HttpStatus.OK)
    async setPolicyConfig(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const wizardConfig = req.body;
            const user = req.user;
            const { policyId } = req.params;
            const guardians = new Guardians();
            return res.json(
                await guardians.wizardGetPolicyConfig(
                    policyId,
                    wizardConfig,
                    user.did
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }
}
