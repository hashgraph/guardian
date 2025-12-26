import { GenerateUUIDv4 } from '@guardian/interfaces';
import { convertValue } from './models';

export class FieldLink {
    public readonly type = 'link';

    public readonly id: string;
    public variableNameText: string = '';
    public variableName: string = '';
    public validName: boolean = false;
    public validField: boolean = false;

    public schema: string | null = '';
    public field: string | null = '';

    public value: any;

    public error: string = '';
    public empty: boolean = true;
    public validated: boolean = false;

    private subscriber: Function | null;

    public get name(): string {
        return this.variableName;
    }

    public get valid(): boolean {
        return this.validName && this.validField;
    }

    public get path(): string {
        return this.field || '';
    }

    public get invalid(): boolean {
        return !this.valid;
    }

    constructor() {
        this.id = GenerateUUIDv4();
        this.empty = true;
    }

    private _update() {
        try {
            const text = this.variableNameText.trim();
            if (!text) {
                this.validName = false;
            } else {
                if ((/^[A-Za-z]\w*$/).test(text)) {
                    this.variableName = text;
                    this.validName = true;
                } else {
                    this.validName = false;
                }
            }

            if (this.field) {
                this.validField = true;
            } else {
                this.validField = false;
            }

            if (!this.validName) {
                this.error = 'Invalid name';
            } else if (!this.validField) {
                this.error = 'Invalid field';
            } else {
                this.error = '';
            }
        } catch (error) {
            this.validName = false;
            this.error = 'Invalid name';
        }
    }

    public update() {
        this.validated = false;
        this.empty = false;
        this._update();
        if (this.subscriber) {
            this.subscriber();
        }
    }

    public subscribe(f: Function) {
        this.subscriber = f;
    }

    public destroy() {
        this.subscriber = null;
    }

    public validate() {
        this.validated = true;
        this._update();
    }

    public getLatex(): string | null {
        if (this.invalid) {
            return null;
        }
        return convertValue(this.value);
    }
}
