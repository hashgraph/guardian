/**
 * CSV file
 */
export class CSV {
    /**
     * Buffer
     */
    private csvContent: string;
    /**
     * Separated Symbol
     */
    private separatedSymbol: string;

    constructor() {
        this.csvContent = 'data:text/csv;charset=utf-8;';
        this.separatedSymbol = '';
    }

    /**
     * Clear file
     * @public
     */
    public clear(): void {
        this.csvContent = 'data:text/csv;charset=utf-8;';
        this.separatedSymbol = '';
    }

    /**
     * Add value in file
     * @param value
     * @public
     */
    public add(value: any): CSV {
        if (value !== undefined) {
            this.csvContent += this.separatedSymbol + '"' + value + '"';
        } else {
            this.csvContent += this.separatedSymbol + '""';
        }
        this.separatedSymbol = ',';
        return this;
    }

    /**
     * Add new line in file
     * @public
     */
    public addLine(): CSV {
        this.csvContent += '\r\n';
        this.separatedSymbol = '';
        return this;
    }

    /**
     * Get buffer
     * @public
     */
    public result(): string {
        return this.csvContent;
    }
}