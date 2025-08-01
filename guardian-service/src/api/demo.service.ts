import { ApiResponse } from '../api/helpers/api-response.js';
import { DatabaseServer, INotificationStep, MessageError, MessageResponse, NewNotifier, PinoLogger, Policy, RunFunctionAsync, SecretManager, Workers } from '@guardian/common';
import { MessageAPI, WorkerTaskType } from '@guardian/interfaces';

/**
 * Demo key
 */
interface DemoKey {
    /**
     * Demo account Id
     */
    id: string;
    /**
     * Demo private key
     */
    key: string;
}

/**
 * Create demo key
 * @param role
 * @param notifier
 * @param userId
 */
async function generateDemoKey(
    role: any,
    notifier: INotificationStep,
    userId: string
): Promise<DemoKey> {
    // <-- Steps
    const STEP_RESOLVE_SETTINGS = 'Resolve settings';
    const STEP_CREATE_ACCOUNT = 'Creating account in Hedera';
    // Steps -->

    notifier.addStep(STEP_RESOLVE_SETTINGS);
    notifier.addStep(STEP_CREATE_ACCOUNT);
    notifier.start();

    notifier.startStep(STEP_RESOLVE_SETTINGS);
    const secretManager = SecretManager.New();
    const { OPERATOR_ID, OPERATOR_KEY } = await secretManager.getSecrets('keys/operator');
    let initialBalance: number = null;
    try {
        if (role === 'STANDARD_REGISTRY') {
            initialBalance = parseInt(process.env.INITIAL_STANDARD_REGISTRY_BALANCE, 10);
        } else {
            initialBalance = parseInt(process.env.INITIAL_BALANCE, 10);
        }
    } catch (error) {
        initialBalance = null;
    }
    notifier.completeStep(STEP_RESOLVE_SETTINGS);

    notifier.startStep(STEP_CREATE_ACCOUNT);
    const workers = new Workers();
    const result = await workers.addNonRetryableTask({
        type: WorkerTaskType.CREATE_ACCOUNT,
        data: {
            operatorId: OPERATOR_ID,
            operatorKey: OPERATOR_KEY,
            initialBalance,
            payload: { userId }
        }
    }, {
        priority: 20,
        attempts: 0,
        userId,
        interception: userId,
        registerCallback: true
    });
    notifier.completeStep(STEP_CREATE_ACCOUNT);

    notifier.complete();
    return result;
}

/**
 * Demo API
 * @param dataBaseServer
 * @param logger
 */
export async function demoAPI(
    dataBaseServer: DatabaseServer,
    logger: PinoLogger
): Promise<void> {
    ApiResponse(MessageAPI.GENERATE_DEMO_KEY,
        async (msg: {
            role: string
        }) => {
            try {
                const role = msg?.role;
                const result = await generateDemoKey(role, NewNotifier.empty(), null);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], null);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.GENERATE_DEMO_KEY_ASYNC,
        async (msg: {
            role: string,
            task: any
        }) => {
            const { role, task } = msg;
            const notifier = await NewNotifier.create(task);

            RunFunctionAsync(async () => {
                const result = await generateDemoKey(role, notifier, null);
                notifier.result(result);
            }, async (error) => {
                await logger.error(error, ['GUARDIAN_SERVICE'], null);
                notifier.fail(error);
            });

            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.GET_USER_ROLES,
        async (msg: {
            did: string
        }) => {
            try {
                const did = msg.did;
                const policies = await dataBaseServer.findAll(Policy);
                const result = [];
                for (const p of policies) {
                    const roles = await DatabaseServer.getUserRole(p.id.toString(), did);
                    const role = roles.map(g => g.role).join(', ');
                    if (role) {
                        result.push({
                            name: p.name,
                            version: p.version,
                            role
                        })
                    }
                };
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], null);
                return new MessageError(error);
            }
        })
}
