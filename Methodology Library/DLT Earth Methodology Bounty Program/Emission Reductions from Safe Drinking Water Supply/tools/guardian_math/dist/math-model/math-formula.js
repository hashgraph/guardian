import { GenerateUUIDv4 } from '../gi/index.js';
import { MathItemType } from './math-item.type.js';
import { createComputeEngine, findCommand } from './utils.js';
export class MathFormula {
    type = MathItemType.VARIABLE;
    id;
    functionNameText = '';
    functionBodyText = '';
    functionBodyJson = '';
    functionName = '';
    functionParams = [];
    functionUnknowns = [];
    functionBody = '';
    validName = false;
    validBody = false;
    description = '';
    error = '';
    empty = true;
    validated = false;
    value;
    view = 'formula';
    bodyUnknowns = [];
    subscriber;
    get valid() {
        return this.validName && this.validBody;
    }
    get invalid() {
        return !this.valid;
    }
    get name() {
        return this.functionName;
    }
    constructor(name, body) {
        this.id = GenerateUUIDv4();
        this.empty = !name && !body;
        this.functionNameText = name || '';
        this.functionBodyText = body || '';
        this.functionBodyJson = '';
    }
    _setErrorName() {
        this.type = MathItemType.VARIABLE;
        this.functionName = '';
        this.functionParams = [];
        this.validName = false;
        this.error = 'Invalid name';
    }
    _updateName() {
        try {
            const text = this.functionNameText.trim();
            if (!text) {
                this._setErrorName();
                return;
            }
            if (!text.includes('(')) {
                // Variable: no parentheses.
                // Allow subscript notation like fNRB_y,i — commas are normalized to underscores for CE.
                if (!(/^[A-Za-z]\w*(?:,\w+)*$/).test(text)) {
                    this._setErrorName();
                    return;
                }
                this.type = MathItemType.VARIABLE;
                this.functionName = text.replace(/,/g, '_');
                this.functionParams = [];
                this.validName = true;
                return;
            }
            // Function: has parentheses.
            const items = text.match(/\b\w+\b/g) || [];
            const fName = items[0];
            const fParams = items.slice(1);
            if (!fName || !(/^[A-Za-z]\w*$/).test(fName)) {
                this._setErrorName();
                return;
            }
            if (!text.includes(')')) {
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
            const json = f.json;
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
        }
        catch (error) {
            this._setErrorName();
        }
    }
    _updateBody() {
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
            const indexes = [];
            for (const command of commands) {
                indexes.push(command[1]);
            }
            this.functionBodyJson = JSON.stringify(p.json, null, 4);
            this.bodyUnknowns = p.unknowns;
            this.bodyUnknowns = this.bodyUnknowns.filter((u) => !indexes.includes(u));
            this.validBody = p.isValid;
            if (this.validBody) {
                this.functionBody = this.functionBodyText;
                this.error = '';
            }
            else {
                this.error = 'Invalid function: ' + p.value;
            }
        }
        catch (error) {
            this.bodyUnknowns = [];
            this.validBody = false;
            this.error = 'Invalid function: ' + error;
        }
    }
    updateName() {
        this.validated = false;
        this.empty = false;
        this._updateName();
        if (this.subscriber) {
            this.subscriber();
        }
    }
    updateBody() {
        this.validated = false;
        this.empty = false;
        this._updateBody();
        if (this.subscriber) {
            this.subscriber();
        }
    }
    update() {
        this.validated = false;
        this.empty = false;
        this._updateName();
        this._updateBody();
        if (this.subscriber) {
            this.subscriber();
        }
    }
    updateUnknowns() {
        const map = new Set();
        if (this.functionParams) {
            for (const param of this.functionParams) {
                map.add(param);
            }
        }
        const list = [];
        if (this.bodyUnknowns) {
            for (const unknown of this.bodyUnknowns) {
                if (!map.has(unknown)) {
                    list.push(unknown);
                }
            }
        }
        this.functionUnknowns = list;
    }
    subscribe(f) {
        this.subscriber = f;
    }
    destroy() {
        this.subscriber = null;
    }
    validate() {
        this.validated = true;
        this._updateName();
        this._updateBody();
    }
    getLatex() {
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
    __evaluateValue(body) {
        return `${body}`;
    }
    __evaluateFunction(params, body) {
        return `(${params.map((p => `\\operatorname{${p}}`)).join(',')}) \\mapsto ${body}`;
    }
    toJson() {
        return {
            type: this.type,
            name: this.type === MathItemType.VARIABLE
                ? (this.functionNameText || '')
                : (this.functionName || ''),
            body: this.functionBodyText || '',
            params: this.functionParams || [],
            relationships: this.functionUnknowns || [],
            description: this.description || '',
        };
    }
    static from(json) {
        if (!json || typeof json !== 'object') {
            return null;
        }
        try {
            if (json.type === MathItemType.VARIABLE) {
                const item = new MathFormula(json.name, json.body);
                item.description = json.description || '';
                item.empty = false;
                return item;
            }
            else {
                const params = (json.params || []).join(',');
                const name = `${json.name}(${params})`;
                const item = new MathFormula(name, json.body);
                item.description = json.description || '';
                item.empty = false;
                return item;
            }
        }
        catch (error) {
            return null;
        }
    }
    static createSystemFunctions() {
        const result = [];
        result.push(new MathFormula('size(array)', '\\operatorname{Round}(\\operatorname{Length}(\\operatorname{array}))'));
        for (const item of result) {
            item.update();
        }
        return result;
    }
}
