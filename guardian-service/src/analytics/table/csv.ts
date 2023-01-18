export class CSV {
    private csvContent: string;
    private separatedSymbol: string;

    constructor() {
        this.csvContent = 'data:text/csv;charset=utf-8;';
        this.separatedSymbol = '';
    }

    public clear(): void {
        this.csvContent = 'data:text/csv;charset=utf-8;';
        this.separatedSymbol = '';
    }

    public add(value: any): CSV {
        if (value !== undefined) {
            this.csvContent += this.separatedSymbol + '"' + value + '"';
        } else {
            this.csvContent += this.separatedSymbol + '""';
        }
        this.separatedSymbol = ',';
        return this;
    }

    public addLine(): CSV {
        this.csvContent += '\r\n';
        this.separatedSymbol = '';
        return this;
    }

    public result(): string {
        return this.csvContent;
    }
}