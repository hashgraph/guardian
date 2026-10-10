import { XmlTokenizer } from './xml-tokenizer';

describe('XmlTokenizer', () => {
    for (const section of ['comment', 'cdata']) {
        it(`keeps a long ${section} bounded across chunks`, () => {
            const names: string[] = [];
            let textLength = 0;
            const tokenizer = new XmlTokenizer(token => {
                if (token.type === 'start') names.push(token.name);
                if (token.type === 'text') textLength += token.value.length;
            });
            tokenizer.write(section === 'comment' ? '<kml><!--' : '<kml><![CDATA[');
            const chunk = 'a'.repeat(16384);
            for (let index = 0; index < 16; index++) {
                tokenizer.write(chunk);
                expect(Reflect.get(tokenizer, 'buffer').length).toBeLessThanOrEqual(2);
            }
            for (const character of section === 'comment' ? '-->' : ']]>') tokenizer.write(character);
            tokenizer.write('<Point/></kml>');
            tokenizer.finish();
            expect(names).toEqual(['kml', 'Point']);
            expect(textLength).toBe(section === 'comment' ? 0 : chunk.length * 16);
        });
    }

    it('streams CDATA without decoding entities or interpreting tags', () => {
        const texts: string[] = [];
        const tokenizer = new XmlTokenizer(token => {
            if (token.type === 'text') texts.push(token.value);
        });
        const value = 'a]]b &amp; <coordinates>0,0</coordinates> ]';
        for (const character of `<![CDATA[${value}]]>`) tokenizer.write(character);
        tokenizer.finish();
        expect(texts.join('')).toBe(value);
    });

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
