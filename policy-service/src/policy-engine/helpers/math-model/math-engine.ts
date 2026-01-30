import { MathFormula } from './math-formula.js';
import { FieldLink } from './field-link.js';
import { MathContext } from './math-context.js';
import { MathItemType } from './math-item.type.js';
import { MathGroups } from './math-groups.js';
import { MathGroup } from './math-group.js';
import { IFieldLink, IMathItem } from './math.interface.js';

export class MathEngine {
    public variables: MathGroups<FieldLink>;
    public formulas: MathGroups<MathFormula>;
    public outputs: MathGroups<FieldLink>;

    private valid: boolean = false;

    constructor() {
        this.variables = new MathGroups<FieldLink>();
        this.formulas = new MathGroups<MathFormula>();
        this.outputs = new MathGroups<FieldLink>();
    }

    public addFormula(name?: string, body?: string) {
        const formula = new MathFormula(name, body);
        this.formulas.addItem(formula);
        return formula;
    }

    public addVariable(name?: string, path?: string) {
        const variable = new FieldLink(name, path);
        this.variables.addItem(variable);
        return variable;
    }

    public addOutput() {
        const output = new FieldLink();
        this.outputs.addItem(output);
        return output;
    }

    public deleteFormula(formula: MathFormula) {
        this.formulas.deleteItem(formula);
        formula.destroy();
    }

    public deleteVariable(variable: FieldLink) {
        this.variables.deleteItem(variable);
        variable.destroy();
    }

    public deleteOutput(output: FieldLink) {
        this.outputs.deleteItem(output);
        output.destroy();
    }

    public getItems() {
        return [
            ...this.variables.getItems(),
            ...this.formulas.getItems(),
            ...this.outputs.getItems()
        ];
    }

    private setError(type: string, page: string | null): string[] {
        this.valid = false;
        if (page) {
            return [type, page];
        } else {
            return [type];
        }
    }

    public validate(): string[] | null {
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
        const list = new Map<string, MathFormula | FieldLink>();
        const systemFunctions = MathFormula.createSystemFunctions();
        for (const systemFunction of systemFunctions) {
            list.set(systemFunction.name, systemFunction);
        }

        list.set('_', new FieldLink('_'));

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
        const formulas: [MathGroup<MathFormula>, MathFormula][] = [];
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
        const dependencies = new Map<string, [MathGroup<MathFormula>, MathFormula]>();
        for (const el of formulas) {
            const formula = el[1];
            formula.updateUnknowns();
            if (this.checkUnknowns(list, formula.functionUnknowns)) {
                list.set(formula.name, formula);
            } else {
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
            let last: string | null = null;
            for (const el of items) {
                const page = el[0];
                const formula = el[1];
                formula.validBody = false;
                for (const unknown of formula.functionUnknowns) {
                    if (!list.has(unknown)) {
                        if (!dependencies.has(unknown)) {
                            formula.error = `Unknown variable: ${unknown}`;
                        } else {
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
                const old = list.get(output.name);
                if (old) {
                    if (old.type === MathItemType.FUNCTION) {
                        output.error = `Invalid value`;
                        output.validName = false;
                        return this.setError('outputs', page.id);
                    }
                } else {
                    output.error = `Unknown variable: ${output.name}`;
                    output.validName = false;
                    return this.setError('outputs', page.id);
                }
            }
        }
        return null;
    }

    private checkUnknowns(list: Map<string, MathFormula | FieldLink>, unknowns: string[]): boolean {
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

    public createContext(): MathContext | null {
        this.validate();
        if (this.valid) {
            const variables = this.variables.getItems();
            const formulas = this.formulas.getItems();
            return new MathContext([...variables, ...formulas]);
        } else {
            return null;
        }
    }

    public getComponents() {
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

    public reorder(type: 'variables' | 'formulas' | 'outputs', previousIndex: number, currentIndex: number) {
        if (previousIndex !== currentIndex) {
            if (type === 'variables') {
                this.variables.reorder(previousIndex, currentIndex);
            } else if (type === 'formulas') {
                this.formulas.reorder(previousIndex, currentIndex);
            } else {
                this.outputs.reorder(previousIndex, currentIndex);
            }
            this.validate();
        }
    }

    public toJson() {
        return {
            variables: this.variables.toJson(),
            formulas: this.formulas.toJson(),
            outputs: this.outputs.toJson(),
        }
    }

    public from(json: any): MathEngine | null {
        if (!json) {
            return this;
        }
        try {
            this.variables = new MathGroups<FieldLink>();
            this.formulas = new MathGroups<MathFormula>();
            this.outputs = new MathGroups<FieldLink>();
            if (Array.isArray(json.variables)) {
                this.variables.from(json.variables, FieldLink.from as any);
            }
            if (Array.isArray(json.formulas)) {
                this.formulas.from(json.formulas, MathFormula.from as any);
            }
            if (Array.isArray(json.outputs)) {
                this.outputs.from(json.outputs, (config: IMathItem) => {
                    if (config.type === MathItemType.LINK) {
                        return FieldLink.from(config as IFieldLink);
                    }
                    return null;
                })
            }
            return this;
        } catch (error) {
            return null;
        }
    }

    public static from(json: any): MathEngine | null {
        if (!json) {
            return null;
        }
        try {
            const group = new MathEngine();
            group.from(json);
            return group;
        } catch (error) {
            return null;
        }
    }
}
