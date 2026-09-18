import { validateSync } from 'class-validator';

export const make = (Cls, props) => Object.assign(new Cls(), props);

export const errorsFor = (Cls, props) => validateSync(make(Cls, props), { whitelist: false });

export const constraintKeys = (errs, property) => {
    const out = [];
    const walk = (list, prefix) => {
        for (const e of list) {
            const path = prefix ? `${prefix}.${e.property}` : e.property;
            if (e.constraints) {
                for (const k of Object.keys(e.constraints)) {
                    out.push({ property: path, key: k });
                }
            }
            if (e.children && e.children.length) {
                walk(e.children, path);
            }
        }
    };
    walk(errs, '');
    if (property) {
        return out.filter((o) => o.property === property).map((o) => o.key);
    }
    return out;
};

export const hasConstraint = (errs, property, key) => constraintKeys(errs, property).includes(key);

export const hasError = (errs, property) => {
    const flat = constraintKeys(errs);
    return flat.some((o) => o.property === property);
};

export const isClean = (errs) => errs.length === 0;
