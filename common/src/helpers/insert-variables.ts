import ObjGet from 'lodash.get';

export function insertVariables(expression: string, obj: any) {
    if (!expression) {
        return expression;
    }
    return expression.replace(
        /\${([A-Za-z0-9\.\[\]\@]+)}/g,
        (_, placeholderWithoutDelimiters) => {
            const value = ObjGet(obj, placeholderWithoutDelimiters, '');
            return value;
        }
    );
}
