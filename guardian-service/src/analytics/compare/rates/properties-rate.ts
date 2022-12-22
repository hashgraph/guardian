import { Status } from "../types/status.type";
import { IProperties } from "../interfaces/properties.interface";
import { IRate } from "../interfaces/rate.interface";


export class PropertiesRate implements IRate<any> {
    public name: string;
    public path: string;
    public lvl: number;
    public type: Status;
    public items: IProperties<any>[];
    public totalRate: number;

    constructor(prop1: IProperties<any>, prop2: IProperties<any>) {
        this.items = [prop1, prop2];
        if (prop1 && prop2) {
            this.name = prop1.name;
            this.path = prop1.path;
            this.lvl = prop1.lvl;
            this.totalRate = (prop1.value === prop2.value) ? 100 : 0;
            this.type = (prop1.value === prop2.value) ? Status.FULL : Status.PARTLY;
        } else {
            if (prop1) {
                this.name = prop1.name;
                this.path = prop1.path;
                this.lvl = prop1.lvl;
                this.type = Status.LEFT;
            } else {
                this.name = prop2.name;
                this.path = prop2.path;
                this.lvl = prop2.lvl;
                this.type = Status.RIGHT;
            }
            this.totalRate = -1;
        }
    }
}
