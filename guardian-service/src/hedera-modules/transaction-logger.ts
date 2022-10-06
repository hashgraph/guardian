import { WorkerTaskType } from '@guardian/interfaces';
import { Workers } from '@helpers/workers';
import { Logger, MessageResponse, SettingsContainer } from '@guardian/common';
import { DatabaseServer } from '@database-modules';

/**
 * Transaction log level
 */
export enum TransactionLogLvl {
    NONE = '0',
    TRANSACTION = '1',
    DEBUG = '2'
}

/**
 * Transaction logger
 */
export class TransactionLogger {
    /**
     * Log level
     * @private
     */
    private static logLvl: TransactionLogLvl = TransactionLogLvl.NONE;
    /**
     * Callback
     * @private
     */
    private static fn: Function = null;

    /**
     * Callback
     * @private
     */
    private static virtualFileCallback: Function = null;

    /**
     * Callback
     * @private
     */
    private static virtualTransactionCallback: Function = null;

    /**
     * Time map
     * @private
     */
    private static readonly map = {};

    /**
     * Set log level
     * @param lvl
     */
    public static setLogLevel(lvl: TransactionLogLvl): void {
        TransactionLogger.logLvl = lvl || TransactionLogLvl.NONE;
    }

    /**
     * Set log function
     * @param fn
     */
    public static setLogFunction(fn: Function): void {
        TransactionLogger.fn = fn;
    }

    /**
     * Set virtual file function
     * @param fn
     */
    public static setVirtualFileFunction(fn: Function): void {
        TransactionLogger.virtualFileCallback = fn;
    }

    /**
     * Set virtual transaction function
     * @param fn
     */
    public static setVirtualTransactionFunction(fn: Function): void {
        TransactionLogger.virtualTransactionCallback = fn;
    }

    /**
     * Create log message
     * @param types
     * @param duration
     * @param name
     * @param attr
     * @private
     */
    private static log(types: string[], duration: number, name: string, attr?: string[]) {
        const date = (new Date()).toISOString();
        const d = duration ? `${(duration / 1000)}s` : '_';
        const attribute = attr || [];
        if (TransactionLogger.fn) {
            TransactionLogger.fn(types, date, d, name, attribute);
        }
    }

    /**
     * Message log
     * @param id
     * @param name
     */
    public static async messageLog(id: string, name: string): Promise<void> {
        try {
            if (TransactionLogger.logLvl === TransactionLogLvl.NONE) {
                return;
            }
            const time = Date.now();
            const start = TransactionLogger.map[id];
            TransactionLogger.map[id] = time;

            if (start) {
                const duration = time - start;
                TransactionLogger.log(['MESSAGE', 'COMPLETION'], duration, name, [id]);
            } else {
                TransactionLogger.log(['MESSAGE', 'SEND'], null, name, [id]);
            }
        } catch (error) {
            TransactionLogger.log(['MESSAGE', 'ERROR'], null, name, [id, error.message]);
        }
    }

    /**
     * Transaction log
     * @param id
     * @param operatorAccountId
     * @param transactionName
     * @param completed
     * @param metadata
     */
    public static async transactionLog(
        id: string,
        operatorAccountId: string,
        transactionName: string,
        completed: boolean = false,
        metadata: string = ''
    ): Promise<void> {
        try {
            if (TransactionLogger.logLvl === TransactionLogLvl.NONE) {
                return;
            }
            const time = Date.now();
            const start = TransactionLogger.map[id];
            TransactionLogger.map[id] = time;

            const account = operatorAccountId.toString();
            const attr = [id, account, metadata];

            if (TransactionLogger.logLvl === TransactionLogLvl.DEBUG) {
                try {
                    const settingsContainer = new SettingsContainer();
                    const { OPERATOR_ID, OPERATOR_KEY } = settingsContainer.settings;
                    const workers = new Workers();
                    const balance = await workers.addTask({
                        type: WorkerTaskType.GET_USER_BALANCE,
                        data: {
                            hederaAccountId: OPERATOR_ID,
                            hederaAccountKey: OPERATOR_KEY
                        }
                    }, 1);
                    attr.push(balance);
                } catch (error) {
                    attr.push(null);
                }
            }

            if (completed) {
                const duration = time - start;
                TransactionLogger.log(['TRANSACTION', 'COMPLETION'], duration, transactionName, attr);
            } else {
                TransactionLogger.log(['TRANSACTION', 'CREATE'], null, transactionName, attr);
            }
        } catch (error) {
            TransactionLogger.log(['TRANSACTION', 'ERROR'], null, transactionName, [id, error.message]);
        }
    }

    /**
     * Transaction error log
     * @param id
     * @param operatorAccountId
     * @param transactionName
     * @param transaction
     * @param message
     */
    public static async transactionErrorLog(
        id: string,
        operatorAccountId: string,
        transactionName: string,
        message: string
    ): Promise<void> {
        try {
            const account = operatorAccountId.toString();
            const attr = [id, account, message];
            TransactionLogger.log(['TRANSACTION', 'ERROR'], null, transactionName, attr);
        } catch (error) {
            TransactionLogger.log(['TRANSACTION', 'ERROR'], null, transactionName, [error.message]);
        }
    }

    /**
     * Save virtual file log
     * @param id
     * @param file
     */
    public static async virtualFileLog(id: string, file: ArrayBuffer, url: any): Promise<void> {
        const date = (new Date()).toISOString();
        if (TransactionLogger.virtualFileCallback) {
            TransactionLogger.virtualFileCallback(date, id, file, url);
        }
    }

    /**
     * Save virtual transaction log
     * @param id
     * @param type
     * @param operatorId
     */
    public static async virtualTransactionLog(id: string, type: string, operatorId?: string): Promise<void> {
        const date = (new Date()).toISOString();
        if (TransactionLogger.virtualTransactionCallback) {
            TransactionLogger.virtualTransactionCallback(date, id, type, operatorId);
        }
    }

    /**
     * Worker Subscribe
     * @param channel
     */
    public static workerSubscribe(channel: any): void {
        channel.response('guardians.transaction-log-event', async (data: any) => {
            setImmediate(async () => {
                switch (data.type) {
                    case 'start-log': {
                        const { id, operatorAccountId, transactionName } = data.data;
                        await TransactionLogger.transactionLog(id, operatorAccountId, transactionName);
                        break;
                    }

                    case 'end-log': {
                        const { id, operatorAccountId, transactionName } = data.data;
                        const metadata = data.metadata;
                        await TransactionLogger.transactionLog(id, operatorAccountId, transactionName, true, metadata);
                        break;
                    }

                    case 'error-log': {
                        const { id, operatorAccountId, transactionName } = data.data;
                        const error = data.error;

                        await TransactionLogger.transactionErrorLog(id, operatorAccountId, transactionName, error);
                        break;
                    }

                    case 'virtual-function-log': {
                        const { id, operatorAccountId, transactionName } = data.data;

                        await TransactionLogger.virtualTransactionLog(id, transactionName, operatorAccountId);
                        break;
                    }

                    default:
                        throw new Error('Unknown transaction log event type');
                }
            })

            return new MessageResponse({});
        });
    }

    /**
     * Init logger
     * @param channel
     */
    public static init(channel: any, lvl: TransactionLogLvl): void {
        TransactionLogger.setLogLevel(lvl);
        TransactionLogger.setLogFunction((types: string[], date: string, duration: string, name: string, attr?: string[]) => {
            const log = new Logger();
            const attributes = [
                ...types,
                date,
                duration,
                name,
                ...attr
            ]
            if (types[1] === 'ERROR') {
                log.error(name, attributes, 4);
            } else {
                log.info(name, attributes, 4);
            }
        });
        TransactionLogger.setVirtualFileFunction(async (date: string, id: string, file: ArrayBuffer, url: any) => {
            await DatabaseServer.setVirtualFile(id, file, url);
        });
        TransactionLogger.setVirtualTransactionFunction(async (date: string, id: string, type: string, operatorId?: string) => {
            await DatabaseServer.setVirtualTransaction(id, type, operatorId);
        });
        TransactionLogger.workerSubscribe(channel);
    }
}
