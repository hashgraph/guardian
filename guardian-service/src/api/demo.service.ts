import { ApiResponse } from '@api/helpers/api-response';
import {
    DataBaseHelper,
    Logger,
    MessageError,
    MessageResponse, RunFunctionAsync,
    Policy,
    Settings,
    DatabaseServer,
    Workers,
    SecretManager
} from '@guardian/common';
import { MessageAPI, WorkerTaskType } from '@guardian/interfaces';
import { emptyNotifier, initNotifier, INotifier } from '@helpers/notifier';

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
 * @param settingsRepository
 * @param notifier
 */
async function generateDemoKey(role: any, settingsRepository: DataBaseHelper<Settings>, notifier: INotifier): Promise<DemoKey> {
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
        type: WorkerTaskType.GENERATE_DEMO_KEY,
        data: {
            operatorId: OPERATOR_ID,
            operatorKey: OPERATOR_KEY,
            initialBalance
        }
    }, 20);

    notifier.completed();
    return result;
}

/**
 * Demo API
 * @param channel
 * @param settingsRepository
 */
export async function demoAPI(
    settingsRepository: DataBaseHelper<Settings>
): Promise<void> {
    ApiResponse(MessageAPI.GENERATE_DEMO_KEY, async (msg) => {
        try {
            const role = msg?.role;
            const result = await generateDemoKey(role, settingsRepository, emptyNotifier());
            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.GENERATE_DEMO_KEY_ASYNC, async (msg) => {
        const { role, taskId } = msg;
        const notifier = initNotifier(taskId);

        RunFunctionAsync(async () => {
            const result = await generateDemoKey(role, settingsRepository, emptyNotifier());
            notifier.result(result);
        }, async (error) => {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            notifier.error(error);
        });

        return new MessageResponse({ taskId });
    });

    ApiResponse(MessageAPI.GET_USER_ROLES, async (msg) => {
        try {
            const did = msg.did;
            const policies = await new DataBaseHelper(Policy).findAll();
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
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    })
}
