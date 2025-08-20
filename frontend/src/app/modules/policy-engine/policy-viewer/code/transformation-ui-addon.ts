export class TransformationUIAddonCode {
    private code: string;
    private func: Function;

    constructor(config: any) {
        this.code = config.expression || '';

        const code =  `
            ${this.code}
            return { document, history, params };
        `;
        console.log(code);
        this.func = new Function('document', 'history', 'params', code);
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