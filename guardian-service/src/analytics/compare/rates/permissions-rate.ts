import { IRate } from "../interfaces/rate.interface";
import { Status } from "../types/status.type";


export class PermissionsRate implements IRate<string> {
    public items: string[];
    public type: Status;
    public totalRate: number;

    constructor(permission1: string, permission2: string) {
        this.items = [permission1, permission2];
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
}
