import { BlockModel } from "../models/block.model";
import { ICompareOptions } from "../interfaces/compare-options.interface";
import { Status } from "../types/status.type";
import { IProperties } from "../interfaces/properties.interface";
import { EventModel } from "../models/event.model";
import { PropertiesRate } from "./properties-rate";
import { EventsRate } from "./events-rate";
import { PermissionsRate } from "./permissions-rate";
import { ArtifactsRate } from "./artifacts-rate";
import { IRate } from "../interfaces/rate.interface";
import { ArtifactModel } from "../models/artifact.model";

export class BlocksRate implements IRate<any> {
    public indexRate: number;
    public propertiesRate: number;
    public eventsRate: number;
    public permissionsRate: number;
    public artifactsRate: number;
    public totalRate: number;
    public type: Status;
    public blockType: string;
    public items: BlockModel[];
    public children: BlocksRate[];
    public properties: PropertiesRate[];
    public events: EventsRate[];
    public permissions: PermissionsRate[];
    public artifacts: ArtifactsRate[];

    constructor(block1: BlockModel, block2: BlockModel) {
        this.indexRate = -1;
        this.propertiesRate = -1;
        this.eventsRate = -1;
        this.permissionsRate = -1;
        this.artifactsRate = -1;
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
        } else {
            throw new Error('Empty block model');
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

    private comparePermissions(block1: BlockModel, block2: BlockModel): void {
        const list: string[][] = [];
        if (block1) {
            const list1 = block1.getPermissionsList();
            for (const item of list1) {
                list.push([item, null]);
            }
        }
        if (block2) {
            const list2 = block2.getPermissionsList();
            for (const item of list2) {
                this._mapping<string>(list, item);
            }
        }
        const rates: IRate<any>[] = [];
        for (const item of list) {
            rates.push(new PermissionsRate(item[0], item[1]));
        }
        this.permissions = rates;
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
                this._mapping<EventModel>(list, item);
            }
        }
        const rates: IRate<any>[] = [];
        for (const item of list) {
            rates.push(new EventsRate(item[0], item[1]));
        }
        this.events = rates;
    }

    private compareArtifacts(block1: BlockModel, block2: BlockModel): void {
        const list: ArtifactModel[][] = [];
        if (block1) {
            const list1 = block1.getArtifactsList();
            for (const item of list1) {
                list.push([item, null]);
            }
        }
        if (block2) {
            const list2 = block2.getArtifactsList();
            for (const item of list2) {
                this._mapping<ArtifactModel>(list, item);
            }
        }
        const rates: IRate<any>[] = [];
        for (const item of list) {
            rates.push(new ArtifactsRate(item[0], item[1]));
        }
        this.artifacts = rates;
    }

    private _mapping<T>(list: T[][], item: T) {
        for (const el of list) {
            if (el[0] && !el[1] && this._equal(el[0], item)) {
                el[1] = item;
                return;
            }
        }
        list.push([null, item])
    }

    private _equal(e1: any, e2: any): boolean {
        if (typeof e1.equal === 'function') {
            return e1.equal(e2);
        }
        return e1 === e2;
    }

    private _calcRate<T>(rates: IRate<T>[]): number {
        let sum = 0;
        for (const item of rates) {
            if (item.totalRate > 0) {
                sum += item.totalRate;
            }
        }
        if (rates.length) {
            sum = sum / rates.length;
        } else {
            sum = 100;
        }
        sum = Math.min(Math.max(-1, Math.floor(sum)), 100);
        return sum;
    }

    public calcRate(options: ICompareOptions): void {
        const block1 = this.items[0];
        const block2 = this.items[1];

        this.compareProp(block1, block2);
        this.compareEvents(block1, block2);
        this.comparePermissions(block1, block2);
        this.compareArtifacts(block1, block2);

        if (!block1 || !block2) {
            return;
        }

        this.indexRate = block1.index === block2.index ? 100 : 0;
        this.propertiesRate = this._calcRate(this.properties);
        this.eventsRate = this._calcRate(this.events);
        this.permissionsRate = this._calcRate(this.permissions);
        this.artifactsRate = this._calcRate(this.artifacts);

        this.totalRate = Math.floor((
            this.propertiesRate +
            this.eventsRate +
            this.permissionsRate +
            this.artifactsRate
        ) / 4);
    }
}
