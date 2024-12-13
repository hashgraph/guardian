import { GenerateUUIDv4, IScoreData, IScoreOption } from "@guardian/interfaces";
import { VariableData } from "./variables";

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

    public static from(data?: IScoreData[]): ScoreData[] {
        if (Array.isArray(data)) {
            return data.map((e) => new ScoreData(e));
        }
        return [];
    }
}
