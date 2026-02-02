import { MathItemType } from './math-item.type.js';

export interface IContext {
    variables: { [name: string]: any; };
    formulas: { [name: string]: Function; };
    scope: { [name: string]: any; };
    document: any;
    relationships: any[];
    result: any;
    getField: Function;
    user: any;
}

export interface IFieldLink {
    type: MathItemType;
    name: string;
    description: string;
    field: string;
    schema: string;
}

export interface IMathFormula {
    type: MathItemType;
    name: string;
    description: string;
    body: string;
    params: string[];
    relationships: string[];
}

export type IMathItem = IMathFormula | IFieldLink;

export interface IMathGroup {
    type: MathItemType.GROUP;
    name: string;
    items: IMathItem[];
}

export interface IMathDocument {
    schema: string,
    name?: string,
    document: any
}

export type IMathGroups = IMathGroup[];

export type createMathItem<T> = (config: IMathItem) => T | null;