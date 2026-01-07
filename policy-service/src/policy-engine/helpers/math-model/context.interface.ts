
export interface IContext {
    variables: { [name: string]: any; };
    formulas: { [name: string]: Function; };
    scope: { [name: string]: any; };
    document: any;
    getField: Function;
    user: any;
}
