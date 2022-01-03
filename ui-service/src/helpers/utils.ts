export function findAllEntities(obj: {[key:string]: any}, name: string): string[] {
    const result = [];

    function finder(o: {[key:string]: any}): void {
        if(o.hasOwnProperty(name)) {
            result.push(o[name]);
        }

        if (o.hasOwnProperty('children')) {
            for (let child of o['children']) {
                finder(child);
            }
        }
    }
    finder(obj);
    return result;
}
