export class IPFSTaskManager {
    private static readonly tasks = {};

    public static AddTask(taskId: string, resolve: (value: any | PromiseLike<any>) => void, reject: (reason?: any) => void): void {
        IPFSTaskManager.tasks[taskId] = { resolve, reject };
    }

    public static Resolve(taskId: string, value: any) {
        if (IPFSTaskManager.tasks[taskId]) {
            const { resolve, _ } = IPFSTaskManager.tasks[taskId];
            resolve(value);

            delete IPFSTaskManager.tasks[taskId];
        }
    }

    public static Reject(taskId: string, reason: any) {
        if (IPFSTaskManager.tasks[taskId]) {
            const { _, reject } = IPFSTaskManager.tasks[taskId];
            reject(reason);

            delete IPFSTaskManager.tasks[taskId];
        }
    }
}