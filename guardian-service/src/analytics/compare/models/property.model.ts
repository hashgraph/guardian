import { ICompareOptions } from '../interfaces/compare-options.interface';
import { IProperties } from '../interfaces/properties.interface';
import { PropertyType } from '../types/property.type';
import { SchemaModel } from './schema.model';
import { TokenModel } from './token.model';

/**
 * Property Model
 */
export class PropertyModel<T> implements IProperties<T> {
    public readonly name: string;
    public readonly lvl: number;
    public readonly path: string;
    public readonly type: PropertyType;
    public readonly value?: T;

    protected _subProp: PropertyModel<T>[];
    protected _weight: string;

    constructor(
        name: string,
        type: PropertyType,
        value: T,
        lvl?: number,
        path?: string
    ) {
        this.name = name;
        this.type = type;
        this.value = value;
        this.lvl = lvl === undefined ? 1 : lvl;
        this.path = path === undefined ? name : path;
        this._subProp = [];
        this._weight = String(this.value);
    }

    public equal(item: PropertyModel<any>): boolean {
        return this.type === item.type && this._weight === item._weight;
    }

    public toObject(): IProperties<T> {
        return {
            name: this.name,
            lvl: this.lvl,
            path: this.path,
            type: this.type,
            value: this.value
        }
    }

    public hash(options: ICompareOptions): string {
        if (options.propLvl === 1) {
            if (this.lvl === 1) {
                return `${this.path}:${this.value}`;
            } else {
                return null;
            }
        } else {
            return `${this.path}:${this.value}`;
        }
    }

    public getPropList(): PropertyModel<T>[] {
        return this._subProp;
    }
}

export class UUIDPropertyModel extends PropertyModel<any> {
    constructor(
        name: string,
        value: any,
        lvl?: number,
        path?: string
    ) {
        super(name, PropertyType.UUID, value, lvl, path);
    }

    public hash(options: ICompareOptions): string {
        if (options.idLvl === 0) {
            return null;
        }
        return super.hash(options);
    }
}

export class AnyPropertyModel extends PropertyModel<any> {
    constructor(
        name: string,
        value: any,
        lvl?: number,
        path?: string
    ) {
        super(name, PropertyType.Property, value, lvl, path);
    }
}

export class ArrayPropertyModel extends PropertyModel<boolean> {
    constructor(
        name: string,
        value: boolean,
        lvl?: number,
        path?: string
    ) {
        super(name, PropertyType.Array, value, lvl, path);
    }
}

export class ObjectPropertyModel extends PropertyModel<boolean> {
    constructor(
        name: string,
        value: boolean,
        lvl?: number,
        path?: string
    ) {
        super(name, PropertyType.Object, value, lvl, path);
    }
}

export class TokenPropertyModel extends PropertyModel<string> {
    public token?: TokenModel;

    constructor(
        name: string,
        value: string,
        lvl?: number,
        path?: string
    ) {
        super(name, PropertyType.Token, value, lvl, path);
    }

    public setToken(token: TokenModel): void {
        this.token = token;
        if (this.token) {
            this._subProp.length = 0;
            this._subProp.push(new AnyPropertyModel('tokenName', this.token.tokenName, this.lvl + 1));
            this._subProp.push(new AnyPropertyModel('tokenSymbol', this.token.tokenSymbol, this.lvl + 1));
            this._subProp.push(new AnyPropertyModel('tokenType', this.token.tokenType, this.lvl + 1));
            this._subProp.push(new AnyPropertyModel('decimals', this.token.decimals, this.lvl + 1));
            this._subProp.push(new AnyPropertyModel('initialSupply', this.token.initialSupply, this.lvl + 1));
            this._subProp.push(new AnyPropertyModel('enableAdmin', this.token.enableAdmin, this.lvl + 1));
            this._subProp.push(new AnyPropertyModel('enableFreeze', this.token.enableFreeze, this.lvl + 1));
            this._subProp.push(new AnyPropertyModel('enableKYC', this.token.enableKYC, this.lvl + 1));
            this._subProp.push(new AnyPropertyModel('enableWipe', this.token.enableWipe, this.lvl + 1));
            this._weight = this.token.hash();
        }
    }

    public override toObject(): IProperties<string> {
        const item = super.toObject();
        if (this.token) {
            item.tokenId = this.token.tokenId;
            item.tokenName = this.token.tokenName;
            item.tokenSymbol = this.token.tokenSymbol;
            item.tokenType = this.token.tokenType;
            item.decimals = this.token.decimals;
            item.initialSupply = this.token.initialSupply;
            item.enableAdmin = this.token.enableAdmin;
            item.enableFreeze = this.token.enableFreeze;
            item.enableKYC = this.token.enableKYC;
            item.enableWipe = this.token.enableWipe;
        }
        return item;
    }

    public hash(options: ICompareOptions): string {
        if (options.idLvl === 0 && this.token) {
            return `${this.path}:${this.token.hash(options)}`;
        }
        return super.hash(options);
    }
}

export class SchemaPropertyModel extends PropertyModel<string> {
    public schema?: SchemaModel;

    constructor(
        name: string,
        value: string,
        lvl?: number,
        path?: string
    ) {
        super(name, PropertyType.Schema, value, lvl, path);
    }

    public setSchema(schema: SchemaModel): void {
        this.schema = schema;
        if(this.schema) {
            this._weight = this.schema.hash();
        }
    }

    public override toObject(): IProperties<string> {
        const item = super.toObject();
        if (this.schema) {
            item.schemaId = this.schema.id;
        }
        return item;
    }

    public hash(options: ICompareOptions): string {
        if (options.idLvl === 0 && this.schema) {
            return `${this.path}:${this.schema.hash(options)}`;
        }
        return super.hash(options);
    }
}