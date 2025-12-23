import { Formula } from './formula';
import { FieldLink } from './link';
import { Context } from './context';

export class Group {
    public items: (Formula | FieldLink)[] = [];

    public variables: FieldLink[] = [];
    public formulas: Formula[] = [];
    public outputs: FieldLink[] = [];

    private valid: boolean = false;

    private list: (Formula | FieldLink)[] = [];

    public addFormula(name?: string, body?: string) {
        const formula = new Formula(name, body);
        // formula.update();
        // formula.subscribe(this.onChange.bind(this));
        this.formulas.push(formula);
        this.items.push(formula);
        // this.update();
    }

    public addVariable() {
        const variable = new FieldLink();
        // variable.subscribe(this.onChange.bind(this));
        this.variables.push(variable);
        this.items.push(variable);
        // this.update();
    }

    public addOutput() {
        const output = new FieldLink();
        // output.subscribe(this.onChange.bind(this));
        this.outputs.push(output);
        this.items.push(output);
        // this.update();
    }


    public deleteFormula(formula: Formula) {
        this.formulas = this.formulas.filter((item) => item !== formula);
        this.items = this.items.filter((item) => item !== formula);
        formula.destroy();
        // this.update();
    }

    public deleteVariable(variable: FieldLink) {
        this.variables = this.variables.filter((item) => item !== variable);
        this.items = this.items.filter((item) => item !== variable);
        variable.destroy();
        // this.update();
    }

    public deleteOutput(output: FieldLink) {
        this.outputs = this.outputs.filter((item) => item !== output);
        this.items = this.items.filter((item) => item !== output);
        output.destroy();
        // this.update();
    }

    // public update() {
    //     this.onChange();
    // }

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
        const list = new Map<string, Formula | FieldLink>();
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
                if (old.type === 'function') {
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

        const dependencies = new Map<string, Formula>();
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

    private checkUnknowns(list: Map<string, Formula | FieldLink>, unknowns: string[]): boolean {
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

    public createContext(): Context | null {
        this.validate();
        if (this.valid) {
            return new Context([...this.variables, ...this.formulas]);
        } else {
            return null;
        }
    }
}
