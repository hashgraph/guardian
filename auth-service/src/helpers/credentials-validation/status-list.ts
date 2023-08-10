import { Bitstring } from './bitstring';

export class StatusList {
  private readonly bitstring: any;
  public length: number;

  constructor({ length, buffer }: { length?: number; buffer?: any } = {}) {
    this.bitstring = new Bitstring({ length, buffer });
    this.length = this.bitstring.length;
  }

  convertToBinaryString(): string {
    let biteString = '';
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < this.bitstring.bits.length; i++) {
      biteString += this.bitstring.bits[i].toString(2).padStart(8, '0');
    }
    return biteString;
  }

  setStatus(index: number, status: boolean): boolean {
    if (typeof status !== 'boolean') {
      throw new TypeError('"status" must be a boolean.');
    }
    return this.bitstring.set(index, status);
  }

  getStatus(index: number): boolean {
    return this.bitstring.get(index);
  }

  async encode(): Promise<Uint8Array> {
    return this.bitstring.encodeBits();
  }

  static async decode({ encodedList }: { encodedList: string }): Promise<StatusList> {
    try {
      const buffer = await Bitstring.decodeBits({ encoded: encodedList });
      return new StatusList({ buffer });
    } catch (e) {
      console.log('e', e);
      if (e instanceof Error) {
        throw e;
      }
      throw new Error(`Could not decode encoded status list; reason: ${e}`);
    }
  }
}
