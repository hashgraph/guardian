import { GenerateUUIDv4, WorkerTaskType } from '@guardian/interfaces';
import { DatabaseServer } from '../database-modules/index.js';
import { PinoLogger, RunFunctionAsync, Workers } from '../helpers/index.js';
import { MessageResponse } from '../models/index.js';
import { Singleton } from '../decorators/singleton.js';
import { NatsService } from '../mq/index.js';
import { SecretManager } from '../secret-manager/index.js';

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
@Singleton
export class TransactionLogger extends NatsService {
    /**
     * Message queue name
     */
    public messageQueueName = 'transaction-logs-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = this.messageQueueName + `-${GenerateUUIDv4()}`;

    /**
     * Log level
     * @private
     */
    private logLvl: TransactionLogLvl = TransactionLogLvl.NONE;
    /**
     * Callback
     * @private
     */
    private fn: Function = null;

    /**
     * Callback
     * @private
     */
    private virtualFileCallback: Function = null;

    /**
     * Callback
     * @private
     */
    private virtualTransactionCallback: Function = null;

    /**
     * Time map
     * @private
     */
    private readonly map = {};

    /**
     * Set log level
     * @param lvl
     */
    public setLogLevel(lvl: TransactionLogLvl): void {
        this.logLvl = lvl || TransactionLogLvl.NONE;
    }

    /**
     * Set log function
     * @param fn
     */
    public setLogFunction(fn: Function): void {
        this.fn = fn;
    }

    /**
     * Set virtual file function
     * @param fn
     */
    public setVirtualFileFunction(fn: Function): void {
        this.virtualFileCallback = fn;
    }

    /**
     * Set virtual transaction function
     * @param fn
     */
    public setVirtualTransactionFunction(fn: Function): void {
        this.virtualTransactionCallback = fn;
    }

    /**
     * Create log message
     * @param types
     * @param duration
     * @param name
     * @param attr
     * @param userId
     * @private
     */
    private log(types: string[], duration: number, name: string, attr?: string[], userId?: string | null) {
        const date = (new Date()).toISOString();
        const d = duration ? `${(duration / 1000)}s` : '_';
        const attribute = attr || [];
        if (this.fn) {
            this.fn(types, date, d, name, attribute, userId);
        }
    }

    /**
     * Message log
     * @param id
     * @param name
     * @param userId
     */
    public async messageLog(id: string, name: string, userId: string | null): Promise<void> {
        try {
            if (this.logLvl === TransactionLogLvl.NONE) {
                return;
            }
            const time = Date.now();
            const start = this.map[id];
            this.map[id] = time;

            if (start) {
                const duration = time - start;
                this.log(['MESSAGE', 'COMPLETION'], duration, name, [id], userId);
            } else {
                this.log(['MESSAGE', 'SEND'], null, name, [id], userId);
            }
        } catch (error) {
            this.log(['MESSAGE', 'ERROR'], null, name, [id, error.message], userId);
        } finally {
            delete this.map[id]
        }
    }

    /**
     * Transaction log
     * @param id
     * @param operatorAccountId
     * @param network
     * @param transactionName
     * @param completed
     * @param metadata
     * @param userId
     */
    public async transactionLog(
        id: string,
        operatorAccountId: string,
        network: string,
        transactionName: string,
        completed: boolean = false,
        metadata: string = '',
        userId: string | null
    ): Promise<void> {
        try {
            if (this.logLvl === TransactionLogLvl.NONE) {
                return;
            }
            const time = Date.now();
            const start = this.map[id];
            this.map[id] = time;

            const account = operatorAccountId.toString();
            const attr = [id, account, network, metadata];

            if (this.logLvl === TransactionLogLvl.DEBUG) {
                try {
                    const secretManager = SecretManager.New();
                    const { OPERATOR_ID, OPERATOR_KEY } = await secretManager.getSecrets('keys/operator');
                    const workers = new Workers();
                    const balance = await workers.addNonRetryableTask({
                        type: WorkerTaskType.GET_USER_BALANCE,
                        data: {
                            hederaAccountId: OPERATOR_ID,
                            hederaAccountKey: OPERATOR_KEY,
                            payload: { userId }
                        }
                    }, {
                        priority: 20
                    });
                    attr.push(balance);
                } catch (error) {
                    attr.push(null);
                }
            }

            if (completed) {
                const duration = time - start;
                this.log(['TRANSACTION', 'COMPLETION'], duration, transactionName, attr, userId);
            } else {
                this.log(['TRANSACTION', 'CREATE'], null, transactionName, attr, userId);
            }
        } catch (error) {
            this.log(['TRANSACTION', 'ERROR'], null, transactionName, [id, error.message], userId);
        } finally {
            delete this.map[id]
        }
    }

    /**
     * Transaction error log
     * @param id
     * @param operatorAccountId
     * @param network
     * @param transactionName
     * @param message
     * @param userId
     */
    public async transactionErrorLog(
        id: string,
        operatorAccountId: string,
        network: string,
        transactionName: string,
        message: string,
        userId: string | null
    ): Promise<void> {
        try {
            const account = operatorAccountId.toString();
            const attr = [id, account, network, message];
            this.log(['TRANSACTION', 'ERROR'], null, transactionName, attr, userId);
        } catch (error) {
            this.log(['TRANSACTION', 'ERROR'], null, transactionName, [error.message], userId);
        }
    }

    /**
     * Save virtual file log
     * @param id
     * @param file
     */
    public async virtualFileLog(id: string, file: Buffer, url: any): Promise<void> {
        const date = (new Date()).toISOString();
        if (this.virtualFileCallback) {
            this.virtualFileCallback(date, id, file, url);
        }
    }

    /**
     * Save virtual transaction log
     * @param id
     * @param type
     * @param operatorId
     */
    public async virtualTransactionLog(id: string, type: string, operatorId?: string): Promise<void> {
        const date = (new Date()).toISOString();
        if (this.virtualTransactionCallback) {
            this.virtualTransactionCallback(date, id, type, operatorId);
        }
    }

    /**
     * Worker Subscribe
     * @param channel
     */
    public workerSubscribe(): void {
        this.getMessages('guardians.transaction-log-event', async (data: any) => {
            RunFunctionAsync(async () => {
                switch (data.type) {
                    case 'start-log': {
                        const { id, operatorAccountId, transactionName, network, payload: { userId } } = data.data;
                        await this.transactionLog(id, operatorAccountId, network, transactionName, null, null, userId);
                        break;
                    }

                    case 'end-log': {
                        const { id, operatorAccountId, transactionName, network, payload: { userId } } = data.data;
                        const metadata = data.metadata;
                        await this.transactionLog(id, operatorAccountId, network, transactionName, true, metadata, userId);
                        break;
                    }

                    case 'error-log': {
                        const { id, operatorAccountId, transactionName, network, payload: { userId } } = data.data;
                        const error = data.error;
                        await this.transactionErrorLog(id, operatorAccountId, network, transactionName, error, userId);
                        break;
                    }

                    case 'virtual-function-log': {
                        const { id, operatorAccountId, transactionName } = data.data;

                        await this.virtualTransactionLog(id, transactionName, operatorAccountId);
                        break;
                    }

                    default:
                        throw new Error('Unknown transaction log event type');
                }
            })

            return new MessageResponse({});
        }, true);
    }

    /**
     * Init logger
     * @param channel
     */
    public async initialization(channel: any, lvl: TransactionLogLvl): Promise<void> {
        await super.setConnection(channel).init();
        this.setLogLevel(lvl);
        this.setLogFunction((types: string[], date: string, duration: string, name: string, attr?: string[], userId?: string | null) => {
            const log = new PinoLogger();
            const attributes = [
                ...types,
                date,
                duration,
                name,
                ...attr
            ]
            if (types[1] === 'ERROR') {
                log.error(name, attributes, userId);
            } else {
                log.info(name, attributes, userId);
            }
        });
        this.setVirtualFileFunction(async (date: string, id: string, file: ArrayBuffer, url: any) => {
            await DatabaseServer.setVirtualFile(id, file, url);
        });
        this.setVirtualTransactionFunction(async (date: string, id: string, type: string, operatorId?: string) => {
            await DatabaseServer.setVirtualTransaction(id, type, operatorId);
        });
        this.workerSubscribe();
    }
}
