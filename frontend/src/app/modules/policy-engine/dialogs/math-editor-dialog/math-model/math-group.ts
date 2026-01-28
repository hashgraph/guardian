import { moveItemInArray } from "@angular/cdk/drag-drop";
import { FieldLink } from "./field-link";
import { MathFormula } from "./math-formula";
import { createMathItem, IMathGroup } from "./math.interface";
import { MathItemType } from "./math-item.type";
import { GenerateUUIDv4 } from "@guardian/interfaces";

export class MathGroup<T extends MathFormula | FieldLink> {
    public readonly type = MathItemType.GROUP;
    public readonly id = GenerateUUIDv4();

    public name: string;
    public items: T[];
    public valid: boolean;

    constructor(name?: string) {
        this.name = name || '';
        this.items = [];
        this.valid = true;
    }

    public add(item: T) {
        this.items.push(item);
    }

    public delete(item: T) {
        this.items = this.items.filter((e) => e !== item);
    }

    public validate() {
        this.valid = true;
        for (const item of this.items) {
            if (!item.empty) {
                item.validate();
                this.valid = this.valid && item.valid;
            }
        }
    }

    public reorder(previousIndex: number, currentIndex: number) {
        moveItemInArray(this.items, previousIndex, currentIndex);
    }

    public toJson(): IMathGroup {
        return {
            type: this.type,
            name: this.name || '',
            items: this.items.filter((v) => !v.empty).map((v) => v.toJson())
        }
    }

    public from(json: IMathGroup, create: createMathItem<T>) {
        if (!json || typeof json !== 'object') {
            return null;
        }
        this.name = json.name || '';
        this.items = [];
        if (Array.isArray(json.items)) {
            for (const config of json.items) {
                const item = create(config);
                if (item) {
                    this.items.push(item);
                }
            }
        }
        return this;
    }

    public static from<T extends MathFormula | FieldLink>(json: IMathGroup, create: createMathItem<T>) {
        if (!json || typeof json !== 'object') {
            return null;
        }
        const group = new MathGroup<T>();
        group.from(json, create);
        return group;
    }
}