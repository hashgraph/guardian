import { XmlTokenizer } from './xml-tokenizer.js';

export class NetworkLinkFinder {
    private count = 0;
    private readonly tokenizer = new XmlTokenizer(token => {
        if (token.type === 'start' && token.name === 'NetworkLink') { this.count += 1; }
    });

    public write(text: string): void {
        this.tokenizer.write(text);
    }

    public finish(): number {
        this.tokenizer.finish();
        return this.count;
    }
}
