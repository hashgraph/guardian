import * as assert from './assertions';
import { ungzip } from 'pako';

function base64urlDecode(input) {
  // Convert the Base64url encoded input to a standard Base64 format
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (base64.length % 4)) % 4;
  const paddedBase64 = base64 + '='.repeat(padding);

  // Decode the Base64 data and return it as a Buffer
  return Buffer.from(paddedBase64, 'base64');
}

export class Bitstring {
  private readonly bits: Uint8Array;
  private readonly length: number;
  private readonly leftToRightIndexing: boolean;

  constructor({
                length,
                buffer,
                leftToRightIndexing,
                littleEndianBits,
              }: {
    length?: number;
    buffer?: Uint8Array;
    leftToRightIndexing?: boolean;
    littleEndianBits?: boolean;
  } = {}) {
    if (length !== undefined && buffer !== undefined) {
      throw new Error('Only one of "length" or "buffer" must be given.');
    }
    if (length !== undefined) {
      assert.isPositiveInteger(length, 'length');
    } else {
      assert.isUint8Array(buffer!, 'buffer');
    }
    // backwards compatibility for deprecated name `littleEndianBits`
    if (littleEndianBits !== undefined) {
      if (leftToRightIndexing !== undefined) {
        throw new Error(
          'Using both "littleEndianBits" and "leftToRightIndexing" ' +
          'is not allowed.'
        );
      }
      assert.isBoolean(littleEndianBits, 'littleEndianBits');
      leftToRightIndexing = littleEndianBits;
    }
    if (leftToRightIndexing === undefined) {
      leftToRightIndexing = true;
    } else {
      assert.isBoolean(leftToRightIndexing, 'leftToRightIndexing');
    }
    if (length !== undefined) {
      this.bits = new Uint8Array(Math.ceil(length / 8));
      this.length = length;
    } else {
      this.bits = new Uint8Array(buffer!.buffer);
      this.length = buffer!.length * 8;
    }
    this.leftToRightIndexing = leftToRightIndexing;
  }

  public get(position: number): boolean {
    assert.isNumber(position, 'position');
    const { length, leftToRightIndexing } = this;
    const { index, bit } = this.parsePosition(position, length, leftToRightIndexing);
    // tslint:disable-next-line:no-bitwise
    return !!(this.bits[index] & bit);
  }

  public static async decodeBits({ encoded }: { encoded: string }): Promise<Uint8Array> {
    assert.isString(encoded, 'encoded');
    return ungzip(base64urlDecode(encoded));
  }

  private parsePosition(
    position: number,
    length: number,
    leftToRightIndexing: boolean
  ): { index: number; bit: number } {
    assert.isNonNegativeInteger(position, 'position');
    assert.isPositiveInteger(length, 'length');
    assert.isBoolean(leftToRightIndexing, 'leftToRightIndexing');

    if (position >= length) {
      throw new Error(`Position "${position}" is out of range "0-${length - 1}".`);
    }
    const index = Math.floor(position / 8);
    const rem = position % 8;
    const shift = leftToRightIndexing ? 7 - rem : rem;
    // tslint:disable-next-line:no-bitwise
    const bit = 1 << shift;
    return { index, bit };
  }
}
