/**
 * Manager of IPFS communication tasks
 */
export class IPFSTaskManager {
    /**
     * Map of tasks
     */
    private static readonly tasks = {};

    /**
     * Add task
     * @param taskId
     * @param resolve
     * @param reject
     */
    public static AddTask(taskId: string, resolve: (value: any | PromiseLike<any>) => void, reject: (reason?: any) => void): void {
        IPFSTaskManager.tasks[taskId] = { resolve, reject };
    }

    /**
     * Resolve task promise
     * @param taskId
     * @param value
     */
    public static Resolve(taskId: string, value: any) {
        if (IPFSTaskManager.tasks[taskId]) {
            const { resolve } = IPFSTaskManager.tasks[taskId];
            resolve(value);

            delete IPFSTaskManager.tasks[taskId];
        }
    }

    /**
     * Reject task promise
     * @param taskId
     * @param reason
     */
    public static Reject(taskId: string, reason: any) {
        if (IPFSTaskManager.tasks[taskId]) {
            const { reject } = IPFSTaskManager.tasks[taskId];
            reject(reason);

            delete IPFSTaskManager.tasks[taskId];
        }
    }
}