export class ValidateScore {
    public readonly id: string;
    public readonly name: string;

    private readonly score: any;
    private readonly names: string[];

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
        this.score = {};
        this.names = [];
    }

    public setVariable(name: string, value: any) {
        this.score[name] = value;
    }

    public getScore(): any {
        return this.score;
    }

    public setName(name: string): void {
        this.names.push(name);
    }

    public getName(): string[] {
        return this.names;
    }
}