import { MathFormula } from './math-formula';
import { FieldLink } from './field-link';
import { MathContext } from './math-context';
import { MathItemType } from './math-Item-type';

export class MathGroup {
    public items: (MathFormula | FieldLink)[] = [];

    public variables: FieldLink[] = [];
    public formulas: MathFormula[] = [];
    public outputs: FieldLink[] = [];

    private valid: boolean = false;

    private list: (MathFormula | FieldLink)[] = [];

    public addFormula(name?: string, body?: string) {
        const formula = new MathFormula(name, body);
        this.formulas.push(formula);
        this.items.push(formula);
        return formula;
    }

    public addVariable(name?: string, path?: string) {
        const variable = new FieldLink(name, path);
        this.variables.push(variable);
        this.items.push(variable);
        return variable;
    }

    public addOutput() {
        const output = new FieldLink();
        this.outputs.push(output);
        this.items.push(output);
        return output;
    }

    public deleteFormula(formula: MathFormula) {
        this.formulas = this.formulas.filter((item) => item !== formula);
        this.items = this.items.filter((item) => item !== formula);
        formula.destroy();
    }

    public deleteVariable(variable: FieldLink) {
        this.variables = this.variables.filter((item) => item !== variable);
        this.items = this.items.filter((item) => item !== variable);
        variable.destroy();
    }

    public deleteOutput(output: FieldLink) {
        this.outputs = this.outputs.filter((item) => item !== output);
        this.items = this.items.filter((item) => item !== output);
        output.destroy();
    }

    public validate() {
        for (const item of this.items) {
            if (!item.empty) {
                item.validate();
            }
        }

        this.valid = true;
        this.list = [];

        const variables = this.variables.filter((v) => !v.empty);
        const formulas = this.formulas.filter((f) => !f.empty);
        const outputs = this.outputs.filter((f) => !f.empty);

        for (const variable of variables) {
            if (!variable.valid) {
                this.valid = false;
                this.list = [];
                return;
            }
        }

        for (const formula of formulas) {
            if (!formula.valid) {
                this.valid = false;
                this.list = [];
                return;
            }
        }

        // Variables
        const list = new Map<string, MathFormula | FieldLink>();
        for (const variable of variables) {
            const old = list.get(variable.name);
            if (old) {
                old.validName = false;
                variable.validName = false;
                old.error = `Duplicate name`;
                variable.error = `Duplicate name`;
                this.valid = false;
                this.list = [];
                return;
            }
            list.set(variable.name, variable);
            this.list.push(variable);
        }

        // Formulas
        for (const formula of formulas) {
            const old = list.get(formula.functionName);
            if (old) {
                old.validName = false;
                formula.validName = false;
                old.error = `Duplicate name`;
                formula.error = `Duplicate name`;
                this.valid = false;
                this.list = [];
                return;
            }
        }

        // Outputs
        for (const output of outputs) {
            const old = list.get(output.name);
            if (old) {
                if (old.type === MathItemType.FUNCTION) {
                    output.error = `Invalid value`;
                    output.validName = false;
                    this.valid = false;
                    this.list = [];
                    return;
                }
            } else {
                output.error = `Unknown variable: ${output.name}`;
                output.validName = false;
                this.valid = false;
                this.list = [];
                return;
            }
        }

        const dependencies = new Map<string, MathFormula>();
        for (const formula of formulas) {
            formula.updateUnknowns();
            if (this.checkUnknowns(list, formula.functionUnknowns)) {
                list.set(formula.functionName, formula);
                this.list.push(formula);
            } else {
                dependencies.set(formula.functionName, formula);
            }
        }

        let lastSize = 0;
        while (dependencies.size > 0 && dependencies.size !== lastSize) {
            lastSize = dependencies.size;

            const formulas = dependencies.values();
            for (const formula of formulas) {
                if (this.checkUnknowns(list, formula.functionUnknowns)) {
                    list.set(formula.functionName, formula);
                    this.list.push(formula);
                    dependencies.delete(formula.functionName);
                }
            }
        }

        if (dependencies.size > 0) {
            const formulas = dependencies.values();
            for (const formula of formulas) {
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
            }
            this.valid = false;
            this.list = [];
            return;
        }
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
            return new MathContext([...this.variables, ...this.formulas]);
        } else {
            return null;
        }
    }

    public toJson() {
        return {
            variables: this.variables.map((v) => v.toJson()),
            formulas: this.formulas.map((v) => v.toJson()),
            outputs: this.outputs.map((v) => v.toJson()),
        }
    }

    public static from(json: any): MathGroup | null {
        if (!json) {
            return null;
        }

        try {
            const group = new MathGroup();
            if (Array.isArray(json.variables)) {
                for (const config of json.variables) {
                    const variable = FieldLink.from(config);
                    if (!variable) {
                        return null;
                    }
                    group.variables.push(variable);
                    group.items.push(variable);
                }
            }
            if (Array.isArray(json.formulas)) {
                for (const config of json.formulas) {
                    const formula = MathFormula.from(config);
                    if (!formula) {
                        return null;
                    }
                    group.formulas.push(formula);
                    group.items.push(formula);
                }
            }
            if (Array.isArray(json.outputs)) {
                for (const config of json.outputs) {
                    const output = FieldLink.from(config);
                    if (!output) {
                        return null;
                    }
                    group.outputs.push(output);
                    group.items.push(output);
                }
            }
            return group;
        } catch (error) {
            return null;
        }
    }
}
