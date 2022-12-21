import { BlockModel } from "../models/block-model";
import { ICompareOptions } from "../interfaces/compare-options.interface";
import { Status } from "../types/status.type";
import { IProperties } from "../interfaces/properties.interface";
import { EventModel } from "../models/event-model";
import { PropertiesRate } from "./properties-rate";
import { EventsRate } from "./events-rate";
import { PermissionsRate } from "./permissions-rate";

export class BlockRate {
    public indexRate: number;
    public propRate: number;
    public eventRate: number;
    public permissionRate: number;
    public totalRate: number;
    public type: Status;
    public blockType: string;
    public items: BlockModel[];
    public children: BlockRate[];
    public properties: PropertiesRate[];
    public events: EventsRate[];
    public permissions: PermissionsRate[];

    constructor(block1: BlockModel, block2: BlockModel) {
        this.indexRate = -1;
        this.propRate = -1;
        this.eventRate = -1;
        this.permissionRate = -1;
        this.totalRate = -1;
        this.type = Status.NONE;
        this.items = [block1, block2];
        this.children = [];
        this.properties = [];
        this.events = [];
        this.permissions = [];
        if (block1) {
            this.blockType = block1.blockType;
        } else if (block2) {
            this.blockType = block2.blockType;
        }
    }

    private compareProp(block1: BlockModel, block2: BlockModel): void {
        const list: string[] = [];
        const map: any = {};

        let tag1: IProperties<any>;
        if (block1) {
            tag1 = { type: 'property', name: 'tag', lvl: 1, path: 'tag', value: block1.tag };
            const list1 = block1.getPropList();
            for (const item of list1) {
                list.push(item.path);
                map[item.path] = [item, null];
            }
        }

        let tag2: IProperties<any>;
        if (block2) {
            tag2 = { type: 'property', name: 'tag', lvl: 1, path: 'tag', value: block2.tag };
            const list2 = block2.getPropList();
            for (const item of list2) {
                if (map[item.path]) {
                    map[item.path][1] = item;
                } else {
                    list.push(item.path);
                    map[item.path] = [null, item];
                }
            }
        }

        list.sort();

        this.properties = [];
        for (const path of list) {
            this.properties.push(new PropertiesRate(map[path][0], map[path][1]));
        }

        this.properties.unshift(new PropertiesRate(tag1, tag2));
    }

    private mapEvents(list: EventModel[][], item: EventModel) {
        for (const el of list) {
            if (el[0] && !el[1] && el[0].weight === item.weight) {
                el[1] = item;
                return;
            }
        }
        list.push([null, item])
    }

    private compareEvents(block1: BlockModel, block2: BlockModel): void {
        const list: EventModel[][] = [];

        if (block1) {
            const list1 = block1.getEventList();
            for (const item of list1) {
                list.push([item, null]);
            }
        }

        if (block2) {
            const list2 = block2.getEventList();
            for (const item of list2) {
                this.mapEvents(list, item);
            }
        }

        this.events = [];
        for (const item of list) {
            this.events.push(new EventsRate(item[0], item[1]));
        }
    }

    private comparePermissions(block1: BlockModel, block2: BlockModel): void {
        const list: string[] = [];
        const map: any = [];

        if (block1) {
            const list1 = block1.getPermissionsList();
            for (const item of list1) {
                list.push(item);
                map[item] = [item, null];
            }
        }

        if (block2) {
            const list2 = block2.getPermissionsList();
            for (const item of list2) {
                if (map[item]) {
                    map[item][1] = item;
                } else {
                    list.push(item);
                    map[item] = [null, item];
                }
            }
        }

        list.sort();

        this.permissions = [];
        for (const item of list) {
            this.permissions.push(new PermissionsRate(map[item][0], map[item][1]));
        }
    }

    public calcRate(options: ICompareOptions): void {
        const block1 = this.items[0];
        const block2 = this.items[1];

        this.compareProp(block1, block2);
        this.compareEvents(block1, block2);
        this.comparePermissions(block1, block2);

        if (!block1 || !block2) {
            return;
        }

        let propRate = 0;
        for (const p of this.properties) {
            if (p.totalRate > 0) {
                propRate += p.totalRate;
            }
        }
        if (this.properties.length) {
            propRate = propRate / this.properties.length;
        } else {
            propRate = 100;
        }
        propRate = Math.min(Math.max(-1, Math.floor(propRate)), 100);


        let eventRate = 0;
        for (const e of this.events) {
            if (e.totalRate > 0) {
                eventRate += e.totalRate;
            }
        }
        if (this.events.length) {
            eventRate = eventRate / this.events.length;
        } else {
            eventRate = 100;
        }
        eventRate = Math.min(Math.max(-1, Math.floor(eventRate)), 100);

        let permissionRate = 0;
        for (const e of this.permissions) {
            if (e.totalRate > 0) {
                permissionRate += e.totalRate;
            }
        }
        if (this.permissions.length) {
            permissionRate = permissionRate / this.permissions.length;
        } else {
            permissionRate = 100;
        }
        permissionRate = Math.min(Math.max(-1, Math.floor(permissionRate)), 100);

        this.indexRate = block1.index === block2.index ? 100 : 0;
        this.propRate = propRate;
        this.eventRate = eventRate;
        this.permissionRate = permissionRate;
        this.totalRate = Math.floor((propRate + eventRate) / 2);
    }
}
