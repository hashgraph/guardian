import { MathItemType } from './math-item.type.js';
import { GenerateUUIDv4 } from '../gi/index.js';
export class MathGroup {
    type = MathItemType.GROUP;
    id = GenerateUUIDv4();
    name;
    items;
    valid;
    validatedItems;
    constructor(name) {
        this.name = name || '';
        this.items = [];
        this.valid = true;
    }
    add(item) {
        this.items.push(item);
    }
    delete(item) {
        this.items = this.items.filter((e) => e !== item);
    }
    validate() {
        this.valid = true;
        for (const item of this.items) {
            if (!item.empty) {
                item.validate();
                this.valid = this.valid && item.valid;
            }
        }
        this.validatedItems = this.items.filter((v) => !v.empty);
    }
    reorder(previousIndex, currentIndex) {
        return;
    }
    toJson() {
        return {
            type: this.type,
            name: this.name || '',
            items: this.items.filter((v) => !v.empty).map((v) => v.toJson())
        };
    }
    from(json, create) {
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
    static from(json, create) {
        if (!json || typeof json !== 'object') {
            return null;
        }
        const group = new MathGroup();
        group.from(json, create);
        return group;
    }
}
