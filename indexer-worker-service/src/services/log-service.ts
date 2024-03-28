import { DataBaseHelper, Logs } from '@indexer/common';

export class LogService {
    private static readonly _debugMap: Map<string, number> = new Map<string, number>();

    private static debugLog(message: string, tag: string) {
        const key = tag + ': ' + (message.startsWith('E11000') ? 'E11000' : message);
        let index: number = 1;
        if (LogService._debugMap.has(key)) {
            index = LogService._debugMap.get(key) + 1;
        }
        LogService._debugMap.set(key, index);
        console.log(LogService._debugMap);
    }

    public static async error(error: Error | string, tag: string): Promise<boolean> {
        let message: string;
        if (typeof error === 'string') {
            message = error || '';
        } else if (error && typeof error === 'object') {
            message = error.message || '';
        } else {
            message = 'Unknown error';
        }

        LogService.debugLog(message, tag);

        if (message.startsWith('E11000')) {
            return true;
        }

        const em = DataBaseHelper.getEntityManager();
        const row = em.create(Logs, { error: message, tag });
        await em.persistAndFlush(row);
        return false;
    }
}
