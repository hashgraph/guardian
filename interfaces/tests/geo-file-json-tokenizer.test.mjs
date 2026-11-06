import assert from 'node:assert/strict';
import { JsonTokenizer, JsonSyntaxError } from '../dist/helpers/geo-file/index.js';

describe('streaming JSON syntax', () => {
    for (const text of ['null', 'true', 'false', '-0', '1.25e-2', '[1,2,{}]', '{"escaped\\\"\\u0061":"a\\n\\t\\b\\f\\r\\/\\\\"}', '0.' + '0'.repeat(2000) + '1e2001']) {
        it(`reads ${text.slice(0, 60)} at every boundary`, () => {
            for (const size of [1, 7, text.length]) {
                const events = []; const tokenizer = new JsonTokenizer(event => events.push(event));
                for (let i = 0; i < text.length; i += size) tokenizer.write(text.slice(i, i + size));
                tokenizer.finish(); assert.ok(events.length);
                if (!text.startsWith('[') && !text.startsWith('{') && !['null', 'true', 'false'].includes(text)) assert.equal(events[0].value, JSON.parse(text));
            }
        });
    }
    for (const text of ['', '{', '[1,]', '{"a":1,}', '{a:1}', '{"a" 1}', '"unterminated', '"\\q"', '"\\u12x4"', 'true false', '1x', '01', '-', '1.', '1e', '1e+', '[}', '"\n"']) {
        it(`rejects ${JSON.stringify(text)} at every boundary`, () => {
            for (const size of [1, 7, Math.max(1, text.length)]) {
                assert.throws(() => {
                    const t = new JsonTokenizer(() => {});
                    for (let i = 0; i < text.length; i += size) t.write(text.slice(i, i + size));
                    t.finish();
                }, JsonSyntaxError);
            }
        });
    }
});
