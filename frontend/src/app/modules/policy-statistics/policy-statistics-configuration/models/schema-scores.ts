export interface IScoreOption {
    description: string;
    value: number;
}

export interface IScoreData {
    id: string;
    type: string;
    description: string;
    relationships: string[];
    options: IScoreOption[];
}

export class SchemaScore implements IScoreData {
    public id: string;
    public type: string;
    public description: string;
    public relationships: string[];
    public options: IScoreOption[];
    public index: number;

    constructor() {
        this.type = 'string';
    }

    public getJson(): IScoreData {
        return {
            id: this.id,
            type: this.type,
            description: this.description,
            relationships: this.relationships,
            options: this.options
        }
    }

    public static fromData(data: IScoreData): SchemaScore {
        const formula = new SchemaScore();
        formula.id = data.id;
        formula.type = data.type || 'string';
        formula.description = data.description;
        formula.relationships = data.relationships;
        formula.options = (data.options || []).slice();
        return formula;
    }

    public add() {
        this.options.push({
            description: '',
            value: 0
        });
    }
    public delete(option: IScoreOption) {
        this.options = this.options.filter((o) => o !== option);
    }
}

export class SchemaScores {
    private readonly symbol = 'B';
    private startIndex: number = 1;

    public scores: SchemaScore[];
    public names: Set<string>;

    constructor() {
        this.scores = [];
        this.names = new Set<string>();
    }

    public setDefault() {
        this.names.clear();
        this.startIndex = 1;
    }

    public getName(): string {
        let name: string = '';
        for (let index = this.startIndex; index < 1000000; index++) {
            name = `${this.symbol}${index}`;
            if (!this.names.has(name)) {
                this.names.add(name);
                return name;
            }
        }
        return name;
    }

    public add() {
        const score = new SchemaScore();
        score.id = this.getName();
        this.scores.push(score);
    }
    public delete(score: SchemaScore) {
        this.scores = this.scores.filter((f) => f !== score);
        if (this.scores.length === 0) {
            this.setDefault();
        }
    }

    public fromData(data: IScoreData[]) {
        this.scores = [];
        if (data) {
            for (let index = 0; index < data.length; index++) {
                const item = data[index];
                const score = SchemaScore.fromData(item);
                score.index = index;
                this.scores.push(score);
            }
        }
        for (const item of this.scores) {
            this.names.add(item.id);
        }
        this.startIndex = this.scores.length + 1;
        if (this.scores.length === 0) {
            this.setDefault();
        }
    }

    public getJson(): any[] {
        return this.scores.map((f) => f.getJson());
    }
}