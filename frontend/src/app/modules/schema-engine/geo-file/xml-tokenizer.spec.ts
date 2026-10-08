import { XmlTokenizer } from './xml-tokenizer';

describe('XmlTokenizer', () => {
    it('stops inside the current chunk when the consumer settles', () => {
        let stopped = false;
        const names: string[] = [];
        const tokenizer = new XmlTokenizer(token => {
            if (token.type === 'start') names.push(token.name);
            if (token.type === 'end' && token.name === 'Placemark') stopped = true;
        }, () => stopped);
        const tail = '<Folder/>'.repeat(120000);
        const started = performance.now();

        tokenizer.write('<Placemark><Point><coordinates>1,2</coordinates></Point></Placemark>' + tail);

        expect(stopped).toBeTrue();
        expect(names).toEqual(['Placemark', 'Point', 'coordinates']);
        expect(performance.now() - started).toBeLessThan(5000);
    });

    it('parses a one-megabyte chunk in linear time', () => {
        let tokenCount = 0;
        const tokenizer = new XmlTokenizer(() => {
            tokenCount += 1;
        });
        const repeat = 120000;
        const input = '<Folder/>'.repeat(repeat);
        const started = performance.now();

        tokenizer.write(input);
        tokenizer.finish();

        expect(input.length).toBeGreaterThan(1024 * 1024);
        expect(tokenCount).toBe(repeat * 2);
        expect(performance.now() - started).toBeLessThan(5000);
    });
});
