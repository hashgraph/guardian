/**
 * CSV file
 */
export class Table {
    /**
     * Name
     */
    public readonly name: string;
    /**
     * Lines
     */
    private _data: string[][];
    /**
     * Current line
     */
    private _line: string[];
    /**
     * Headers
     */
    private _headers: any[];

    private readonly csvSeparatedSymbol = ',';
    private readonly csvNewLineSymbol = '\r\n';

    constructor(name?: string) {
        this.name = name;
        this._headers = [];
        this._line = [];
        this._data = [this._line];
    }

    private toString(value: any): string {
        if (value) {
            if (Array.isArray(value)) {
                value.map(v => String(value)).join(', ');
            } else {
                return String(value);
            }
        }
        return '';
    }

    private toCsvValue(value: string): string {
        return '"' + value + '"';
    }

    /**
     * Clear file
     * @public
     */
    public clear(): void {
        this._headers = [];
        this._line = [];
        this._data = [this._line];
    }

    /**
     * Add value in file
     * @param value
     * @public
     */
    public addHeader(value: string, options: any = {}): Table {
        const header = {
            ...options,
            value,
            row: 1,
            col: this._headers.length + 1
        };
        this._headers.push(header);

        return this;
    }

    /**
     * Add value in file
     * @param value
     * @public
     */
    public add(value: any): Table {
        this._line.push(this.toString(value));
        return this;
    }

    /**
     * Add new line in file
     * @public
     */
    public addLine(): Table {
        this._line = [];
        this._data.push(this._line);
        return this;
    }

    /**
     * Get buffer
     * @public
     */
    public csv(): string {
        let csvContent: string = '';
        if (this._headers.length) {
            csvContent += this._headers
                .map(header => header.value)
                .join(this.csvSeparatedSymbol);
        }
        if (this._data.length) {
            csvContent += this.csvNewLineSymbol;
            csvContent += this._data
                .map(line => line
                    .map(value => this.toCsvValue(value))
                    .join(this.csvSeparatedSymbol))
                .join(this.csvNewLineSymbol);
        }
        return csvContent;
    }

    /**
     * Get buffer
     * @public
     */
    public get buffer(): string[][] {
        return this._data;
    }

    /**
     * Get buffer
     * @public
     */
    public get headers(): any[] {
        return this._headers;
    }
}