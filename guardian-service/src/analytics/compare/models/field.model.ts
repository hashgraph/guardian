import MurmurHash3 from 'imurmurhash';
import { ICompareOptions } from "../interfaces/compare-options.interface";
import { IKeyMap } from "../interfaces/key-map.interface";
import { WeightType } from '../types/weight.type';
import { AnyPropertyModel, ArrayPropertyModel, PropertyModel } from './property.model';
import { SubSchemaModel } from './sub-schema-model';

export class FieldModel {
    public readonly index: number;

    public readonly name: string;
    public readonly title: string;
    public readonly description: string;
    public readonly type: string;
    public readonly format: string;
    public readonly pattern: string;
    public readonly unit: string;
    public readonly unitSystem: string;
    public readonly isArray: boolean;
    public readonly isRef: boolean;
    public readonly readOnly: boolean;
    public readonly required: boolean;
    public readonly customType: string;
    public readonly comment: string;
    public readonly remoteLink: string;
    public readonly enum: string[];
    public readonly order: number;

    private _condition: string;
    private _subSchema: SubSchemaModel;
    private _weight: string[];
    private _weightMap: IKeyMap<string>;

    public get children(): FieldModel[] {
        if (this._subSchema) {
            return this._subSchema.fields;
        }
        return [];
    }

    public get condition(): string {
        return this._condition;
    }

    constructor(
        name: string,
        property: any,
        required: boolean,
        index: number
    ) {
        let _property = property;
        if (_property.oneOf && _property.oneOf.length) {
            _property = _property.oneOf[0];
        }

        this.name = name;
        this.title = _property.title || name;
        this.description = _property.description || name;
        this.comment = _property.$comment;

        this.isArray = _property.type === 'array';
        if (this.isArray) {
            _property = _property.items;
        }

        this.isRef = !!(_property.$ref && !_property.type);
        if (this.isRef) {
            this.type = _property.$ref;
        } else {
            this.type = _property.type ? String(_property.type) : null;
            this.format = _property.format ? String(_property.format) : null;
            this.pattern = _property.pattern ? String(_property.pattern) : null;
            this.enum = _property.enum;
            this.remoteLink = _property.$ref;
        }

        this.readOnly = !!(_property.readOnly);

        const {
            unit,
            unitSystem,
            customType,
            orderPosition
        } = this.parseFieldComment(this.comment);

        this.unit = unit ? String(unit) : null;
        this.unitSystem = unitSystem ? String(unitSystem) : null;
        this.customType = customType ? String(customType) : null;
        this.required = required;

        if (Number.isFinite(orderPosition) && orderPosition > -1) {
            this.order = orderPosition;
        } else {
            this.order = -1;
        }
        this.index = this.order === -1 ? null : this.order;

        this._weight = [];
        this._weightMap = {};
    }

    /**
     * Parse Field comment
     * @param comment
     */
    private parseFieldComment(comment: string): any {
        try {
            const item = JSON.parse(comment);
            return item || {};
        } catch (error) {
            return {};
        }
    }

    public calcBaseWeight(options: ICompareOptions): void {
        const weights = [];
        const weightMap = {};

        let hashState: any;

        if (options.propLvl > -1) {
            hashState = MurmurHash3();
            hashState.hash(this.name);
            const weight = String(hashState.result());
            weights.push(weight);
            weightMap[WeightType.SCHEMA_LVL_0] = weight;
        }

        if (options.propLvl > 0) {
            hashState = MurmurHash3();
            hashState.hash(this.description);
            const weight = String(hashState.result());
            weights.push(weight);
            weightMap[WeightType.SCHEMA_LVL_1] = weight;
        }

        if (options.propLvl > 0) {
            hashState = MurmurHash3();
            hashState.hash(this.description);
            if (!this.isRef) {
                hashState.hash(this.type);
            }
            const weight = String(hashState.result());
            weights.push(weight);
            weightMap[WeightType.SCHEMA_LVL_2] = weight;
        }

        if (options.propLvl > 0) {
            hashState = MurmurHash3();
            hashState.hash(this.name + this.description);
            if (!this.isRef) {
                hashState.hash(this.type);
            }
            const weight = String(hashState.result());
            weights.push(weight);
            weightMap[WeightType.SCHEMA_LVL_3] = weight;
        }

        if (options.propLvl > 0) {
            hashState = MurmurHash3();
            hashState.hash(
                this.name +
                this.title +
                this.description +
                this.format +
                this.pattern +
                this.unit +
                this.unitSystem +
                this.isArray +
                this.isRef +
                this.readOnly +
                this.required +
                this.customType +
                this.remoteLink +
                this.condition
            );
            if (!this.isRef) {
                hashState.hash(this.type);
            }
            if (Array.isArray(this.enum)) {
                for (const i of this.enum) {
                    hashState.hash(i);
                }
            }
            const weight = String(hashState.result());
            weights.push(weight);
            weightMap[WeightType.SCHEMA_LVL_4] = weight;
        }

        this._weightMap = weightMap;
        this._weight = weights.reverse();
    }

    public getWeight(type?: WeightType): string {
        if (type) {
            return this._weightMap[type];
        } else {
            this._weight[0];
        }
    }

    public getWeights(): string[] {
        return this._weight;
    }

    public maxWeight(): number {
        return this._weight ? this._weight.length : 0;
    }

    public checkWeight(iteration: number): boolean {
        return iteration < this._weight.length;
    }

    public equal(field: FieldModel, iteration?: number): boolean {
        if (!this._weight.length) {
            return this.name === field.name;
        }
        if (iteration) {
            if (this._weight[iteration] === '0' && field._weight[iteration] === '0') {
                return false;
            } else {
                return this._weight[iteration] === field._weight[iteration];
            }
        } else {
            return this._weight[0] === field._weight[0];
        }
    }

    public getPropList(): PropertyModel<any>[] {
        const properties: PropertyModel<any>[] = [];
        if (this.name) {
            properties.push(new AnyPropertyModel('name', this.name));
        }
        if (this.title) {
            properties.push(new AnyPropertyModel('title', this.title));
        }
        if (this.description) {
            properties.push(new AnyPropertyModel('description', this.description));
        }
        if (this.required !== undefined) {
            properties.push(new AnyPropertyModel('required', this.required));
        }
        if (this.type) {
            properties.push(new AnyPropertyModel('type', this.type));
        }
        if (this.format) {
            properties.push(new AnyPropertyModel('format', this.format));
        }
        if (this.pattern) {
            properties.push(new AnyPropertyModel('pattern', this.pattern));
        }
        if (this.customType) {
            properties.push(new AnyPropertyModel('customType', this.customType));
        }
        if (this.unit) {
            properties.push(new AnyPropertyModel('unit', this.unit));
        }
        if (this.unitSystem) {
            properties.push(new AnyPropertyModel('unitSystem', this.unitSystem));
        }
        if (this.readOnly !== undefined) {
            properties.push(new AnyPropertyModel('readOnly', this.readOnly));
        }
        if (this.remoteLink) {
            properties.push(new AnyPropertyModel('remoteLink', this.remoteLink));
        }
        if (Array.isArray(this.enum)) {
            properties.push(new ArrayPropertyModel('enum', !!this.enum.length));
            if (this.enum.length) {
                for (let index = 0; index < this.enum.length; index++) {
                    const v = this.enum[index];
                    properties.push(new AnyPropertyModel(String(index), v, 2, `enum.${index}`));
                }
            }
        }
        if (this.condition) {
            properties.push(new AnyPropertyModel('condition', this.condition));
        }
        if (this.order !== undefined) {
            properties.push(new AnyPropertyModel('order', this.order));
        }
        return properties;
    }

    public toObject(): any {
        return {
            index: this.index,
            name: this.name,
            title: this.title,
            description: this.description,
            type: this.type,
            format: this.format,
            pattern: this.pattern,
            unit: this.unit,
            unitSystem: this.unitSystem,
            isArray: this.isArray,
            isRef: this.isRef,
            readOnly: this.readOnly,
            required: this.required,
            customType: this.customType,
            comment: this.comment,
            remoteLink: this.remoteLink,
            enum: this.enum,
            condition: this.condition,
            order: this.order
        }
    }

    public setSubSchema(subSchema: SubSchemaModel): void {
        this._subSchema = subSchema;
    }

    public setCondition(condition: string): void {
        this._condition = condition;
    }

    public update(options: ICompareOptions): void {
        if (this._subSchema) {
            this._subSchema.update(options);
        }
        this.calcBaseWeight(options);
    }
}
