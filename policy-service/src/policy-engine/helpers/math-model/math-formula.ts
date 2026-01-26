import { GenerateUUIDv4 } from '@guardian/interfaces';
import { MathItemType } from './math-item-type.js';
import { createComputeEngine, findCommand } from './utils.js';
import { IMathFormula } from './math.interface.js';

export class MathFormula {
    public type: MathItemType.FUNCTION | MathItemType.VARIABLE = MathItemType.VARIABLE;

    public readonly id: string;

    public functionNameText: string = '';
    public functionBodyText: string = '';
    public functionBodyJson: string = '';

    public functionName: string = '';
    public functionParams: string[] = [];
    public functionUnknowns: string[] = [];
    public functionBody: string = '';
    public validName: boolean = false;
    public validBody: boolean = false;
    public description: string | null = '';

    public error: string = '';
    public empty: boolean = true;
    public validated: boolean = false;

    public value: any;
    public view: string = 'formula';

    private bodyUnknowns: string[] = [];

    private subscriber: Function | null;

    public get valid(): boolean {
        return this.validName && this.validBody;
    }

    public get invalid(): boolean {
        return !this.valid;
    }

    public get name(): string {
        return this.functionName;
    }

    constructor(name?: string, body?: string) {
        this.id = GenerateUUIDv4();
        this.empty = !name && !body;
        this.functionNameText = name || '';
        this.functionBodyText = body || '';
        this.functionBodyJson = '';
    }

    private _setErrorName() {
        this.type = MathItemType.VARIABLE;
        this.functionName = '';
        this.functionParams = [];
        this.validName = false;
        this.error = 'Invalid name';
    }

    private _updateName() {
        try {
            const text = this.functionNameText.trim();
            if (!text) {
                this._setErrorName();
                return;
            }

            const items = text.match(/\b\w+\b/g) || [];
            const fName = items[0];
            const fParams = items.slice(1);
            if (!fName) {
                this._setErrorName();
                return;
            }

            if (fParams.length === 0) {
                this.type = MathItemType.VARIABLE;
                this.functionName = fName;
                this.functionParams = [];
                this.validName = true;
                return;
            }

            if (!(text.includes('(') && text.includes(')'))) {
                this._setErrorName();
                return;
            }

            const latex = text.replace(/(\b\w+\b)/g, '\\operatorname{$1}') + ' := 0';
            const ce = createComputeEngine();
            const f = ce.parse(latex);
            if (!f.isValid) {
                this._setErrorName();
                return;
            }

            const json = f.json as any;

            if (json.length !== 3 ||
                json[0] !== 'Assign' ||
                json[1] !== fName ||
                !Array.isArray(json[2])) {
                this._setErrorName();
                return;
            }

            if (json[2].length !== (fParams.length + 2) ||
                json[2][0] !== 'Function') {
                this._setErrorName();
                return;
            }

            for (let i = 0; i < fParams.length; i++) {
                if (json[2][i + 2] !== fParams[i]) {
                    this._setErrorName();
                    return;
                }
            }

            this.type = MathItemType.FUNCTION;
            this.functionName = fName;
            this.functionParams = fParams;
            this.validName = true;
        } catch (error) {
            this._setErrorName();
        }
    }

    private _updateBody() {
        try {
            this.functionBodyJson = '';
            const text = this.functionBodyText.trim();
            if (!text) {
                this.bodyUnknowns = [];
                this.validBody = false;
                this.error = 'Invalid function: empty';
                return;
            }
            if (text.includes('\\placeholder')) {
                this.bodyUnknowns = [];
                this.validBody = false;
                this.error = 'Invalid function: placeholder';
                return;
            }
            const ce = createComputeEngine();
            const p = ce.parse(text, { canonical: false });
            const commands = findCommand(p.json, 'Tuple');
            const indexes: string[] = [];
            for (const command of commands) {
                indexes.push(command[1]);
            }
            this.functionBodyJson = JSON.stringify(p.json, null, 4);
            this.bodyUnknowns = p.unknowns as string[];
            this.bodyUnknowns = this.bodyUnknowns.filter((u) => !indexes.includes(u));
            this.validBody = p.isValid;
            if (this.validBody) {
                this.functionBody = this.functionBodyText;
                this.error = '';
            } else {
                this.error = 'Invalid function: ' + p.value;
            }
        } catch (error) {
            this.bodyUnknowns = [];
            this.validBody = false;
            this.error = 'Invalid function: ' + error;
        }
    }

    public updateName() {
        this.validated = false;
        this.empty = false;
        this._updateName();
        if (this.subscriber) {
            this.subscriber();
        }
    }

    public updateBody() {
        this.validated = false;
        this.empty = false;
        this._updateBody();
        if (this.subscriber) {
            this.subscriber();
        }
    }

    public update() {
        this.validated = false;
        this.empty = false;
        this._updateName();
        this._updateBody();
        if (this.subscriber) {
            this.subscriber();
        }
    }

    public updateUnknowns() {
        const map = new Set<string>();
        if (this.functionParams) {
            for (const param of this.functionParams) {
                map.add(param);
            }
        }
        const list: string[] = [];
        if (this.bodyUnknowns) {
            for (const unknown of this.bodyUnknowns) {
                if (!map.has(unknown)) {
                    list.push(unknown);
                }
            }
        }
        this.functionUnknowns = list;
    }

    public subscribe(f: Function) {
        this.subscriber = f;
    }

    public destroy() {
        this.subscriber = null;
    }

    public validate() {
        this.validated = true;
        this._updateName();
        this._updateBody();
    }

    public getLatex(): string | null {
        if (this.invalid) {
            return null;
        }
        if (this.type === MathItemType.VARIABLE) {
            return this.__evaluateValue(this.functionBody);
        }
        if (this.type === MathItemType.FUNCTION) {
            return this.__evaluateFunction(this.functionParams, this.functionBody);
        }
        return null;
    }

    private __evaluateValue(body: string): string {
        return `${body}`;
    }

    private __evaluateFunction(params: string[], body: string): string {
        return `(${params.map((p => `\\operatorname{${p}}`)).join(',')}) \\mapsto ${body}`;
    }

    public toJson(): IMathFormula {
        return {
            type: this.type,
            name: this.functionName || '',
            body: this.functionBodyText || '',
            params: this.functionParams || [],
            relationships: this.functionUnknowns || [],
            description: this.description || '',
        }
    }

    public static from(json: IMathFormula): MathFormula | null {
        if (!json || typeof json !== 'object') {
            return null;
        }
        try {
            if (json.type === MathItemType.VARIABLE) {
                const item = new MathFormula(json.name, json.body);
                item.description = json.description || '';
                item.empty = false;
                return item;
            } else {
                const params = (json.params || []).join(',');
                const name = `${json.name}(${params})`;
                const item = new MathFormula(name, json.body);
                item.description = json.description || '';
                item.empty = false;
                return item;
            }
        } catch (error) {
            return null;
        }
    }

    public static createSystemFunctions(): MathFormula[] {
        const result: MathFormula[] = [];
        result.push(new MathFormula('size(array)', '\\operatorname{Round}(\\operatorname{Length}(\\operatorname{array}))'));
        for (const item of result) {
            item.update();
        }
        return result;
    }
}
