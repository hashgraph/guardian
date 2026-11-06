import assert from 'node:assert/strict';
import { readFirstCoordinate } from '../dist/helpers/geo-file/first-coordinate-reader.js';
class RecordingScanner {
    coordinate = null;
    settled = false;
    text = '';
    write(text) { this.text += text; }
    finish() { this.settled = true; }
}
describe('readFirstCoordinate', () => {
    it('preserves a UTF-8 character split across one-byte chunks', async () => {
        const scanner = new RecordingScanner();
        const text = 'Минск [27.56,53.90]';
        await readFirstCoordinate(new Blob([new TextEncoder().encode(text)]), scanner, 1);
        assert.equal(scanner.text, text);
    });
    it('rejects a non-positive chunk size', async () => {
        await assert.rejects(readFirstCoordinate(new Blob(['x']), new RecordingScanner(), 0), { message: 'Chunk size must be a positive integer.' });
    });
    it('stops reading after a scanner settles', async () => {
        class EarlyScanner extends RecordingScanner {
            write(text) {
                super.write(text);
                this.coordinate = [1, 2];
                this.settled = true;
            }
        }
        const scanner = new EarlyScanner();
        const result = await readFirstCoordinate(new Blob(['first-second']), scanner, 5);
        assert.deepEqual(result, [1, 2]);
        assert.equal(scanner.text, 'first');
    });
});
