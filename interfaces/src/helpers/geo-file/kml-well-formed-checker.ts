import { XmlToken, XmlTokenizer } from './xml-tokenizer.js';

export class KmlWellFormedChecker {
    private readonly open: string[] = [];
    private roots = 0;
    private broken = false;
    private readonly tokenizer = new XmlTokenizer(token => this.accept(token), () => false, true);

    public write(text: string): void {
        if (this.broken) { return; }
        try { this.tokenizer.write(text); } catch { this.broken = true; }
    }

    public finish(): boolean {
        try { this.tokenizer.finish(); } catch { this.broken = true; }
        return !this.broken && !this.tokenizer.incomplete && !this.tokenizer.invalid && this.roots === 1 && this.open.length === 0;
    }

    private accept(token: XmlToken): void {
        if (token.type === 'start') {
            if (!this.open.length) { this.roots += 1; }
            this.open.push(token.name);
        } else if (token.type === 'end') {
            if (this.open.pop() !== token.name) { this.broken = true; }
        } else if (!this.open.length && token.value.trim()) {
            this.broken = true;
        }
    }
}
