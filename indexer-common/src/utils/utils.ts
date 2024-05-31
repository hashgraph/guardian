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
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            // tslint:disable-next-line:no-bitwise
            const r = Math.random() * 16 | 0;
            // tslint:disable-next-line:no-bitwise
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        if (Number.isFinite(limit) && limit > 0) {
            return uuid.substring(limit);
        } else {
            return uuid;
        }
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