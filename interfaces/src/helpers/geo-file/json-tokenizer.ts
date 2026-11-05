export type JsonEvent =
    | { type: 'startObject' | 'endObject' | 'startArray' | 'endArray' }
    | { type: 'key'; name: string }
    | { type: 'string'; head: string; truncated: boolean }
    | { type: 'number'; value: number }
    | { type: 'boolean'; value: boolean }
    | { type: 'null' };

type Context = { kind: 'object' | 'array'; state: string };

export class JsonSyntaxError extends Error {}

export class JsonTokenizer {
    private readonly stack: Context[] = [];
    private root = false;
    private offset = 0;
    private mode: 'string' | 'number' | 'literal' | null = null;
    private key = false;
    private head = '';
    private truncated = false;
    private escape = false;
    private unicode = '';
    private unicodeLeft = 0;
    private literal = '';
    private literalIndex = 0;
    private numberState = '';
    private negative = false;
    private digits = '';
    private significantCount = 0;
    private fractionCount = 0;
    private exponent = 0;
    private exponentNegative = false;

    constructor(private readonly emit: (event: JsonEvent) => void) {}

    public write(text: string): void {
        let index = 0;
        while (index < text.length) {
            const character = text[index];
            if (this.mode === 'string') this.stringCharacter(character);
            else if (this.mode === 'literal') {
                if (character !== this.literal[this.literalIndex++]) this.fail();
                if (this.literalIndex === this.literal.length) {
                    this.mode = null;
                    this.emit(this.literal === 'null' ? { type: 'null' } : { type: 'boolean', value: this.literal === 'true' });
                }
            } else if (this.mode === 'number') {
                if (!this.numberCharacter(character)) {
                    this.finishNumber();
                    continue;
                }
            } else this.structural(character);
            index += 1;
            this.offset += 1;
        }
    }

    public finish(): void {
        if (this.mode === 'number') this.finishNumber();
        if (this.mode || this.stack.length || !this.root) this.fail();
    }

    private fail(): never {
        throw new JsonSyntaxError(`Invalid JSON at character ${this.offset}.`);
    }

    private beginValue(): void {
        const parent = this.stack[this.stack.length - 1];
        if (!parent) {
            if (this.root) this.fail();
            this.root = true;
        } else {
            if (parent.state !== 'value' && !(parent.kind === 'array' && parent.state === 'valueOrEnd')) this.fail();
            parent.state = 'commaOrEnd';
        }
    }

    private structural(character: string): void {
        if (character === ' ' || character === '\n' || character === '\r' || character === '\t') return;
        const parent = this.stack[this.stack.length - 1];
        if (character === '}' || character === ']') {
            if (!parent || parent.kind !== (character === '}' ? 'object' : 'array') ||
                !['keyOrEnd', 'valueOrEnd', 'commaOrEnd'].includes(parent.state)) this.fail();
            this.stack.pop();
            this.emit({ type: character === '}' ? 'endObject' : 'endArray' });
        } else if (character === ':') {
            if (!parent || parent.state !== 'colon') this.fail();
            parent.state = 'value';
        } else if (character === ',') {
            if (!parent || parent.state !== 'commaOrEnd') this.fail();
            parent.state = parent.kind === 'object' ? 'key' : 'value';
        } else if (character === '"') {
            this.key = parent?.kind === 'object' && ['key', 'keyOrEnd'].includes(parent.state);
            if (!this.key) this.beginValue();
            this.mode = 'string'; this.head = ''; this.truncated = false;
        } else if (character === '{' || character === '[') {
            this.beginValue();
            this.stack.push({ kind: character === '{' ? 'object' : 'array', state: character === '{' ? 'keyOrEnd' : 'valueOrEnd' });
            this.emit({ type: character === '{' ? 'startObject' : 'startArray' });
        } else if (character === 't' || character === 'f' || character === 'n') {
            this.beginValue(); this.literal = character === 't' ? 'true' : character === 'f' ? 'false' : 'null';
            this.literalIndex = 1; this.mode = 'literal';
        } else if (character === '-' || (character >= '0' && character <= '9')) {
            this.beginValue(); this.mode = 'number'; this.numberState = 'start';
            this.negative = false; this.digits = ''; this.significantCount = 0; this.fractionCount = 0;
            this.exponent = 0; this.exponentNegative = false;
            this.numberCharacter(character);
        } else this.fail();
    }

    private append(character: string): void {
        if (this.head.length < 64) this.head += character;
        else this.truncated = true;
    }

    private stringCharacter(character: string): void {
        if (this.unicodeLeft) {
            if (!/^[0-9a-fA-F]$/.test(character)) this.fail();
            this.unicode += character;
            if (--this.unicodeLeft === 0) this.append(String.fromCharCode(Number.parseInt(this.unicode, 16)));
        } else if (this.escape) {
            this.escape = false;
            if (character === 'u') { this.unicode = ''; this.unicodeLeft = 4; }
            else {
                const escaped: Record<string, string> = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
                if (!(character in escaped)) this.fail();
                this.append(escaped[character]);
            }
        } else if (character === '\\') this.escape = true;
        else if (character === '"') {
            this.mode = null;
            if (this.key) {
                this.stack[this.stack.length - 1].state = 'colon';
                this.emit({ type: 'key', name: this.truncated ? this.head + '…' : this.head });
            } else this.emit({ type: 'string', head: this.head, truncated: this.truncated });
        } else {
            if (character.charCodeAt(0) < 32) this.fail();
            this.append(character);
        }
    }

    private numberCharacter(character: string): boolean {
        const digit = character >= '0' && character <= '9';
        if (digit) {
            if (this.numberState === 'zero') this.fail();
            if (['exp', 'expSign', 'expDigits'].includes(this.numberState)) {
                this.numberState = 'expDigits';
                this.exponent = Math.min(1e9, this.exponent * 10 + Number(character));
                return true;
            }
            if (['dot', 'fraction'].includes(this.numberState)) {
                this.numberState = 'fraction'; this.fractionCount += 1;
            } else this.numberState = this.numberState === 'start' || this.numberState === 'sign'
                ? character === '0' ? 'zero' : 'integer' : 'integer';
            if (character !== '0' || this.significantCount) {
                this.significantCount += 1;
                if (this.digits.length < 32) this.digits += character;
            }
            return true;
        }
        if (character === '-' && this.numberState === 'start') { this.negative = true; this.numberState = 'sign'; return true; }
        if (character === '.' && ['zero', 'integer'].includes(this.numberState)) { this.numberState = 'dot'; return true; }
        if ((character === 'e' || character === 'E') && ['zero', 'integer', 'fraction'].includes(this.numberState)) { this.numberState = 'exp'; return true; }
        if ((character === '+' || character === '-') && this.numberState === 'exp') { this.exponentNegative = character === '-'; this.numberState = 'expSign'; return true; }
        return false;
    }

    private finishNumber(): void {
        if (!['zero', 'integer', 'fraction', 'expDigits'].includes(this.numberState)) this.fail();
        const exponent = this.significantCount - this.digits.length - this.fractionCount + (this.exponentNegative ? -this.exponent : this.exponent);
        const value = this.significantCount ? Number(`${this.negative ? '-' : ''}${this.digits}e${exponent}`) : this.negative ? -0 : 0;
        this.mode = null;
        this.emit({ type: 'number', value });
    }
}
