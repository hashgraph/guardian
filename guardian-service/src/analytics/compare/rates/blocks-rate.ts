import { BlockModel } from "../models/block.model";
import { ICompareOptions } from "../interfaces/compare-options.interface";
import { Status } from "../types/status.type";
import { EventModel } from "../models/event.model";
import { PropertiesRate } from "./properties-rate";
import { EventsRate } from "./events-rate";
import { PermissionsRate } from "./permissions-rate";
import { ArtifactsRate } from "./artifacts-rate";
import { IRate } from "../interfaces/rate.interface";
import { ArtifactModel } from "../models/artifact.model";
import { Rate } from "./rate";
import { AnyPropertyModel, PropertyModel } from "../models/property.model";
import { IRateMap } from "../interfaces/rate-map.interface";
import { CompareUtils } from "../utils/utils";

export class BlocksRate extends Rate<BlockModel> {
    public blockType: string;

    public indexRate: number;
    public propertiesRate: number;
    public eventsRate: number;
    public permissionsRate: number;
    public artifactsRate: number;

    public properties: IRate<any>[];
    public events: IRate<any>[];
    public permissions: IRate<any>[];
    public artifacts: IRate<any>[];

    public children: BlocksRate[];

    constructor(block1: BlockModel, block2: BlockModel) {
        super(block1, block2);
        this.indexRate = -1;
        this.propertiesRate = -1;
        this.eventsRate = -1;
        this.permissionsRate = -1;
        this.artifactsRate = -1;
        this.totalRate = -1;
        this.type = Status.NONE;
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

    private compareProp(
        block1: BlockModel,
        block2: BlockModel,
        options: ICompareOptions
    ): IRate<any>[] {
        const list: string[] = [];
        const map: { [key: string]: IRateMap<PropertyModel<any>> } = {};
        map['tag'] = { left: null, right: null };
        if (block1) {
            map['tag'].left = new AnyPropertyModel('tag', block1.tag);
            for (const item of block1.getPropList()) {
                map[item.path] = { left: item, right: null };
                list.push(item.path);
            }
        }
        if (block2) {
            map['tag'].right = new AnyPropertyModel('tag', block2.tag);
            for (const item of block2.getPropList()) {
                if (map[item.path]) {
                    map[item.path].right = item;
                } else {
                    map[item.path] = { left: null, right: item };
                    list.push(item.path);
                }
            }
        }
        list.sort();
        list.unshift('tag');

        const rates: IRate<any>[] = [];
        for (const path of list) {
            const item = map[path];
            const rate = new PropertiesRate(item.left, item.right);
            rate.calc(options);
            rates.push(rate);
            const subRates = rate.getSubRate();
            for (const subRate of subRates) {
                rates.push(subRate);
            }
        }
        return rates;
    }

    private comparePermissions(
        block1: BlockModel,
        block2: BlockModel,
        options: ICompareOptions
    ): IRate<any>[] {
        const list: IRateMap<string>[] = [];
        if (block1) {
            const list1 = block1.getPermissionsList();
            for (const item of list1) {
                list.push({ left: item, right: null });
            }
        }
        if (block2) {
            const list2 = block2.getPermissionsList();
            for (const item of list2) {
                CompareUtils.mapping<string>(list, item);
            }
        }
        const rates: IRate<any>[] = [];
        for (const item of list) {
            rates.push(new PermissionsRate(item.left, item.right));
        }
        return rates;
    }

    private compareEvents(
        block1: BlockModel,
        block2: BlockModel,
        options: ICompareOptions
    ): IRate<any>[] {
        const list: IRateMap<EventModel>[] = [];
        if (block1) {
            const list1 = block1.getEventList();
            for (const item of list1) {
                list.push({ left: item, right: null });
            }
        }
        if (block2) {
            const list2 = block2.getEventList();
            for (const item of list2) {
                CompareUtils.mapping<EventModel>(list, item);
            }
        }
        const rates: IRate<any>[] = [];
        for (const item of list) {
            rates.push(new EventsRate(item.left, item.right));
        }
        return rates;
    }

    private compareArtifacts(
        block1: BlockModel,
        block2: BlockModel,
        options: ICompareOptions
    ): IRate<any>[] {
        const list: IRateMap<ArtifactModel>[] = [];
        if (block1) {
            const list1 = block1.getArtifactsList();
            for (const item of list1) {
                list.push({ left: item, right: null });
            }
        }
        if (block2) {
            const list2 = block2.getArtifactsList();
            for (const item of list2) {
                CompareUtils.mapping<ArtifactModel>(list, item);
            }
        }
        const rates: IRate<any>[] = [];
        for (const item of list) {
            rates.push(new ArtifactsRate(item.left, item.right));
        }
        return rates;
    }

    public override calc(options: ICompareOptions): void {
        const block1 = this.left;
        const block2 = this.right;

        this.properties = this.compareProp(block1, block2, options);
        this.events = this.compareEvents(block1, block2, options);
        this.permissions = this.comparePermissions(block1, block2, options);
        this.artifacts = this.compareArtifacts(block1, block2, options);

        if (!block1 || !block2) {
            return;
        }

        this.indexRate = block1.index === block2.index ? 100 : 0;
        this.propertiesRate = CompareUtils.calcRate(this.properties);
        this.eventsRate = CompareUtils.calcRate(this.events);
        this.permissionsRate = CompareUtils.calcRate(this.permissions);
        this.artifactsRate = CompareUtils.calcRate(this.artifacts);
        this.totalRate = CompareUtils.calcTotalRate(
            this.propertiesRate,
            this.eventsRate,
            this.permissionsRate,
            this.artifactsRate
        );
    }

    public getSubRate(name: string): IRate<any>[] {
        if (name === 'properties') {
            return this.properties;
        }
        if (name === 'events') {
            return this.events;
        }
        if (name === 'permissions') {
            return this.permissions;
        }
        if (name === 'artifacts') {
            return this.artifacts;
        }
        return null;
    }

    public override getChildren<T extends IRate<any>>(): T[] {
        return this.children as any;
    }

    public override getRateValue(name: string): number {
        if (name === 'index') {
            return this.indexRate;
        }
        if (name === 'properties') {
            return this.propertiesRate;
        }
        if (name === 'events') {
            return this.eventsRate;
        }
        if (name === 'permissions') {
            return this.permissionsRate;
        }
        if (name === 'artifacts') {
            return this.artifactsRate;
        }
        return this.totalRate;
    }
}
