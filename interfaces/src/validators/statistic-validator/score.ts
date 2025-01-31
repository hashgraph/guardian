import { GenerateUUIDv4 } from '../../helpers/index.js';
import { IScoreData, IScoreOption } from '../../interface/index.js';
import { VariableData } from './variables.js';

export class ScoreData implements IScoreData {
    public id: string;
    public type: string;
    public description: string;
    public relationships: string[];
    public options: IScoreOption[];

    public value: any;
    public _relationships: VariableData[];
    public _options: {
        id: string;
        description: string;
        value: string | number;
    }[];

    constructor(item: IScoreData) {
        this.id = item.id;
        this.type = item.type;
        this.description = item.description;
        this.relationships = item.relationships || [];
        this.options = item.options || [];
    }

    public setRelationships(variables: VariableData[]) {
        if (Array.isArray(variables)) {
            this._relationships = this.relationships
                .map((id) => {
                    return variables.find((v) => v.id === id);
                })
                .filter((v) => v !== undefined) as VariableData[];
        } else {
            this._relationships = [];
        }
        if (Array.isArray(this.options)) {
            this._options = this.options
                .map((option) => {
                    return {
                        id: GenerateUUIDv4(),
                        description: option.description,
                        value: option.value
                    };
                });
        } else {
            this._options = [];
        }
    }

    public setValue(value: any): void {
        const option = this.options.find((o) => o.description === value);
        this.value = option?.value || value;
    }

    public getValue(): any {
        const option = this.options.find((o) => o.value === this.value);
        return option?.description || String(this.value);
    }

    public validate(value: any): boolean {
        const option = this.options.find((o) => o.value === value);
        return this.value === value && !!option;
    }

    public static from(data?: IScoreData[]): ScoreData[] {
        if (Array.isArray(data)) {
            return data.map((e) => new ScoreData(e));
        }
        return [];
    }
}
