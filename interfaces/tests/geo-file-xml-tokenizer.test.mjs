import assert from 'node:assert/strict';
import { XmlTokenizer } from '../dist/helpers/geo-file/xml-tokenizer.js';
describe('XmlTokenizer', () => {
    for (const section of ['comment', 'cdata']) {
        it(`keeps a long ${section} bounded across chunks`, () => {
            const names = [];
            let textLength = 0;
            const tokenizer = new XmlTokenizer(token => {
                if (token.type === 'start')
                    names.push(token.name);
                if (token.type === 'text')
                    textLength += token.value.length;
            });
            tokenizer.write(section === 'comment' ? '<kml><!--' : '<kml><![CDATA[');
            const chunk = 'a'.repeat(16384);
            for (let index = 0; index < 16; index++) {
                tokenizer.write(chunk);
                assert.ok((Reflect.get(tokenizer, 'buffer').length) <= (2));
            }
            for (const character of section === 'comment' ? '-->' : ']]>')
                tokenizer.write(character);
            tokenizer.write('<Point/></kml>');
            tokenizer.finish();
            assert.deepEqual(names, ['kml', 'Point']);
            assert.equal(textLength, section === 'comment' ? 0 : chunk.length * 16);
        });
    }
    it('streams CDATA without decoding entities or interpreting tags', () => {
        const texts = [];
        const tokenizer = new XmlTokenizer(token => {
            if (token.type === 'text')
                texts.push(token.value);
        });
        const value = 'a]]b &amp; <coordinates>0,0</coordinates> ]';
        for (const character of `<![CDATA[${value}]]>`)
            tokenizer.write(character);
        tokenizer.finish();
        assert.equal(texts.join(''), value);
    });
    it('stops inside the current chunk when the consumer settles', () => {
        let stopped = false;
        const names = [];
        const tokenizer = new XmlTokenizer(token => {
            if (token.type === 'start')
                names.push(token.name);
            if (token.type === 'end' && token.name === 'Placemark')
                stopped = true;
        }, () => stopped);
        const tail = '<Folder/>'.repeat(120000);
        const started = performance.now();
        tokenizer.write('<Placemark><Point><coordinates>1,2</coordinates></Point></Placemark>' + tail);
        assert.equal(stopped, true);
        assert.deepEqual(names, ['Placemark', 'Point', 'coordinates']);
        assert.ok((performance.now() - started) < (5000));
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
        assert.ok((input.length) > (1024 * 1024));
        assert.equal(tokenCount, repeat * 2);
        assert.ok((performance.now() - started) < (5000));
    });
});
