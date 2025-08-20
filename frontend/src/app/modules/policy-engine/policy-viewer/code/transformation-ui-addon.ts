export class TransformationUIAddonCode {
    private code: string;
    private func: Function;

    constructor(config: any) {
        this.code = config.expression || '';
        this.func = new Function('document', 'history', 'params', `
            ${this.code}
            return { document, history };
        `);
    }

    public async run(
        data: {
            document: any,
            params: any,
            history: any[]
        }
    ) {
        return this.func.apply(null, [
            data.document,
            data.history,
            data.params
        ]);
    }
}