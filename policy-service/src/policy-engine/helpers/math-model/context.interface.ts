
export interface IContext {
    variables: { [name: string]: any; };
    formulas: { [name: string]: Function; };
    scope: { [name: string]: any; };
    document: any;
    result: any;
    getField: Function;
    user: any;
}
