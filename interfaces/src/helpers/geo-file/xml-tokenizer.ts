export type XmlToken =
    | { type: 'start'; name: string; selfClosing: boolean }
    | { type: 'end'; name: string }
    | { type: 'text'; value: string };

const XML_NAME = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}][:A-Z_a-z0-9.\-\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0300-\u036F\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}]*/u;

export class XmlTokenizer {
    public invalid = false;
    private buffer = '';
    private cursor = 0;
    private entityTail = '';
    public incomplete = false;
    private section: 'comment' | 'cdata' | null = null;

    constructor(
        private readonly emit: (token: XmlToken) => void,
        private readonly shouldStop: () => boolean = () => false,
        private readonly strictMarkup = false
    ) {}

    write(text: string): void {
        if (!text || this.shouldStop()) { return; }
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
        this.incomplete = this.section !== null || this.buffer.slice(this.cursor).startsWith('<');
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
            if (this.section) {
                const delimiter = this.section === 'comment' ? '-->' : ']]>';
                const end = this.buffer.indexOf(delimiter, this.cursor);
                const contentEnd = end < 0
                    ? Math.max(this.cursor, this.buffer.length - (final ? 0 : 2))
                    : end;
                if (this.section === 'cdata' && contentEnd > this.cursor) {
                    this.emit({ type: 'text', value: this.buffer.slice(this.cursor, contentEnd) });
                }
                this.cursor = contentEnd;
                if (end < 0) { return; }
                this.cursor = end + delimiter.length;
                this.section = null;
                continue;
            }
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
            if (!final && this.isPartialMarkup()) { return; }
            if (this.buffer.startsWith('<!--', this.cursor)) {
                this.cursor += 4;
                this.section = 'comment';
                continue;
            }
            if (this.buffer.startsWith('<![CDATA[', this.cursor)) {
                this.cursor += 9;
                this.section = 'cdata';
                continue;
            }
            if (this.buffer.startsWith('<?', this.cursor)) {
                const end = this.buffer.indexOf('?>', this.cursor + 2);
                if (end < 0) { return; }
                this.cursor = end + 2;
                continue;
            }
            if (this.buffer.slice(this.cursor, this.cursor + 9).toUpperCase() === '<!DOCTYPE') {
                const end = this.findDoctypeEnd(this.cursor + 2);
                if (end < 0) { return; }
                this.cursor = end + 1;
                continue;
            }
            if (this.buffer.startsWith('<!', this.cursor)) {
                const end = this.findTagEnd(this.cursor + 2);
                if (end < 0) { return; }
                this.cursor = end + 1;
                continue;
            }
            const tagEnd = this.findTagEnd(this.cursor + 1);
            if (tagEnd < 0) { return; }
            const markup = this.buffer.slice(this.cursor + 1, tagEnd);
            const raw = markup.trim();
            if (this.strictMarkup && (/^[\t\r\n ]/.test(markup) || /\/[\t\r\n ]+$/.test(markup))) { this.invalid = true; }
            this.cursor = tagEnd + 1;
            if (!raw) { if (this.strictMarkup) { this.invalid = true; } continue; }
            if (this.strictMarkup && !this.validTag(raw)) { this.invalid = true; }
            if (raw[0] === '/') {
                this.emit({ type: 'end', name: raw.slice(1).trim().split(/\s/, 1)[0] });
                continue;
            }
            const selfClosing = raw.endsWith('/');
            const body = selfClosing ? raw.slice(0, -1).trim() : raw;
            const name = body.split(/\s/, 1)[0];
            this.emit({ type: 'start', name, selfClosing });
            if (selfClosing) { this.emit({ type: 'end', name }); }
        }
    }

    private validTag(raw: string): boolean {
        const closing = raw.startsWith('/');
        const selfClosing = raw.endsWith('/');
        const body = closing ? raw.slice(1) : selfClosing ? raw.slice(0, -1) : raw;
        const name = body.match(XML_NAME)?.[0];
        if (!name) { return false; }
        let rest = body.slice(name.length);
        if (closing) { return !selfClosing && !rest.trim(); }
        const attributes = new Set<string>();
        while (rest.trim()) {
            if (!/^[\t\n\r ]/.test(rest)) { return false; }
            rest = rest.trimStart();
            const attribute = rest.match(XML_NAME)?.[0];
            if (!attribute || attributes.has(attribute)) { return false; }
            attributes.add(attribute);
            rest = rest.slice(attribute.length).trimStart();
            if (!rest.startsWith('=')) { return false; }
            rest = rest.slice(1).trimStart();
            const quote = rest[0];
            if (quote !== '"' && quote !== '\'') { return false; }
            const end = rest.indexOf(quote, 1);
            if (end < 0 || rest.slice(1, end).includes('<')) { return false; }
            rest = rest.slice(end + 1);
        }
        return true;
    }

    private isPartialMarkup(): boolean {
        const tail = this.buffer.slice(this.cursor, this.cursor + 9);
        return ['<!--', '<![CDATA[', '<!DOCTYPE', '<?'].some(marker =>
            tail.length < marker.length && marker.startsWith(tail.toUpperCase())
        );
    }

    private findTagEnd(start: number): number {
        let quote = '';
        for (let index = start; index < this.buffer.length; index += 1) {
            const character = this.buffer[index];
            if (quote) {
                if (character === quote) { quote = ''; }
            } else if (character === '"' || character === '\'') {
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
                if (character === quote) { quote = ''; }
                continue;
            }
            if (character === '"' || character === '\'') { quote = character; }
            else if (character === '[') { subsetDepth += 1; }
            else if (character === ']') { subsetDepth = Math.max(0, subsetDepth - 1); }
            else if (character === '>' && subsetDepth === 0) { return index; }
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
        this.section = null;
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
        if (!value) { return; }
        const decoded = value.replace(
            /&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/g,
            (_match, entity: string) => this.decodeEntity(entity)
        );
        if (decoded) { this.emit({ type: 'text', value: decoded }); }
    }

    private decodeEntity(entity: string): string {
        if (entity === 'amp') { return '&'; }
        if (entity === 'lt') { return '<'; }
        if (entity === 'gt') { return '>'; }
        if (entity === 'quot') { return '"'; }
        if (entity === 'apos') { return '\''; }
        const code = entity[1] === 'x'
            ? Number.parseInt(entity.slice(2), 16)
            : Number.parseInt(entity.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : `&${entity};`;
    }
}
