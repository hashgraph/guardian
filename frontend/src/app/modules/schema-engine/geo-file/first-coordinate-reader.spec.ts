import { CoordinateScanner, readFirstCoordinate } from './first-coordinate-reader';

class RecordingScanner implements CoordinateScanner {
    coordinate: [number, number] | null = null;
    settled = false;
    text = '';
    write(text: string): void { this.text += text; }
    finish(): void { this.settled = true; }
}

describe('readFirstCoordinate', () => {
    it('preserves a UTF-8 character split across one-byte chunks', async () => {
        const scanner = new RecordingScanner();
        const text = 'Минск [27.56,53.90]';

        await readFirstCoordinate(new Blob([new TextEncoder().encode(text)]), scanner, 1);

        expect(scanner.text).toBe(text);
    });

    it('rejects a non-positive chunk size', async () => {
        await expectAsync(
            readFirstCoordinate(new Blob(['x']), new RecordingScanner(), 0)
        ).toBeRejectedWithError('Chunk size must be a positive integer.');
    });

    it('stops reading after a scanner settles', async () => {
        class EarlyScanner extends RecordingScanner {
            override write(text: string): void {
                super.write(text);
                this.coordinate = [1, 2];
                this.settled = true;
            }
        }
        const scanner = new EarlyScanner();

        const result = await readFirstCoordinate(new Blob(['first-second']), scanner, 5);

        expect(result).toEqual([1, 2]);
        expect(scanner.text).toBe('first');
    });
});
