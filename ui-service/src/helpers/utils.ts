import { GenerateUUIDv4 } from '@policy-engine/helpers/uuidv4';

export function findAllEntities(obj: {[key:string]: any}, name: string): string[] {
    const result = [];

    function finder(o: {[key:string]: any}): void {
        if(!o) {
            return;
        }
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

    const map = {};
    for (let index = 0; index < result.length; index++) {
        map[result[index]] = result[index];
    }
    return Object.values(map);
}

export function replaceAllEntities(
    obj: {[key:string]: any}, 
    name: string, 
    oldValue: string, 
    newValue: string
): void {
    function finder(o: {[key:string]: any}): void {
        if(o.hasOwnProperty(name) && o[name] == oldValue) {
            o[name] = newValue;
        }

        if (o.hasOwnProperty('children')) {
            for (let child of o['children']) {
                finder(child);
            }
        }
    }
    finder(obj);
}


export function regenerateIds(block: any) {
    block.id = GenerateUUIDv4();
    if (Array.isArray(block.children)) {
        for (let child of block.children) {
            regenerateIds(child);
        }
    }
}