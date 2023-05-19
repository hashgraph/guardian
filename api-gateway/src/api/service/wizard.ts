import { Guardians } from '@helpers/guardians';
import { NextFunction, Response, Router } from 'express';
import { UserRole } from '@guardian/interfaces';
import { permissionHelper } from '@auth/authorization-helper';
import {
    AuthenticatedRequest,
    Logger,
    RunFunctionAsync,
} from '@guardian/common';
import { TaskManager } from '@helpers/task-manager';
import { ServiceError } from '@helpers/service-requests-base';

/**
 * Wizard route
 */
export const wizardAPI = Router();

wizardAPI.post(
    '/policy',
    permissionHelper(UserRole.STANDARD_REGISTRY),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const wizardConfig = req.body;
            const user = req.user;
            const guardians = new Guardians();
            res.status(201).json(
                await guardians.wizardPolicyCreate(wizardConfig, user.did)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            return next(error);
        }
    }
);

wizardAPI.post(
    '/policy/push',
    permissionHelper(UserRole.STANDARD_REGISTRY),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
        res.status(202).send({ taskId, expectation });
    }
);

wizardAPI.post(
    '/:policyId/config',
    permissionHelper(UserRole.STANDARD_REGISTRY),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const wizardConfig = req.body;
            const user = req.user;
            const { policyId } = req.params;
            const guardians = new Guardians();
            res.json(
                await guardians.wizardGetPolicyConfig(
                    policyId,
                    wizardConfig,
                    user.did
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            return next(error);
        }
    }
);
