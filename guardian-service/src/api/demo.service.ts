import { ApiResponse } from '../api/helpers/api-response.js';
import { DatabaseServer, MessageError, MessageResponse, PinoLogger, Policy, RunFunctionAsync, SecretManager, Workers } from '@guardian/common';
import { MessageAPI, WorkerTaskType } from '@guardian/interfaces';
import { emptyNotifier, initNotifier, INotifier } from '../helpers/notifier.js';

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
async function generateDemoKey(role: any, notifier: INotifier, userId: string): Promise<DemoKey> {
    notifier.start('Resolve settings');

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
    notifier.completedAndStart('Creating account in Hedera');

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

    notifier.completed();
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
                const result = await generateDemoKey(role, emptyNotifier(), null);
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
            const notifier = await initNotifier(task);

            RunFunctionAsync(async () => {
                const result = await generateDemoKey(role, notifier, null);
                notifier.result(result);
            }, async (error) => {
                await logger.error(error, ['GUARDIAN_SERVICE'], null);
                notifier.error(error);
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
