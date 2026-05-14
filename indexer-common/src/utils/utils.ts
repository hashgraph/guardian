import { FormulaEngine } from '@indexer/interfaces';

export class Utils {
    public static async wait(delay: number) {
        return new Promise<void>(resolve => {
            setTimeout(resolve, delay);
        });
    }

    public static isTopic(topicId: string): boolean {
        if (!topicId || topicId.length > 14) {
            return false;
        }
        return /^(\d+)(?:\.(\d+)\.([a-fA-F0-9]+))?(?:-([a-z]{5}))?$/.exec(topicId) !== null;
    }

    public static isToken(tokenId: string): boolean {
        if (!tokenId || tokenId.length > 14) {
            return false;
        }
        return /^(\d+)(?:\.(\d+)\.([a-fA-F0-9]+))?(?:-([a-z]{5}))?$/.exec(tokenId) !== null;
    }

    public static GenerateUUIDv4(limit?: number): string {
        const uuid = FormulaEngine.GenerateUUIDv4();
        if (Number.isFinite(limit) && (limit as number) > 0) {
            return uuid.substring(limit as number);
        }
        return uuid;
    }

    public static getIntParm(param: string, defaultValue: number): number {
        try {
            if (param) {
                return parseInt(param, 10);
            } else {
                return defaultValue;
            }
        } catch (error) {
            console.log(`Faled pars params: ${param}`);
            return defaultValue;
        }
    }
}