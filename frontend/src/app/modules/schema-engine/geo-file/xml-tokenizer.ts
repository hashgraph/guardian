export type XmlToken =
    | { type: 'start'; name: string; selfClosing: boolean }
    | { type: 'end'; name: string }
    | { type: 'text'; value: string };

export class XmlTokenizer {
    private buffer = '';
    private cursor = 0;
    private entityTail = '';

    constructor(
        private readonly emit: (token: XmlToken) => void,
        private readonly shouldStop: () => boolean = () => false
    ) {}

    write(text: string): void {
        if (!text || this.shouldStop()) return;
        this.compact();
        this.buffer += text;
        this.parse(false);
        this.compact();
    }

    finish(): void {
        if (this.shouldStop()) {
            this.clear();
            return;
        }
        this.parse(true);
        if (this.shouldStop()) {
            this.clear();
            return;
        }
        if (this.cursor < this.buffer.length) {
            this.emitText(this.buffer.slice(this.cursor), true);
            this.cursor = this.buffer.length;
        }
        if (this.entityTail) {
            this.emit({ type: 'text', value: this.entityTail });
            this.entityTail = '';
        }
        this.compact();
    }

    private parse(final: boolean): void {
        while (this.cursor < this.buffer.length && !this.shouldStop()) {
            if (this.buffer[this.cursor] !== '<') {
                const index = this.buffer.indexOf('<', this.cursor);
                if (index < 0) {
                    this.emitText(this.buffer.slice(this.cursor), final);
                    this.cursor = this.buffer.length;
                    return;
                }
                this.emitText(this.buffer.slice(this.cursor, index), true);
                this.cursor = index;
                continue;
            }
            if (!final && this.isPartialMarkup()) return;
            if (this.buffer.startsWith('<!--', this.cursor)) {
                const end = this.buffer.indexOf('-->', this.cursor + 4);
                if (end < 0) return;
                this.cursor = end + 3;
                continue;
            }
            if (this.buffer.startsWith('<![CDATA[', this.cursor)) {
                const end = this.buffer.indexOf(']]>', this.cursor + 9);
                if (end < 0) return;
                this.emit({ type: 'text', value: this.buffer.slice(this.cursor + 9, end) });
                this.cursor = end + 3;
                continue;
            }
            if (this.buffer.startsWith('<?', this.cursor)) {
                const end = this.buffer.indexOf('?>', this.cursor + 2);
                if (end < 0) return;
                this.cursor = end + 2;
                continue;
            }
            if (this.buffer.slice(this.cursor, this.cursor + 9).toUpperCase() === '<!DOCTYPE') {
                const end = this.findDoctypeEnd(this.cursor + 2);
                if (end < 0) return;
                this.cursor = end + 1;
                continue;
            }
            if (this.buffer.startsWith('<!', this.cursor)) {
                const end = this.findTagEnd(this.cursor + 2);
                if (end < 0) return;
                this.cursor = end + 1;
                continue;
            }
            const end = this.findTagEnd(this.cursor + 1);
            if (end < 0) return;
            const raw = this.buffer.slice(this.cursor + 1, end).trim();
            this.cursor = end + 1;
            if (!raw) continue;
            if (raw[0] === '/') {
                this.emit({ type: 'end', name: raw.slice(1).trim().split(/\s/, 1)[0] });
                continue;
            }
            const selfClosing = raw.endsWith('/');
            const body = selfClosing ? raw.slice(0, -1).trim() : raw;
            const name = body.split(/\s/, 1)[0];
            this.emit({ type: 'start', name, selfClosing });
            if (selfClosing) this.emit({ type: 'end', name });
        }
    }

    private isPartialMarkup(): boolean {
        const tail = this.buffer.slice(this.cursor, this.cursor + 9);
        return '<!--'.startsWith(tail) ||
            '<![CDATA['.startsWith(tail) ||
            '<!DOCTYPE'.startsWith(tail.toUpperCase()) ||
            '<?'.startsWith(tail);
    }

    private findTagEnd(start: number): number {
        let quote = '';
        for (let index = start; index < this.buffer.length; index += 1) {
            const character = this.buffer[index];
            if (quote) {
                if (character === quote) quote = '';
            } else if (character === '"' || character === "'") {
                quote = character;
            } else if (character === '>') {
                return index;
            }
        }
        return -1;
    }

    private findDoctypeEnd(start: number): number {
        let quote = '';
        let subsetDepth = 0;
        for (let index = start; index < this.buffer.length; index += 1) {
            const character = this.buffer[index];
            if (quote) {
                if (character === quote) quote = '';
                continue;
            }
            if (character === '"' || character === "'") quote = character;
            else if (character === '[') subsetDepth += 1;
            else if (character === ']') subsetDepth = Math.max(0, subsetDepth - 1);
            else if (character === '>' && subsetDepth === 0) return index;
        }
        return -1;
    }

    private compact(): void {
        if (this.shouldStop()) {
            this.clear();
        } else if (this.cursor > 0) {
            this.buffer = this.buffer.slice(this.cursor);
            this.cursor = 0;
        }
    }

    private clear(): void {
        this.buffer = '';
        this.cursor = 0;
        this.entityTail = '';
    }

    private emitText(text: string, flush: boolean): void {
        let value = this.entityTail + text;
        this.entityTail = '';
        if (!flush) {
            const ampersand = value.lastIndexOf('&');
            const semicolon = value.lastIndexOf(';');
            if (ampersand > semicolon) {
                this.entityTail = value.slice(ampersand);
                value = value.slice(0, ampersand);
            }
        }
        if (!value) return;
        const decoded = value.replace(
            /&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/g,
            (_match, entity: string) => this.decodeEntity(entity)
        );
        if (decoded) this.emit({ type: 'text', value: decoded });
    }

    private decodeEntity(entity: string): string {
        if (entity === 'amp') return '&';
        if (entity === 'lt') return '<';
        if (entity === 'gt') return '>';
        if (entity === 'quot') return '"';
        if (entity === 'apos') return "'";
        const code = entity[1] === 'x'
            ? Number.parseInt(entity.slice(2), 16)
            : Number.parseInt(entity.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : `&${entity};`;
    }
}
