import { ICompareOptions } from '../interfaces/compare-options.interface';
import { IRate } from '../interfaces/rate.interface';
import { Status } from '../types/status.type';

export class PermissionsRate implements IRate<string> {
    public readonly left: string;
    public readonly right: string;

    public type: Status;
    public totalRate: number;

    constructor(permission1: string, permission2: string) {
        this.type = Status.NONE;
        this.left = permission1;
        this.right = permission2;
        if (permission1 === permission2) {
            this.totalRate = 100;
            this.type = Status.FULL;
        } else {
            if (permission1) {
                this.type = Status.LEFT;
            } else {
                this.type = Status.RIGHT;
            }
            this.totalRate = -1;
        }
    }

    public getChildren<T extends IRate<any>>(): T[] {
        return [];
    }

    public getSubRate(name: string): IRate<any>[] {
        return null;
    }

    public calc(options: ICompareOptions): void {
        return;
    }

    public toObject(): any {
        return {
            type: this.type,
            totalRate: this.totalRate,
            items: [this.left, this.right]
        }
    }

    public getRateValue(name: string): number {
        return this.totalRate;
    }

    public total(): number {
        return this.totalRate;
    }
}