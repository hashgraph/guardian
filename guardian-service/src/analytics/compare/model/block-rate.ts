import { BlockModel } from "./block-model";
import { PropModel } from "./prop-model";
import { ICompareOptions } from "./compare-options.interface";
import { Status } from "./status.type";


export class BlockRate {
    public propRate: number;
    public eventRate: number;
    public totalRate: number;
    public difference: Status;
    public items: BlockModel[];
    public children: BlockRate[];

    constructor(block1: BlockModel, block2: BlockModel) {
        this.propRate = -1;
        this.eventRate = -1;
        this.totalRate = -1;
        this.difference = Status.NONE;
        this.items = [block1, block2];
        this.children = [];
    }

    public calcRate(options: ICompareOptions): void {
        const block1 = this.items[0];
        const block2 = this.items[1];

        if (!block1 || !block2) {
            return;
        }

        let propCount = 0;
        const propKeys =  PropModel.keys(block1.prop, block2.prop);
        for (const key of propKeys) {
            if (this.compareProp(block1.prop.get(key), block2.prop.get(key), options)) {
                propCount++;
            }
        }

        const events = {};
        for (const event of block1.events) {
            if (event.weight) {
                events[event.weight] = 1;
            }
        }
        for (const event of block2.events) {
            if (event.weight) {
                if (events[event.weight]) {
                    events[event.weight] = 2;
                } else {
                    events[event.weight] = 1;
                }
            }
        }

        const eventKeys = Object.keys(events);
        let eventCount = 0;
        for (const key of eventKeys) {
            if (events[key] == 2) {
                eventCount++;
            }
        }

        let k1 = 0;
        let k2 = 0;
        let k3s = [];
        if (options.propLvl == 0) {
            k1 = -1;
        } else {
            k1 = propKeys.length == 0 ? 100 : (propCount) / (propKeys.length) * 100;
            k3s.push(k1);
        }

        if (options.eventLvl == 0) {
            k2 = -1;
        } else {
            k2 = eventKeys.length == 0 ? 100 : (eventCount) / (eventKeys.length) * 100;
            k3s.push(k2);
        }
        let k3 = 0;
        for (const v of k3s) {
            k3 += v;
        }
        k3 = k3s.length == 0 ? 100 : (k3) / (k3s.length);

        const p1 = Math.min(Math.max(-1, Math.floor(k1)), 100);
        const p2 = Math.min(Math.max(-1, Math.floor(k2)), 100);
        const p3 = Math.min(Math.max(-1, Math.floor(k3)), 100);

        this.propRate = p1;
        this.eventRate = p2;
        this.totalRate = p3;
    }

    private compareProp(prop1: any, prop2: any, options: ICompareOptions) {
        if (options.propLvl == 0) {
            return true;
        }
        if (prop1 && prop2) {
            if (typeof prop1 == 'object') {
                if (options.propLvl == 1) {
                    return true;
                } else {
                    return JSON.stringify(prop1) == JSON.stringify(prop2);
                }
            } else {
                return prop1 == prop2;
            }
        } else {
            return prop1 == prop2;
        }
    }
}
