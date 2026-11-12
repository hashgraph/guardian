import { MathFormula } from './math-formula.js';
import { FieldLink } from './field-link.js';
import { MathContext } from './math-context.js';
import { MathItemType } from './math-item.type.js';
import { MathGroups } from './math-groups.js';
export class MathEngine {
    variables;
    formulas;
    outputs;
    valid = false;
    constructor() {
        this.variables = new MathGroups();
        this.formulas = new MathGroups();
        this.outputs = new MathGroups();
    }
    addFormula(name, body) {
        const formula = new MathFormula(name, body);
        this.formulas.addItem(formula);
        return formula;
    }
    addVariable(name, path) {
        const variable = new FieldLink(name, path);
        this.variables.addItem(variable);
        return variable;
    }
    addOutput() {
        const output = new FieldLink();
        this.outputs.addItem(output);
        return output;
    }
    deleteFormula(formula) {
        this.formulas.deleteItem(formula);
        formula.destroy();
    }
    deleteVariable(variable) {
        this.variables.deleteItem(variable);
        variable.destroy();
    }
    deleteOutput(output) {
        this.outputs.deleteItem(output);
        output.destroy();
    }
    getItems() {
        return [
            ...this.variables.getItems(),
            ...this.formulas.getItems(),
            ...this.outputs.getItems()
        ];
    }
    setError(type, page) {
        this.valid = false;
        if (page) {
            return [type, page];
        }
        else {
            return [type];
        }
    }
    validate() {
        this.variables.validate();
        this.formulas.validate();
        this.outputs.validate();
        this.valid = true;
        // Pages
        for (const page of this.variables.pages) {
            for (const variable of page.validatedItems) {
                if (!variable.valid) {
                    return this.setError('variables', page.id);
                }
            }
        }
        for (const page of this.formulas.pages) {
            for (const formula of page.validatedItems) {
                if (!formula.valid) {
                    return this.setError('formulas', page.id);
                }
            }
        }
        // System
        const list = new Map();
        const systemFunctions = MathFormula.createSystemFunctions();
        for (const systemFunction of systemFunctions) {
            list.set(systemFunction.name, systemFunction);
        }
        list.set('_', new FieldLink('_'));
        list.set('index', new FieldLink('index'));
        list.set('Lookup', new FieldLink('Lookup'));
        list.set('LookupTwo', new FieldLink('LookupTwo'));
        list.set('LookupMin', new FieldLink('LookupMin'));
        list.set('LookupMax', new FieldLink('LookupMax'));
        list.set('EqualString', new FieldLink('EqualString'));
        // Variables
        for (const page of this.variables.pages) {
            for (const variable of page.validatedItems) {
                const old = list.get(variable.name);
                if (old) {
                    old.validName = false;
                    variable.validName = false;
                    old.error = `Duplicate name`;
                    variable.error = `Duplicate name`;
                    return this.setError('variables', page.id);
                }
                list.set(variable.name, variable);
            }
        }
        // Formulas
        const formulas = [];
        for (const page of this.formulas.pages) {
            for (const formula of page.validatedItems) {
                const old = list.get(formula.name);
                if (old) {
                    old.validName = false;
                    formula.validName = false;
                    old.error = `Duplicate name`;
                    formula.error = `Duplicate name`;
                    return this.setError('formulas', page.id);
                }
                formulas.push([page, formula]);
            }
        }
        // Dependencies
        const dependencies = new Map();
        for (const el of formulas) {
            const formula = el[1];
            formula.updateUnknowns();
            if (this.checkUnknowns(list, formula.functionUnknowns)) {
                list.set(formula.name, formula);
            }
            else {
                dependencies.set(formula.name, el);
            }
        }
        let lastSize = 0;
        while (dependencies.size > 0 && dependencies.size !== lastSize) {
            lastSize = dependencies.size;
            const items = dependencies.values();
            for (const el of items) {
                const formula = el[1];
                if (this.checkUnknowns(list, formula.functionUnknowns)) {
                    list.set(formula.name, formula);
                    dependencies.delete(formula.name);
                }
            }
        }
        if (dependencies.size > 0) {
            const items = dependencies.values();
            let last = null;
            for (const el of items) {
                const page = el[0];
                const formula = el[1];
                formula.validBody = false;
                for (const unknown of formula.functionUnknowns) {
                    if (!list.has(unknown)) {
                        if (!dependencies.has(unknown)) {
                            formula.error = `Unknown variable: ${unknown}`;
                        }
                        else {
                            formula.error = `Cyclic dependence: ${unknown}`;
                        }
                    }
                }
                page.valid = false;
                last = page.id;
            }
            return this.setError('formulas', last);
        }
        // Outputs
        for (const page of this.outputs.pages) {
            for (const output of page.validatedItems) {
                if (output.isTable && !output.valid) {
                    return this.setError('outputs', page.id);
                }
                const names = output.isTable ? output.getCellNames() : [output.name];
                for (const name of names) {
                    const old = list.get(name);
                    if (old) {
                        if (old.type === MathItemType.FUNCTION) {
                            output.error = `Invalid value`;
                            output.validName = false;
                            return this.setError('outputs', page.id);
                        }
                    }
                    else {
                        output.error = `Unknown variable: ${name}`;
                        output.validName = false;
                        return this.setError('outputs', page.id);
                    }
                }
            }
        }
        return null;
    }
    checkUnknowns(list, unknowns) {
        if (unknowns.length === 0) {
            return true;
        }
        for (const unknown of unknowns) {
            if (!list.has(unknown)) {
                return false;
            }
        }
        return true;
    }
    createContext() {
        this.validate();
        if (this.valid) {
            const variables = this.variables.getItems();
            const formulas = this.formulas.getItems();
            return new MathContext([...variables, ...formulas]);
        }
        else {
            return null;
        }
    }
    getComponents() {
        const components = [];
        const variableComponents = this.variables.getComponents();
        const functionComponents = this.formulas.getComponents();
        if (variableComponents.length) {
            components.push({
                id: 'variables',
                name: 'Variables',
                components: variableComponents
            });
        }
        if (functionComponents.length) {
            components.push({
                id: 'formulas',
                name: 'Formulas',
                components: functionComponents
            });
        }
        return components;
    }
    reorder(type, previousIndex, currentIndex) {
        if (previousIndex !== currentIndex) {
            if (type === 'variables') {
                this.variables.reorder(previousIndex, currentIndex);
            }
            else if (type === 'formulas') {
                this.formulas.reorder(previousIndex, currentIndex);
            }
            else {
                this.outputs.reorder(previousIndex, currentIndex);
            }
            this.validate();
        }
    }
    toJson() {
        return {
            variables: this.variables.toJson(),
            formulas: this.formulas.toJson(),
            outputs: this.outputs.toJson(),
        };
    }
    from(json) {
        if (!json) {
            return this;
        }
        try {
            this.variables = new MathGroups();
            this.formulas = new MathGroups();
            this.outputs = new MathGroups();
            if (Array.isArray(json.variables)) {
                this.variables.from(json.variables, FieldLink.from);
            }
            if (Array.isArray(json.formulas)) {
                this.formulas.from(json.formulas, MathFormula.from);
            }
            if (Array.isArray(json.outputs)) {
                this.outputs.from(json.outputs, (config) => {
                    if (config.type === MathItemType.LINK) {
                        return FieldLink.from(config);
                    }
                    return null;
                });
            }
            return this;
        }
        catch (error) {
            return null;
        }
    }
    static from(json) {
        if (!json) {
            return null;
        }
        try {
            const group = new MathEngine();
            group.from(json);
            return group;
        }
        catch (error) {
            return null;
        }
    }
}
